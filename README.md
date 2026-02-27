# ChatPulse — Full-Stack PERN Real-Time Chat Application

A production-grade, real-time chat application built with the **PERN stack** (PostgreSQL, Express.js, React, Node.js), featuring Socket.io for live messaging, Tailwind CSS for styling, troll detection with AI-powered responses, and sensitive information warnings.

---

## ✨ Features

### Core Chat Features
- **Real-time messaging** via Socket.io WebSockets
- **Chatrooms (channels)** — public group chats with `#channel` style navigation
- **Direct Messages (DMs)** — private one-on-one conversations
- **File sharing** — images, videos, and documents
- **Typing indicators** — see when others are typing
- **Online presence** — real-time online/offline status
- **Message editing & deletion**
- **Reply to messages** (thread context)
- **Message grouping** — consecutive messages grouped visually

### Security & Moderation
- **Troll detection** — pattern-matching detects harsh language; sends soothing AI-powered responses to offenders privately (using Gemini API or built-in fallback)
- **Sensitive info warnings** — detects OTPs, passwords, card numbers, SSNs in group messages and prompts user confirmation before sending
- **JWT authentication** — secure stateless auth with token expiry

### UI/UX
- **Dark mode** — sleek dark theme built with Tailwind CSS
- **Responsive design** — works on desktop and mobile
- **Toast notifications** — for DM alerts, warnings, and errors
- **Avatar system** — auto-generated color avatars with initials
- **Member panel** — view chatroom members with online status

---

## 🏗️ Project Structure

```
chat-app/
├── backend/
│   ├── config/
│   │   ├── database.js          # PostgreSQL pool connection
│   │   ├── initDb.js            # Schema initialization
│   │   └── schema.sql           # Full database schema
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js      # Register, login, profile
│   │   │   ├── chatroomController.js  # Chatroom CRUD + messages
│   │   │   └── messageController.js   # DMs, conversations, user search
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT auth (HTTP + Socket.io)
│   │   ├── routes/
│   │   │   └── index.js         # All API routes
│   │   ├── socket/
│   │   │   └── socketHandler.js # All WebSocket event handlers
│   │   ├── utils/
│   │   │   ├── trollDetection.js # AI troll detection + soothing responses
│   │   │   └── fileUpload.js    # Multer file upload config
│   │   └── index.js             # Express + Socket.io server entry
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/            # (future: profile modal, etc.)
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.jsx     # Main chat area
│   │   │   │   ├── MessageBubble.jsx  # Individual message component
│   │   │   │   └── MessageInput.jsx   # Text + file input
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.jsx        # Channel/DM list + user footer
│   │   │   └── ui/
│   │   │       └── Avatar.jsx         # Reusable avatar component
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx        # User auth state
│   │   │   ├── SocketContext.jsx      # Socket.io connection
│   │   │   └── ChatContext.jsx        # Messages, rooms, events
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx           # Login/Register
│   │   │   └── ChatPage.jsx           # Main app layout
│   │   ├── App.jsx                    # Routes + providers
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start everything
git clone <repo>
cd chat-app
docker-compose up --build
```

Visit `http://localhost:3000`

---

### Option 2: Manual Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+

#### 1. Database Setup
```bash
psql -U postgres -c "CREATE DATABASE chatapp;"
```

#### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and JWT secret
npm install
npm run dev
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`

---

## ⚙️ Environment Variables

```env
# backend/.env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatapp
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Optional: AI Troll Detection
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🔌 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |
| PATCH | `/api/auth/profile` | Yes | Update profile |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/chatrooms` | Yes | List all chatrooms |
| POST | `/api/chatrooms` | Yes | Create chatroom |
| POST | `/api/chatrooms/:id/join` | Yes | Join chatroom |
| POST | `/api/chatrooms/:id/leave` | Yes | Leave chatroom |
| GET | `/api/chatrooms/:id/messages` | Yes | Get chatroom messages |
| GET | `/api/chatrooms/:id/members` | Yes | Get members |
| GET | `/api/conversations` | Yes | List DM conversations |
| POST | `/api/conversations` | Yes | Start/get DM |
| GET | `/api/conversations/:id/messages` | Yes | Get DM messages |
| GET | `/api/users/search?q=` | Yes | Search users |
| POST | `/api/upload` | Yes | Upload file |

---

## 📡 Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `chatroom:join` | `{ chatroomId }` | Join a chatroom |
| `chatroom:leave` | `{ chatroomId }` | Leave a chatroom |
| `conversation:join` | `{ conversationId }` | Open a DM |
| `message:send` | `{ chatroomId, content, messageType, ... }` | Send group message |
| `message:confirm_send` | Same as above | Confirm sensitive message |
| `dm:send` | `{ conversationId, content, ... }` | Send DM |
| `message:delete` | `{ messageId, chatroomId? }` | Delete message |
| `message:edit` | `{ messageId, content, chatroomId? }` | Edit message |
| `typing:start` | `{ chatroomId? / conversationId? }` | Start typing |
| `typing:stop` | Same | Stop typing |

### Server → Client
| Event | Description |
|-------|-------------|
| `message:new` | New chatroom message |
| `dm:message` | New DM message |
| `dm:notification` | DM received while not in that conversation |
| `message:deleted` | A message was deleted |
| `message:edited` | A message was edited |
| `typing:start / typing:stop` | Typing indicators |
| `user:online / user:offline` | Presence updates |
| `chatroom:members` | Member list on join |
| `message:sensitive_warning` | Sensitive content detected |
| `message:troll_warning` | Soothing troll response |

---

## 🛡️ Moderation System

### Troll Detection
- Pattern-based detection scores each message
- If score ≥ threshold (2 matches), sends a **private soothing message** to the sender
- The message still gets delivered (not overly restrictive)
- If `GEMINI_API_KEY` is set, uses Gemini to craft personalized responses
- Falls back to curated empathetic messages if AI is unavailable

### Sensitive Info Protection
Detects in group messages:
- 6-digit OTPs
- Passwords (`password: xxx`)
- Credit/debit card numbers (Visa, Mastercard patterns)
- Social Security Numbers
- CVV codes, IBANs

When detected: user sees a confirmation dialog. On confirm, message is sent but flagged with ⚠️. On cancel, message is discarded.

---

## 🧱 Database Schema

```
users ──────── chatroom_members ──── chatrooms
  │                                       │
  │              conversations ───────────│
  └── messages ─── (chatroom_id or conversation_id)
                └── reply_to_id (self-reference)
```

Key tables: `users`, `chatrooms`, `chatroom_members`, `conversations`, `conversation_participants`, `messages`, `troll_logs`

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| Backend Framework | Express.js |
| Real-time | Socket.io (WebSocket) |
| Database | PostgreSQL 16 |
| DB Client | node-postgres (pg) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File Upload | Multer |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| HTTP Client | Axios |
| Routing | React Router v6 |
| Notifications | react-hot-toast |
| AI (optional) | Google Gemini API |
| Containerization | Docker + Docker Compose |
