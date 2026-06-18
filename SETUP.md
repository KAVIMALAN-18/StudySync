# StudySync - Setup Guide

Complete setup instructions for the StudySync virtual study room platform.

## 📋 Prerequisites

- **Node.js** v16+ - [Download](https://nodejs.org)
- **npm** - Comes with Node.js
- **MongoDB Atlas** account - [Sign up](https://www.mongodb.com/cloud/atlas)
- **Git** - [Download](https://git-scm.com)

## 📁 Project Structure

```
StudySync/
├── frontend/                      # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── Layout/
│   │   │   │   └── Navbar.jsx
│   │   │   └── Room/
│   │   │       ├── ChatPanel.jsx
│   │   │       ├── RoomMembers.jsx
│   │   │       ├── StudyRoom.jsx
│   │   │       └── StudyTimer.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useSocket.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── .env (development)
│   └── .env.production
│
├── backend/                       # Express + Node.js server
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── roomController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rooms.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js               # JWT verification
│   ├── events/
│   │   └── socketEvents.js       # Socket.io handlers
│   ├── utils/
│   │   └── jwt.js                # JWT utilities
│   ├── server.js
│   ├── package.json
│   ├── .env (development)
│   └── .env.production
│
├── package.json                   # Root monorepo config
├── README.md
└── SETUP.md
```

## 🔧 Installation Steps

### Step 1: Clone/Download Project
```bash
cd StudySync
```

### Step 2: Install Root Dependencies
```bash
npm install
```

### Step 3: Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 5: Configure Backend Environment

1. Open `backend/.env`:
```bash
nano backend/.env
# or use your editor
```

2. Update with your MongoDB connection string:
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studysync

# JWT Secret Key (Change this in production!)
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration (Frontend URL)
CORS_ORIGIN=http://localhost:5173
```

### Step 6: Configure Frontend Environment (Optional)

The frontend `.env` is pre-configured for local development:

```env
# Frontend API Endpoint
VITE_API_URL=http://localhost:5000

# Socket.io Server URL
VITE_SOCKET_URL=http://localhost:5000
```

For production, update `frontend/.env.production`:
```env
VITE_API_URL=https://your-api-domain.com
VITE_SOCKET_URL=https://your-api-domain.com
```

## ▶️ Running the Application

### Option 1: Run Both Servers Together (Recommended)

From root directory:
```bash
npm run dev
```

This will start:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173

### Option 2: Run Backend Only

```bash
npm run backend:dev
# or
cd backend && npm run dev
```

Backend runs on: `http://localhost:5000`

### Option 3: Run Frontend Only

```bash
npm run frontend:dev
# or
cd frontend && npm run dev
```

Frontend runs on: `http://localhost:5173`

## 🧪 Testing the Setup

1. **Check Backend Health:**
```bash
curl http://localhost:5000/health
# Should return: {"status":"Server is running"}
```

2. **Access Frontend:**
   - Open browser: http://localhost:5173
   - You should see the Login page

3. **Create Test Account:**
   - Click "Register"
   - Fill in username, email, password
   - Click "Create Account"

4. **Login:**
   - Use your test credentials
   - You should see the Dashboard

5. **Test Real-time Features:**
   - Open two browser windows/tabs
   - Login with different accounts
   - You should see each other in "Online Users"
   - Create a room and join it
   - Chat and use the timer

## 🛠 Common Issues & Solutions

### Issue: MongoDB Connection Failed

**Error:** `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
- Verify MongoDB Atlas cluster is running
- Check connection string in `backend/.env`
- Whitelist your IP in MongoDB Atlas Network Access
- Format: `mongodb+srv://user:password@cluster.mongodb.net/dbname`

### Issue: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution (Windows):**
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Solution (Mac/Linux):**
```bash
lsof -i :5000
kill -9 <PID>
```

### Issue: CORS Error

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
- Check `CORS_ORIGIN` in `backend/.env` matches frontend URL
- For development: `http://localhost:5173`
- Restart backend after changing `.env`

### Issue: Socket.io Connection Failed

**Error:** `Failed to connect to WebSocket`

**Solution:**
- Verify backend is running on port 5000
- Check `VITE_SOCKET_URL` in `frontend/.env`
- Clear browser cache
- Check browser console for errors

### Issue: npm install Fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try install again
npm install

# If still fails, delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps After Setup

1. **Create Test Users:**
   - Register multiple accounts
   - Test dashboard functionality

2. **Test Room Features:**
   - Create a study room
   - Join from another user account
   - Test chat and timer

3. **Explore Code:**
   - Review API endpoints in `backend/routes/`
   - Check components in `frontend/src/components/`
   - Understand Socket.io events in `backend/events/`

4. **Development Tips:**
   - Use `npm run backend:dev` to auto-reload on changes
   - Use `npm run frontend:dev` for hot module replacement
   - Check `backend/server.js` for port configuration

## 🚀 Build for Production

### Frontend Build
```bash
cd frontend
npm run build
# Creates 'dist' folder - deploy to Vercel, Netlify, etc.
```

### Backend Deployment
```bash
# Package for deployment
npm --prefix backend build

# Or deploy directly to Heroku/Railway
git push heroku main
```

## 📝 Environment Variables Reference

### Backend Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | - | MongoDB connection string |
| `JWT_SECRET` | - | Secret key for JWT signing |
| `PORT` | 5000 | Server port |
| `CORS_ORIGIN` | http://localhost:5173 | Frontend URL for CORS |
| `NODE_ENV` | development | Environment mode |

### Frontend Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:5000 | Backend API URL |
| `VITE_SOCKET_URL` | http://localhost:5000 | Socket.io server URL |

## 🔐 Security Notes

### Development
- JWT secret is simple for development
- MongoDB credentials are demo credentials
- CORS allows localhost only

### Production
1. **Change JWT Secret:**
   ```env
   JWT_SECRET=<generate_strong_random_string>
   ```

2. **Use MongoDB Atlas:**
   - Create production database
   - Use strong credentials
   - Enable authentication

3. **Enable HTTPS:**
   - Get SSL certificate
   - Update CORS_ORIGIN to HTTPS
   - Update frontend URLs

4. **Environment Variables:**
   - Never commit `.env` to git
   - Use `.env.production` for production
   - Store secrets in deployment platform

## 📞 Need Help?

1. Check troubleshooting section above
2. Review logs in browser console
3. Check backend console output
4. Open issue on GitHub

---

**Happy Studying! 📚**
- CORS

## 🧪 Testing

### Backend API Testing
Use Postman or similar tools to test endpoints at `http://localhost:5000/api/*`

Example: Register new user
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "studystudent",
  "email": "student@example.com",
  "password": "password123"
}
```

### Frontend Testing
1. Open `http://localhost:5173` in your browser
2. Register a new account
3. Navigate dashboard to create or join study rooms
4. Open multiple browser windows to test real-time features

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy the dist/ folder
```

### Backend (Railway/Render/Heroku)
1. Push code to GitHub
2. Connect repository to deployment platform
3. Set environment variables
4. Deploy

Ensure backend URL is updated in frontend `.env`:
```
VITE_API_URL=https://your-backend-url.com
VITE_SOCKET_URL=https://your-backend-url.com
```

## 📝 Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/studysync
JWT_SECRET=your_super_secret_key
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 🐛 Troubleshooting

### Backend fails to start
- Check MongoDB connection string is correct
- Ensure port 5000 is not in use: `lsof -i :5000`
- Check `.env` file exists in backend folder

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check CORS_ORIGIN in backend `.env` matches frontend URL
- Check Socket.io connection settings in `src/services/socket.js`

### Real-time features not working
- Check Socket.io connection is established in browser DevTools
- Verify Socket.io events are being emitted (check browser console)
- Ensure backend Socket.io setup is correct in `server.js`

## 📚 Next Steps

1. **Set up MongoDB Atlas**: Create free cluster at mongodb.com/cloud/atlas
2. **Complete Phase 3-6**: Implement remaining features from plan
3. **Add user testing**: Test with multiple concurrent users
4. **Deploy**: Follow deployment instructions above
5. **Gather feedback**: Iterate based on user feedback

## 📄 License

MIT - Open for educational and commercial use

## 👥 Support

For issues or questions:
1. Check the troubleshooting section
2. Review console errors in browser/terminal
3. Verify all environment variables are set correctly
4. Check MongoDB connection in MongoDB Atlas dashboard

## 🎯 Success Criteria

✅ Users can register and login  
✅ Online users visible on dashboard  
✅ Create and join study rooms  
🔄 Real-time chat in rooms (Socket.io)  
🔄 Study timer syncs across members  
🔄 Friends system with invitations  
🔄 Room members management  
🔄 Real-time presence updates  

---

Built with ❤️ for collaborative learning
