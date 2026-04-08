# 🚀 NexBoard — Real-Time Collaborative Whiteboard

> A production-ready, full-stack collaborative whiteboard application built with the MERN stack, Socket.io, and WebRTC.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  Pages: Landing, Login, Register, Dashboard, Rooms,          │
│         Whiteboard, Profile                                   │
│  State: Zustand (auth, whiteboard)                           │
│  Real-time: Socket.io-client                                 │
│  Video: WebRTC (RTCPeerConnection)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTPS + WSS
┌───────────────────────▼─────────────────────────────────────┐
│                   BACKEND (Express + Node)                   │
│  REST API: /api/auth, /api/rooms, /api/whiteboard,           │
│            /api/users, /api/upload                           │
│  Socket.io: Drawing, Chat, Cursor, WebRTC signaling          │
│  Auth: Passport.js (Google OAuth2 + JWT)                     │
│  Middleware: Helmet, CORS, Rate limiting, Sanitization       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   MongoDB Atlas                              │
│  Collections: users, rooms, whiteboards                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
nexboard/
├── backend/
│   ├── config/
│   │   ├── database.js        # MongoDB Atlas connection
│   │   └── passport.js        # Google OAuth + JWT strategies
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── roomController.js
│   │   └── whiteboardController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect middleware
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   └── Whiteboard.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rooms.js
│   │   ├── whiteboard.js
│   │   ├── users.js
│   │   └── upload.js
│   ├── socket/
│   │   └── index.js           # All Socket.io events
│   ├── utils/
│   │   └── logger.js          # Winston logger
│   ├── uploads/               # Local image storage (dev)
│   ├── logs/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── canvas/
    │   │   │   ├── CanvasBoard.jsx    # Main canvas with smooth drawing
    │   │   │   └── CursorOverlay.jsx  # Live cursor tracking
    │   │   ├── toolbar/
    │   │   │   └── Toolbar.jsx        # All drawing tools
    │   │   ├── chat/
    │   │   │   └── ChatPanel.jsx
    │   │   ├── video/
    │   │   │   └── VideoPanel.jsx     # WebRTC video
    │   │   └── ui/
    │   │       ├── AppLayout.jsx      # Sidebar layout
    │   │       ├── TopBar.jsx
    │   │       ├── RoomCard.jsx
    │   │       ├── CreateRoomModal.jsx
    │   │       ├── ParticipantsPanel.jsx
    │   │       ├── ProtectedRoute.jsx
    │   │       └── PageLoader.jsx
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── AuthCallback.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── RoomsPage.jsx
    │   │   ├── WhiteboardPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   └── NotFoundPage.jsx
    │   ├── store/
    │   │   ├── authStore.js       # Zustand auth store
    │   │   └── whiteboardStore.js # Zustand whiteboard store
    │   ├── services/
    │   │   ├── api.js             # Axios instance
    │   │   └── socket.js          # Socket.io client
    │   ├── App.jsx
    │   ├── index.js
    │   └── index.css
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## ⚡ Socket.io Event Flow

```
CLIENT                                    SERVER
  │                                          │
  │── room:join ─────────────────────────► │
  │◄─ room:users (all current users) ──────  │
  │◄─ whiteboard:init (canvas state) ──────  │
  │◄─ room:user-joined (broadcast) ────────  │
  │                                          │
  │── draw:start ───────────────────────► │
  │   (broadcasts to room) ◄───────────────  │
  │── draw:move (throttled 30fps) ──────► │
  │   (broadcasts to room) ◄───────────────  │
  │── draw:end ─────────────────────────► │
  │   (broadcasts + persists to MongoDB)     │
  │                                          │
  │── cursor:move ──────────────────────► │
  │   (broadcasts cursor position) ◄───────  │
  │                                          │
  │── chat:message ─────────────────────► │
  │   (broadcasts + persists) ◄────────────  │
  │                                          │
  │── draw:undo / draw:redo ────────────► │
  │   (broadcasts + updates MongoDB) ◄─────  │
  │                                          │
  │── webrtc:offer ──────────────────────► │
  │   (relays to target peer) ◄────────────  │
  │── webrtc:answer ─────────────────────► │
  │── webrtc:ice-candidate ─────────────► │
```

