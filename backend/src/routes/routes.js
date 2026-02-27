import { Router } from 'express';
import {authenticate} from '../middleware/auth.js';
import authController from '../controllers/auth.controller.js';
import chatroomController from '../controllers/chatroom.controller.js';
import messageController from '../controllers/message.controller.js';
import { upload, uploadFile } from '../utils/fileUpload.js';

const router = Router();
// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getMe);
router.patch('/auth/profile', authenticate, authController.updateProfile);
router.post('/auth/logout', authenticate, authController.logout);

// Chatroom routes
router.get('/chatrooms', authenticate, chatroomController.getChatrooms);
router.post('/chatrooms', authenticate, chatroomController.createChatroom);
router.get('/chatrooms/:id', authenticate, chatroomController.getChatroomById);
router.post('/chatrooms/:id/join', authenticate, chatroomController.joinChatroom);
router.post('/chatrooms/:id/leave', authenticate, chatroomController.leaveChatroom);
router.get('/chatrooms/:id/members', authenticate, chatroomController.getChatroomMembers);
router.get('/chatrooms/:id/messages', authenticate, chatroomController.getChatroomMessages);

// DM / Conversation routes
router.get('/conversations', authenticate, messageController.getConversations);
router.post('/conversations', authenticate, messageController.getOrCreateConversation);
router.get('/conversations/:id/messages', authenticate, messageController.getConversationMessages);

// User search
router.get('/users/search', authenticate, messageController.searchUsers);

// File upload
router.post('/upload', authenticate, upload.single('file'), uploadFile);

export default router;
