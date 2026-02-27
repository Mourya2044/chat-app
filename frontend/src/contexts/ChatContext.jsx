import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [chatrooms, setChatrooms] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { type: 'chatroom'|'dm', id, data }
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [pendingMessage, setPendingMessage] = useState(null); // For sensitive info confirmation
  const [members, setMembers] = useState([]);

  const typingTimers = useRef({});

  // Load chatrooms
  const loadChatrooms = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/chatrooms');
      setChatrooms(data.chatrooms);
    } catch (err) {
      console.error('Load chatrooms error:', err);
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/conversations');
      setConversations(data.conversations);
    } catch (err) {
      console.error('Load conversations error:', err);
    }
  }, []);

  // Load messages for active chat
  const loadMessages = useCallback(async (chat) => {
    try {
      const url = chat.type === 'chatroom'
        ? `/api/chatrooms/${chat.id}/messages`
        : `/api/conversations/${chat.id}/messages`;
      const { data } = await axios.get(url);
      setMessages(data.messages);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, []);

  // Switch active chat
  const openChat = useCallback(async (chat) => {
    // Leave previous room
    if (activeChat && socket) {
      if (activeChat.type === 'chatroom') {
        socket.emit('chatroom:leave', { chatroomId: activeChat.id });
      }
    }

    setActiveChat(chat);
    setMessages([]);
    setTypingUsers({});

    if (socket) {
      if (chat.type === 'chatroom') {
        socket.emit('chatroom:join', { chatroomId: chat.id });
      } else {
        socket.emit('conversation:join', { conversationId: chat.id });
      }
    }

    await loadMessages(chat);

    // Load members for chatrooms
    if (chat.type === 'chatroom') {
      try {
        const { data } = await axios.get(`/api/chatrooms/${chat.id}/members`);
        setMembers(data.members);
      } catch {}
    }
  }, [activeChat, socket, loadMessages]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // New chatroom message
    socket.on('message:new', (message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    // New DM
    socket.on('dm:message', (message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    // DM notification (message received but not in that chat)
    socket.on('dm:notification', ({ conversationId, senderUsername, preview }) => {
      toast(`💬 ${senderUsername}: ${preview}`, { duration: 3000 });
      loadConversations();
    });

    // Message deleted
    socket.on('message:deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_deleted: true, content: '[Message deleted]' } : m
      ));
    });

    // Message edited
    socket.on('message:edited', ({ messageId, content, updatedAt }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content, is_edited: true, updated_at: updatedAt } : m
      ));
    });

    // Typing
    socket.on('typing:start', ({ userId, username, chatroomId, conversationId }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: username }));
    });

    socket.on('typing:stop', ({ userId }) => {
      setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n; });
    });

    // Online status
    socket.on('user:online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });
    socket.on('user:offline', ({ userId }) => {
      setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    });

    // Chatroom members
    socket.on('chatroom:members', ({ members: newMembers }) => {
      setMembers(newMembers);
    });
    socket.on('chatroom:user_joined', ({ user: newUser }) => {
      setMembers(prev => {
        if (prev.find(m => m.id === newUser.id)) return prev;
        return [...prev, { ...newUser, role: 'member' }];
      });
    });
    socket.on('chatroom:user_left', ({ userId }) => {
      setMembers(prev => prev.filter(m => m.id !== userId));
    });

    // Sensitive info warning
    socket.on('message:sensitive_warning', ({ message, pendingMessage }) => {
      setPendingMessage(pendingMessage);
      toast(message, { duration: 0, icon: '⚠️', id: 'sensitive-warning' });
    });

    // Troll soothing message
    socket.on('message:troll_warning', ({ message }) => {
      toast(message, { duration: 6000, icon: '💙', style: { background: '#1e3a8a', color: '#fff' } });
    });

    return () => {
      socket.off('message:new');
      socket.off('dm:message');
      socket.off('dm:notification');
      socket.off('message:deleted');
      socket.off('message:edited');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('chatroom:members');
      socket.off('chatroom:user_joined');
      socket.off('chatroom:user_left');
      socket.off('message:sensitive_warning');
      socket.off('message:troll_warning');
    };
  }, [socket, loadConversations]);

  // Initialize
  useEffect(() => {
    if (user) {
      loadChatrooms();
      loadConversations();
    }
  }, [user, loadChatrooms, loadConversations]);

  const sendMessage = useCallback((data) => {
    if (!socket) return;
    if (activeChat?.type === 'chatroom') {
      socket.emit('message:send', { ...data, chatroomId: activeChat.id });
    } else if (activeChat?.type === 'dm') {
      socket.emit('dm:send', { ...data, conversationId: activeChat.id });
    }
  }, [socket, activeChat]);

  const confirmSensitiveMessage = useCallback(() => {
    if (!socket || !pendingMessage) return;
    socket.emit('message:confirm_send', pendingMessage);
    setPendingMessage(null);
    toast.dismiss('sensitive-warning');
  }, [socket, pendingMessage]);

  const cancelSensitiveMessage = useCallback(() => {
    setPendingMessage(null);
    toast.dismiss('sensitive-warning');
  }, []);

  const emitTyping = useCallback((isTyping) => {
    if (!socket || !activeChat) return;
    const data = activeChat.type === 'chatroom'
      ? { chatroomId: activeChat.id }
      : { conversationId: activeChat.id };
    socket.emit(isTyping ? 'typing:start' : 'typing:stop', data);
  }, [socket, activeChat]);

  return (
    <ChatContext.Provider value={{
      chatrooms, conversations, activeChat, messages, typingUsers,
      onlineUsers, members, pendingMessage,
      openChat, sendMessage, emitTyping,
      loadChatrooms, loadConversations,
      confirmSensitiveMessage, cancelSensitiveMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be inside ChatProvider');
  return ctx;
};
