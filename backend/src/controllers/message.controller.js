import pool from '../config/database.js';

// GET /api/conversations - get user's DM conversations
const getConversations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (c.id)
        c.id, c.created_at,
        u.id as partner_id, u.username as partner_username,
        u.avatar_url as partner_avatar, u.is_online as partner_online,
        m.content as last_message, m.message_type as last_message_type,
        m.created_at as last_message_at, m.sender_id as last_sender_id
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
       JOIN users u ON cp2.user_id = u.id
       LEFT JOIN messages m ON c.id = m.conversation_id AND m.is_deleted = false
       WHERE cp.user_id = $1
       ORDER BY c.id, m.created_at DESC NULLS LAST`,
      [req.user.id]
    );

    // Deduplicate and keep latest message per conversation
    const convoMap = {};
    for (const row of result.rows) {
      if (!convoMap[row.id] || (row.last_message_at && row.last_message_at > convoMap[row.id].last_message_at)) {
        convoMap[row.id] = row;
      }
    }

    const conversations = Object.values(convoMap).sort((a, b) => {
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/conversations - start or get DM with user
const getOrCreateConversation = async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) return res.status(400).json({ error: 'Partner ID required' });
    if (partnerId === req.user.id) return res.status(400).json({ error: 'Cannot DM yourself' });

    // Check if conversation already exists
    const existing = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2`,
      [req.user.id, partnerId]
    );

    if (existing.rows[0]) {
      return res.json({ conversation: existing.rows[0] });
    }

    // Create new conversation
    const convoResult = await pool.query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
    const convId = convoResult.rows[0].id;

    await pool.query(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [convId, req.user.id, partnerId]
    );

    res.status(201).json({ conversation: { id: convId } });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/conversations/:id/messages
const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify user is a participant
    const check = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!check.rows[0]) return res.status(403).json({ error: 'Access denied' });

    let query = `
      SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.is_deleted = false`;

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
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/search
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const result = await pool.query(
      `SELECT id, username, avatar_url, is_online
       FROM users WHERE username ILIKE $1 AND id != $2
       LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getConversations, getOrCreateConversation, getConversationMessages, searchUsers };
