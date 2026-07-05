import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Home, Users, BookOpen } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="ss-navbar">
      <div className="ss-navbar-inner">
        {/* Brand */}
        <Link to="/dashboard" className="ss-brand">
          <div className="ss-brand-icon">
            <BookOpen size={16} color="white" />
          </div>
          <span className="ss-brand-name">StudySync</span>
        </Link>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Nav Links */}
            <ul className="ss-nav-links">
              <li>
                <Link
                  to="/dashboard"
                  className={`ss-nav-item${isActive('/dashboard') ? ' active' : ''}`}
                >
                  <Home size={15} />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/friends"
                  className={`ss-nav-item${isActive('/friends') ? ' active' : ''}`}
                >
                  <Users size={15} />
                  Friends
                </Link>
              </li>
            </ul>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: 'var(--border-color)' }} />

            {/* User Area */}
            <div className="ss-user-area">
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }} className="ss-nav-item">
                <div className="ss-avatar">
                  {(user.username?.[0] || 'U').toUpperCase()}
                  <span className="ss-avatar-dot" />
                </div>
                <span className="ss-username">{user.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="ss-logout-btn"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
