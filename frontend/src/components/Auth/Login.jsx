import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle, Mail, Lock, Eye, EyeOff, BookOpen, Clock, Users, Zap, Loader } from 'lucide-react';

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  width: Math.random() * 2.5 + 0.5,
  top: Math.random() * 100,
  left: Math.random() * 100,
  delay: Math.random() * 4,
  duration: 2 + Math.random() * 3,
}));

const FEATURES = [
  { icon: Clock, label: 'Shared Pomodoro Timer', desc: 'Stay in sync with your study group', color: '#6366f1' },
  { icon: Users, label: 'Live Collaboration', desc: 'Chat, video, and files in one place', color: '#06b6d4' },
  { icon: Zap, label: 'Gemini AI Assistant', desc: 'Ask doubts and get instant answers', color: '#d946ef' },
];

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── Left Panel ── */}
      <div className="auth-left">
        {/* Stars */}
        <div className="auth-left-stars">
          {STARS.map((s) => (
            <div
              key={s.id}
              className="auth-star"
              style={{
                width: s.width, height: s.width,
                top: `${s.top}%`, left: `${s.left}%`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            />
          ))}
        </div>

        <div className="auth-left-content animate-fade-in">
          <div className="auth-logo-mark">
            <BookOpen size={28} color="white" />
          </div>

          <h1 className="auth-hero-title">StudySync</h1>
          <p className="auth-hero-subtitle">
            The premium collaborative study platform where ambitious students come to focus, learn, and grow together.
          </p>

          <div className="auth-quote">
            "An investment in knowledge pays the best interest." — Benjamin Franklin
          </div>

          <div className="auth-features">
            {FEATURES.map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="auth-feature-item">
                <div className="auth-feature-icon" style={{ background: `${color}22` }}>
                  <Icon size={15} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="auth-right">
        <div className="auth-card animate-slide-up">
          <div className="auth-card-header">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Welcome back
            </div>
            <h2 className="auth-card-title">Sign in to StudySync</h2>
            <p className="auth-card-sub">
              Don't have an account? <Link to="/auth/register">Create one free</Link>
            </p>
          </div>

          {error && (
            <div className="auth-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="auth-label">Email address</label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="auth-label">Password</label>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="btn btn-primary auth-submit"
            >
              {loading ? (
                <>
                  <Loader size={15} style={{ animation: 'spin 0.75s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/auth/register">Create one free →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