---

## 🗄️ MongoDB Schema Design

### User
```
{
  _id, name, email, password (bcrypt), googleId,
  avatar, authProvider (local|google),
  role (user|admin), bio, preferences,
  rooms: [ObjectId], lastLogin, isOnline, socketId,
  timestamps
}
```

### Room
```
{
  _id, roomId (8-char unique), name, description,
  host: ObjectId(User), isPrivate, password,
  maxParticipants, isActive,
  participants: [{ user, role(host|editor|viewer), cursorColor }],
  settings: { allowAnonymous, lockCanvas, allowChat, allowVideo },
  tags, lastActivity, timestamps
}
```

### Whiteboard
```
{
  _id, room: ObjectId(Room),
  elements: [{
    id, type (pencil|line|rectangle|circle|triangle|arrow|text|image|eraser),
    points: [{x,y}], startX, startY, endX, endY,
    color, fillColor, strokeWidth, opacity,
    fontSize, fontFamily, text, imageUrl, author, timestamp
  }],
  background, gridEnabled, chatHistory: [{
    user, userName, userAvatar, message, type, timestamp
  }],
  version, lastSavedAt, timestamps
}
```

---

## 🛠️ Step-by-Step Setup

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB Atlas account (free tier works)
- Google Cloud Console account (for OAuth)

---

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### 2. MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user (Settings → Database Access)
4. Whitelist your IP (Security → Network Access → Allow from anywhere: `0.0.0.0/0`)
5. Get connection string: Clusters → Connect → Connect your application
6. It looks like: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/nexboard`

---

### 3. Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google+ API** and **OAuth 2.0**
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Application type: **Web application**
6. Authorized redirect URIs:
   - Dev: `http://localhost:5000/api/auth/google/callback`
   - Prod: `https://your-backend.com/api/auth/google/callback`
7. Copy Client ID and Client Secret

---

### 4. Configure Environment Variables

**Backend** — copy `.env.example` to `.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_super_secret_min_32_chars
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

**Frontend** — copy `.env.example` to `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### 5. Create uploads folder (backend)

```bash
cd backend
mkdir -p uploads logs
```

---

### 6. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

Open `http://localhost:3000`

---

## 🌐 Deployment

### Backend → Render.com
1. Create new Web Service
2. Connect GitHub repo, set root directory to `backend/`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all `.env` variables in the dashboard

### Frontend → Vercel/Netlify
1. Import repo, set root to `frontend/`
2. Build command: `npm run build`
3. Add env vars:
   - `REACT_APP_API_URL=https://your-backend.render.com/api`
   - `REACT_APP_SOCKET_URL=https://your-backend.render.com`

---

## 🔐 Security Features

- **Helmet.js** — HTTP security headers
- **express-mongo-sanitize** — NoSQL injection prevention
- **express-rate-limit** — 200 req/15min per IP
- **bcryptjs** — Password hashing (12 rounds)
- **JWT** — Stateless auth with 7-day expiry
- **CORS** — Whitelist-only origins
- **Input validation** — express-validator on all routes
- **Socket.io auth** — JWT middleware on every connection

---

## 🎨 Drawing Tools

| Tool | Description |
|------|-------------|
| Select | Move/resize elements |
| Pencil | Smooth freehand (bezier interpolation) |
| Pen | High-smoothing calligraphic pen |
| Eraser | Remove strokes |
| Line | Straight line |
| Arrow | Line with arrowhead |
| Rectangle | Filled/stroked rect |
| Circle | Ellipse/circle |
| Triangle | Triangle shape |
| Text | Click-to-place text |
| Image | Upload or drag-drop |
| Laser | Temporary pointer (fades) |

---

## 📝 License

MIT — Free to use and modify.
