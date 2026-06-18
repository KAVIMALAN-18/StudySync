# StudySync - Virtual Study Room Platform

A real-time collaborative study platform where students can log in, discover other online students, create/join study rooms, chat in real-time, set synchronized study timers, and invite friends for group study sessions.

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ ([Download](https://nodejs.org))
- **npm** or **yarn**
- **MongoDB Atlas** account ([Sign up](https://www.mongodb.com/cloud/atlas)) or local MongoDB

### Project Structure
```
StudySync/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── context/         # Auth & Socket contexts
│   │   ├── hooks/           # Custom hooks (useAuth, useSocket)
│   │   ├── services/        # API & Socket.io services
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env (local development)
│   └── .env.production
│
├── backend/                  # Express + Node.js server
│   ├── config/              # Database config
│   ├── controllers/         # Route handlers
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API endpoints
│   ├── middleware/          # Auth middleware
│   ├── events/              # Socket.io events
│   ├── utils/               # Utilities (JWT, etc)
│   ├── server.js
│   ├── package.json
│   ├── .env (local development)
│   └── .env.production
│
├── package.json             # Root monorepo config
├── README.md
└── SETUP.md
```

## 📥 Installation

### Step 1: Install Dependencies

**Install all (root):**
```bash
npm install
```

This will set up monorepo tools.

### Step 2: Configure Backend

1. Navigate to backend folder:
```bash
cd backend
```

2. Update `.env` with your MongoDB connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studysync
JWT_SECRET=your_secret_key_here_change_in_production
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Step 3: Backend Dependencies

```bash
cd backend
npm install
```

### Step 4: Frontend Dependencies

```bash
cd frontend
npm install
```

## 🎯 Running the Application

### Option 1: Run Both Servers (Root Directory)
```bash
npm run dev
```
This starts backend (5000) and frontend (5173) in parallel.

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
npm run backend:dev
# Backend: http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run frontend:dev
# Frontend: http://localhost:5173
```

## 🔐 Authentication
- Email/Password registration and login
- JWT tokens in localStorage
- Protected routes
- Token in all API requests

## ✨ Core Features

### ✅ Implemented
- User authentication (JWT)
- Dashboard with online users
- Room creation & discovery
- Real-time chat
- Study timer (Pomodoro)
- Room members list
- Socket.io integration

### 🔄 In Progress
- Friend system
- Timer sync
- User presence

## 🛠 API Endpoints

**Auth:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

**Rooms:**
- `GET /api/rooms`
- `POST /api/rooms`
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/join`
- `POST /api/rooms/:roomId/leave`

**Users:**
- `GET /api/users/online`
- `GET /api/users/profile/:userId`

## 🚀 Deployment

### Frontend Build
```bash
cd frontend
npm run build
# Deploy 'dist' folder to Vercel/Netlify
```

### Backend Deployment
Push to Heroku/Railway/DigitalOcean

## 📝 Environment Variables

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

**Backend** (`backend/.env`):
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

## 🐛 Troubleshooting

**Port in use?**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**MongoDB connection failed?**
- Verify MONGODB_URI in backend/.env
- Check cluster is active in MongoDB Atlas
- Whitelist your IP

---

**Happy Studying! 📚**
