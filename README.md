# StudySync - Virtual Study Room Platform

StudySync is a state-of-the-art, collaborative, virtual study room platform designed to recreate the experience of physical library tables in a digital workspace. Students can sign up, create or join public and private study rooms, set synchronized Pomodoro timers, engage in video/voice calls, chat in real-time, collaborate with a built-in Gemini AI Assistant, and share notes and PDFs securely.

---

## ✨ Features

### 🔐 1. Authentication & Security
- Secure registration and login using JWT (JSON Web Tokens).
- Middleware authorization guards for restricted routes and data control.
- Access control for shared study room resources.

### 👥 2. Real-Time Collaborations & Presence
- Interactive study rooms listing current members.
- Real-time user presence tracking (Online / Offline / In Room) with a grace period for browser refreshes.
- Instant chat and system notification bubbles for timer status changes, member joins, and leaves.

### ⏱️ 3. Shared Pomodoro Timers & Session Tracking
- Coordinated timer countdowns (Study and Break intervals) broadcast to all participants.
- Automated study session tracking mapping active focus minutes and break minutes to MongoDB.
- Automatic recording of completed Pomodoro cycles for all connected users upon timer run down.

### 📊 4. Dashboard Analytics & Insights
- Interactive charts: Custom responsive SVG bar charts detailing weekly focus minutes.
- Dynamic productivity insights summarizing total study hours, sessions completed, active rooms joined, and streak tracking.

### 👑 5. Room Management & Lock Controls
- Role-based authorization: Creator becomes the Owner; can promote other members to Admins.
- Moderation tools: Owners and Admins can kick users from rooms.
- Lock Room: Restrict new users from discovering or joining active sessions.

### 🤖 6. Built-in Gemini AI Assistant
- Integrated doubt-clearing chat assistant.
- Direct prompt shortcuts: Ask Doubt, Summarize Notes, Explain Concept, and Mock Quiz generation.

### 📹 7. WebRTC Audio, Video & Screen Sharing
- Multi-user peer-to-peer audio and video calls.
- High-fidelity screen-sharing capabilities for group presentations.
- Simulated canvas streaming fallback for testing environments lacking camera/mic hardware.

### 📂 8. Secure File Sharing
- Shared materials directory within each room.
- Base64 note sharing and PDF uploads/downloads with robust room permission guards.

---

## 🛠️ Technology Stack
- **Frontend**: React (v19), Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Express, Node.js, Socket.io (v4).
- **Database**: MongoDB (Mongoose).
- **APIs**: Google Gemini Developer API.
- **Protocols**: WebRTC, WebSockets (WebSocket signaling).

---

## 🚀 Installation & Local Setup

### Step 1: Install Dependencies
From the root directory, run:
```bash
npm install
```
This will set up the monorepo workspace dependencies.

### Step 2: Environment Configuration

Create `backend/.env` in the `backend` directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/studysync?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

Create `frontend/.env` in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000
```

### Step 3: Run the Application
Start both the backend server and Vite frontend concurrently from the root directory:
```bash
npm run dev
```
- Frontend will open at `http://localhost:5173`
- Backend will run at `http://localhost:5000`

---

## 🛠 API Endpoints Reference

| Category | Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Auth** | `/api/auth/register` | POST | No | Register a new user |
| **Auth** | `/api/auth/login` | POST | No | User login (returns JWT token) |
| **Auth** | `/api/auth/logout` | POST | Yes | User logout |
| **Rooms** | `/api/rooms` | GET | No | Get all public active rooms |
| **Rooms** | `/api/rooms` | POST | Yes | Create a new study room |
| **Rooms** | `/api/rooms/:roomId` | GET | No | Get room configuration and messages |
| **Rooms** | `/api/rooms/:roomId/join` | POST | Yes | Join a study room |
| **Rooms** | `/api/rooms/:roomId/leave` | POST | Yes | Leave a study room |
| **Rooms** | `/api/rooms/:roomId/promote` | PATCH | Yes | Promote a member to Admin (Owner only) |
| **Rooms** | `/api/rooms/:roomId/kick` | POST | Yes | Kick a member from room (Owner/Admin) |
| **Rooms** | `/api/rooms/:roomId/lock` | PATCH | Yes | Toggle room lock state (Owner/Admin) |
| **Sessions** | `/api/sessions/stats` | GET | Yes | Fetch user total statistics |
| **Sessions** | `/api/sessions/history` | GET | Yes | Fetch recent user sessions |
| **Sessions** | `/api/sessions/room/:roomId` | GET | No | Fetch room stats leaderboard |
| **AI** | `/api/ai/chat` | POST | Yes | Ask Gemini AI assistant |
| **Files** | `/api/files/:roomId/upload` | POST | Yes | Upload and share study material in room |
| **Files** | `/api/files/:roomId` | GET | Yes | List files shared in room |
| **Files** | `/api/files/download/:fileId` | GET | Yes | Download a shared file |

---

## 🚀 Production Deployment Guide

### 1. Database Setup (MongoDB Atlas)
1. Register on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Cluster and configure network access to allow connections from anywhere (`0.0.0.0/0` for Render server).
3. Create a database user and copy the connection string.

### 2. Backend Deployment (Render or Railway)
1. Link your repository. Choose `node.js` web service.
2. Set Build Command: `cd backend && npm install`
3. Set Start Command: `cd backend && npm start`
4. Declare Environment Variables:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: A long random string.
   - `PORT`: `5000` (Render binds automatically).
   - `CORS_ORIGIN`: URL of your deployed frontend (e.g. `https://studysync.vercel.app`).
   - `NODE_ENV`: `production`

### 3. Frontend Deployment (Vercel)
1. Link repository. Set Framework Preset: `Vite`.
2. Set Root Directory: `frontend`
3. Configure environment variable:
   - `VITE_API_URL`: Your deployed backend service URL (e.g. `https://studysync-backend.onrender.com`).
4. Trigger deploy. Vercel will build the frontend assets and serve them.

---

## 🐛 Troubleshooting & Support
- **Peer Connection Failed**: Ensure you are using `https://` for production WebRTC video calls. Browsers require a secure context to access cameras/mics.
- **Port Conflict**: If port 5000 is occupied, free it by finding the process:
  ```bash
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```
