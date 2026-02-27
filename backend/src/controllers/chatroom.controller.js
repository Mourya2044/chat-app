import pool from '../config/database.js';

// GET /api/chatrooms
const getChatrooms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.username as creator_name,
        COUNT(DISTINCT cm.user_id) as member_count
       FROM chatrooms c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN chatroom_members cm ON c.id = cm.chatroom_id
       WHERE c.is_private = false
       GROUP BY c.id, u.username
       ORDER BY c.created_at ASC`
    );
    res.json({ chatrooms: result.rows });
  } catch (error) {
    console.error('Get chatrooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/chatrooms/:id
const getChatroomById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, u.username as creator_name,
        COUNT(DISTINCT cm.user_id) as member_count
       FROM chatrooms c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN chatroom_members cm ON c.id = cm.chatroom_id
       WHERE c.id = $1
       GROUP BY c.id, u.username`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }
    res.json({ chatroom: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/chatrooms
const createChatroom = async (req, res) => {
  try {
    const { name, description, is_private } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await pool.query(
      `INSERT INTO chatrooms (name, description, is_private, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, is_private || false, req.user.id]
    );

    const chatroom = result.rows[0];

    // Creator becomes admin
    await pool.query(
      'INSERT INTO chatroom_members (chatroom_id, user_id, role) VALUES ($1, $2, $3)',
      [chatroom.id, req.user.id, 'admin']
    );

    res.status(201).json({ chatroom });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/chatrooms/:id/join
const joinChatroom = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT 1 FROM chatroom_members WHERE chatroom_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.json({ message: 'Already a member' });
    }

    await pool.query(
      'INSERT INTO chatroom_members (chatroom_id, user_id) VALUES ($1, $2)',
      [id, req.user.id]
    );

    res.json({ message: 'Joined chatroom successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/chatrooms/:id/leave
const leaveChatroom = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM chatroom_members WHERE chatroom_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Left chatroom' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/chatrooms/:id/members
const getChatroomMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.is_online, u.last_seen, cm.role
       FROM chatroom_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.chatroom_id = $1
       ORDER BY cm.role DESC, u.username ASC`,
      [id]
    );
    res.json({ members: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/chatrooms/:id/messages
const getChatroomMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    let query = `
      SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar,
        rm.content as reply_content, ru.username as reply_sender
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE m.chatroom_id = $1 AND m.is_deleted = false`;

    const params = [id];
    if (before) {
      params.push(before);
      query += ` AND m.created_at < $${params.length}`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getChatrooms, getChatroomById, createChatroom,
  joinChatroom, leaveChatroom, getChatroomMembers, getChatroomMessages
};
