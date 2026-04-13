import pool from '../config/database.js';
import { analyzeMessage } from '../utils/trollDetection.js';

const connectedUsers = new Map(); // userId -> Set<socketId>
const socketRooms = new Map();    // socketId -> Set<roomName>

const sanitizeContent = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 5000);
};

const setupSocket = (io) => {
  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`[SOCKET] ${user.username} connected [${socket.id}]`);

    // ─── REGISTER USER ───────────────────────────────────────
    if (!connectedUsers.has(user.id)) {
      connectedUsers.set(user.id, new Set());
    }
    connectedUsers.get(user.id).add(socket.id);
    socketRooms.set(socket.id, new Set());

    try {
      await pool.query(
        'UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1',
        [user.id]
      );
    } catch (err) {
      console.error('[SOCKET] Failed to update online status:', err.message);
    }

    socket.broadcast.emit('user:online', { userId: user.id, username: user.username });

    // ─── JOIN CHATROOM ───────────────────────────────────────
    socket.on('chatroom:join', async ({ chatroomId }) => {
      try {
        await pool.query(
          `INSERT INTO chatroom_members (chatroom_id, user_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [chatroomId, user.id]
        );

        socket.join(`room:${chatroomId}`);
        socketRooms.get(socket.id)?.add(`room:${chatroomId}`);

        socket.to(`room:${chatroomId}`).emit('chatroom:user_joined', {
          chatroomId,
          user: { id: user.id, username: user.username, avatar_url: user.avatar_url },
        });

        const members = await pool.query(
          `SELECT u.id, u.username, u.avatar_url, u.is_online
           FROM chatroom_members cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.chatroom_id = $1`,
          [chatroomId]
        );

        socket.emit('chatroom:members', { chatroomId, members: members.rows });
      } catch (err) {
        console.error('[SOCKET] chatroom:join error:', err.message);
        socket.emit('error', { message: 'Failed to join chatroom' });
      }
    });

    // ─── LEAVE CHATROOM ──────────────────────────────────────
    socket.on('chatroom:leave', ({ chatroomId }) => {
      socket.leave(`room:${chatroomId}`);
      socketRooms.get(socket.id)?.delete(`room:${chatroomId}`);
      socket.to(`room:${chatroomId}`).emit('chatroom:user_left', {
        chatroomId,
        userId: user.id,
      });
    });

    // ─── JOIN DM CONVERSATION ────────────────────────────────
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        const check = await pool.query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, user.id]
        );
        if (!check.rows[0]) return;

        socket.join(`dm:${conversationId}`);
        socketRooms.get(socket.id)?.add(`dm:${conversationId}`);
      } catch (err) {
        console.error('[SOCKET] conversation:join error:', err.message);
      }
    });

    // ─── SEND CHATROOM MESSAGE ───────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const {
          chatroomId, content,
          messageType = 'text',
          fileUrl, fileName, fileSize, replyToId,
        } = data;

        const safeContent = sanitizeContent(content);

        if (!chatroomId) {
          return socket.emit('error', { message: 'Chatroom ID required' });
        }

        if (messageType === 'text' && !safeContent) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        // Verify membership
        const memberCheck = await pool.query(
          'SELECT 1 FROM chatroom_members WHERE chatroom_id = $1 AND user_id = $2',
          [chatroomId, user.id]
        );
        if (!memberCheck.rows[0]) {
          return socket.emit('error', { message: 'You are not a member of this chatroom' });
        }

        // ── Analyze text messages only ───────────────────────
        let analysis = null;
        if (safeContent && messageType === 'text') {

          try {
            analysis = await analyzeMessage(safeContent, user.username);
          } catch (err) {
            console.error('[AI] analyzeMessage failed:', err.message);

            analysis = {
              isSensitive: false,
              isTroll: false,
              severity: 'low',
              warningMessage: null,
            };
          }

          console.log(`[ANALYSIS] sensitive=${analysis.isSensitive} troll=${analysis.isTroll} severity=${analysis.severity}`);

          if (analysis.isSensitive) {
            socket.emit('message:sensitive_warning', {
              message: '⚠️ This message may contain sensitive information. Are you sure you want to send it?',
              pendingMessage: {
                ...data,
                content: safeContent,
              },
            });
            return;
          }
        }

        // ── Save message ─────────────────────────────────────
        const result = await pool.query(
          `INSERT INTO messages
             (content, message_type, file_url, file_name, file_size, sender_id, chatroom_id, reply_to_id, troll_flag)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            safeContent || null, messageType,
            fileUrl || null, fileName || null, fileSize || null,
            user.id, chatroomId, replyToId || null,
            Boolean(analysis?.isTroll),
          ]
        );

        const message = result.rows[0];

        if (analysis?.isTroll) {
          socket.emit('message:troll_warning', {
            message: analysis.warningMessage || 'Please keep the conversation respectful.',
            severity: analysis.severity,
            type: 'ai-warning',
          });

          pool.query(
            `INSERT INTO troll_logs (message_id, user_id, chatroom_id, detection_reason, ai_response)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              message.id,
              user.id,
              chatroomId,
              `AI-${analysis.severity}`,
              analysis.warningMessage,
            ]
          ).catch((err) => console.error('[TROLL LOG] Failed:', err.message));
        }

        // Fetch reply context if needed
        let replyData = null;
        if (replyToId) {
          try {
            const replyResult = await pool.query(
              `SELECT m.content, u.username as sender_username
               FROM messages m
               LEFT JOIN users u ON m.sender_id = u.id
               WHERE m.id = $1`,
              [replyToId]
            );
            replyData = replyResult.rows[0] || null;
          } catch (err) {
            console.error('[SOCKET] Failed to fetch reply context:', err.message);
          }
        }

        const messagePayload = {
          ...message,
          sender_username: user.username,
          sender_avatar: user.avatar_url,
          reply_content: replyData?.content || null,
          reply_sender: replyData?.sender_username || null,
        };

        io.to(`room:${chatroomId}`).emit('message:new', messagePayload);

      } catch (err) {
        console.error('[SOCKET] message:send error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── CONFIRM SENSITIVE MESSAGE ───────────────────────────
    socket.on('message:confirm_send', async (data) => {
      try {
        const {
          chatroomId, content,
          messageType = 'text',
          fileUrl, fileName, fileSize, replyToId,
        } = data;

        const safeContent = sanitizeContent(content);
        if (!chatroomId) {
          return socket.emit('error', { message: 'Chatroom ID required' });
        }

        const memberCheck = await pool.query(
          'SELECT 1 FROM chatroom_members WHERE chatroom_id = $1 AND user_id = $2',
          [chatroomId, user.id]
        );
        if (!memberCheck.rows[0]) {
          return socket.emit('error', { message: 'You are not a member of this chatroom' });
        }

        const result = await pool.query(
          `INSERT INTO messages
             (content, message_type, file_url, file_name, file_size, sender_id, chatroom_id, reply_to_id, flagged_sensitive)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
           RETURNING *`,
          [
            safeContent || null, messageType,
            fileUrl || null, fileName || null, fileSize || null,
            user.id, chatroomId, replyToId || null,
          ]
        );

        io.to(`room:${chatroomId}`).emit('message:new', {
          ...result.rows[0],
          sender_username: user.username,
          sender_avatar: user.avatar_url,
        });
      } catch (err) {
        console.error('[SOCKET] message:confirm_send error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── SEND DIRECT MESSAGE ─────────────────────────────────
    socket.on('dm:send', async (data) => {
      try {
        const {
          conversationId, content,
          messageType = 'text',
          fileUrl, fileName, fileSize,
        } = data;

        const safeContent = sanitizeContent(content);

        const check = await pool.query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, user.id]
        );
        if (!check.rows[0]) {
          return socket.emit('error', { message: 'Access denied' });
        }

        if (messageType === 'text' && !safeContent) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        const result = await pool.query(
          `INSERT INTO messages
             (content, message_type, file_url, file_name, file_size, sender_id, conversation_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            safeContent || null, messageType,
            fileUrl || null, fileName || null, fileSize || null,
            user.id, conversationId,
          ]
        );

        const messagePayload = {
          ...result.rows[0],
          sender_username: user.username,
          sender_avatar: user.avatar_url,
        };

        io.to(`dm:${conversationId}`).emit('dm:message', messagePayload);

        // Notify partner if they're online but not in this DM room
        const partnerResult = await pool.query(
          `SELECT user_id FROM conversation_participants
           WHERE conversation_id = $1 AND user_id != $2`,
          [conversationId, user.id]
        );

        if (partnerResult.rows[0]) {
          const partnerId = partnerResult.rows[0].user_id;
          const partnerSockets = connectedUsers.get(partnerId);
          if (partnerSockets) {
            partnerSockets.forEach(sid => {
              io.to(sid).emit('dm:notification', {
                conversationId,
                senderId: user.id,
                senderUsername: user.username,
                preview: safeContent ? safeContent.substring(0, 50) : '📎 File',
              });
            });
          }
        }
      } catch (err) {
        console.error('[SOCKET] dm:send error:', err.message);
        socket.emit('error', { message: 'Failed to send DM' });
      }
    });

    // ─── TYPING INDICATORS ───────────────────────────────────
    socket.on('typing:start', ({ chatroomId, conversationId }) => {
      const room = chatroomId ? `room:${chatroomId}` : `dm:${conversationId}`;
      socket.to(room).emit('typing:start', {
        userId: user.id,
        username: user.username,
        chatroomId,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ chatroomId, conversationId }) => {
      const room = chatroomId ? `room:${chatroomId}` : `dm:${conversationId}`;
      socket.to(room).emit('typing:stop', {
        userId: user.id,
        chatroomId,
        conversationId,
      });
    });

    // ─── REACTIONS ───────────────────────────────────────────
    socket.on('message:react', ({ messageId, emoji, chatroomId, conversationId }) => {
      const room = chatroomId ? `room:${chatroomId}` : `dm:${conversationId}`;
      io.to(room).emit('message:reaction', {
        messageId,
        emoji,
        userId: user.id,
        username: user.username,
      });
    });

    // ─── DELETE MESSAGE ──────────────────────────────────────
    socket.on('message:delete', async ({ messageId, chatroomId, conversationId }) => {
      try {
        const result = await pool.query(
          `UPDATE messages
           SET is_deleted = true, content = '[Message deleted]', updated_at = NOW()
           WHERE id = $1 AND sender_id = $2
           RETURNING *`,
          [messageId, user.id]
        );
        if (!result.rows[0]) return;

        const room = chatroomId ? `room:${chatroomId}` : `dm:${conversationId}`;
        io.to(room).emit('message:deleted', { messageId, chatroomId, conversationId });
      } catch (err) {
        console.error('[SOCKET] message:delete error:', err.message);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // ─── EDIT MESSAGE ────────────────────────────────────────
    socket.on('message:edit', async ({ messageId, content, chatroomId, conversationId }) => {
      try {
        if (!content?.trim()) return;

        const result = await pool.query(
          `UPDATE messages
           SET content = $1, is_edited = true, updated_at = NOW()
           WHERE id = $2 AND sender_id = $3 AND message_type = 'text'
           RETURNING *`,
          [content.trim(), messageId, user.id]
        );
        if (!result.rows[0]) return;

        const room = chatroomId ? `room:${chatroomId}` : `dm:${conversationId}`;
        io.to(room).emit('message:edited', {
          messageId,
          content: content.trim(),
          chatroomId,
          conversationId,
          updatedAt: result.rows[0].updated_at,
        });
      } catch (err) {
        console.error('[SOCKET] message:edit error:', err.message);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // ─── DISCONNECT ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userSockets = connectedUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(user.id);
          try {
            await pool.query(
              'UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1',
              [user.id]
            );
          } catch (err) {
            console.error('[SOCKET] Failed to update offline status:', err.message);
          }
          socket.broadcast.emit('user:offline', { userId: user.id });
        }
      }
      socketRooms.delete(socket.id);
      console.log(`[SOCKET] ${user.username} disconnected [${socket.id}]`);
    });
  });
};

export default setupSocket;