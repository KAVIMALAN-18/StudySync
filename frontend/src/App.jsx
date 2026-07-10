import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Navbar } from './components/Layout/Navbar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { StudyRoom } from './components/Room/StudyRoom';
import { Friends } from './components/Friends/Friends';
import { Profile } from './components/Profile/Profile';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { CommandPalette } from './components/CommandPalette';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="flex min-h-screen bg-[#060913]">
                        <Navbar />
                        <main className="flex-1 min-w-0 overflow-y-auto">
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/room/:roomId" element={<StudyRoom />} />
                            <Route path="/friends" element={<Friends />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/profile/:userId" element={<Profile />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </main>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <Toaster theme="dark" closeButton position="top-right" />
              <CommandPalette />
            </TooltipProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
