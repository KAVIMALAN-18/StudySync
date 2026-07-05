import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  AlertCircle, Mail, Lock, Eye, EyeOff, User, BookOpen,
  Clock, Users, Zap, Loader, Globe, MapPin, ChevronRight, ChevronLeft, Check
} from 'lucide-react';

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  width: Math.random() * 2.5 + 0.5,
  top: Math.random() * 100,
  left: Math.random() * 100,
  delay: Math.random() * 4,
  duration: 2 + Math.random() * 3,
}));

const FEATURES = [
  { icon: Clock, label: 'Shared Pomodoro Timer', desc: 'Stay perfectly in sync with your study group', color: '#6366f1' },
  { icon: Users, label: 'Live Collaboration', desc: 'Chat, video, and shared files in one place', color: '#06b6d4' },
  { icon: Zap, label: 'Gemini AI Assistant', desc: 'Ask doubts and get instant explanations', color: '#d946ef' },
];

const AVAILABLE_SUBJECTS = [
  'General Study', 'Java Interview Prep', 'DSA Practice', 'DBMS Revision',
  'Operating Systems', 'Aptitude Practice', 'Web Development', 'Machine Learning',
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English / Literature', 'History'
];

const getPasswordStrength = (pw) => {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 20, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { level: 50, label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { level: 75, label: 'Good', color: '#06b6d4' };
  return { level: 100, label: 'Strong', color: '#10b981' };
};

export const Register = () => {
  const [step, setStep] = useState(1); // 1, 2, 3

  // Step 1 — Account
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 — Location & Name
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  // Step 3 — Subjects
  const [subjects, setSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const pwStrength = getPasswordStrength(password);

  const validateStep1 = () => {
    if (!username.trim() || username.trim().length < 3) return 'Username must be at least 3 characters';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const toggleSubject = (sub) => {
    setSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);
  };

  const addCustomSubject = (e) => {
    e.preventDefault();
    const clean = customSubject.trim();
    if (clean && !subjects.includes(clean)) {
      setSubjects(prev => [...prev, clean]);
    }
    setCustomSubject('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password, {
        fullName,
        country,
        state,
        city,
        subjects,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'Location' },
    { num: 3, label: 'Subjects' },
  ];

  return (
    <div className="auth-shell">
      {/* ── Left Panel ── */}
      <div className="auth-left">
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

          <h1 className="auth-hero-title">Join StudySync</h1>
          <p className="auth-hero-subtitle">
            Create your free account and start studying smarter with your community of focused learners.
          </p>

          <div className="auth-quote">
            "Tell me and I forget. Teach me and I remember. Involve me and I learn." — Benjamin Franklin
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

          {/* Step Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 700,
                  background: step > s.num ? '#10b981' : step === s.num ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                  color: step >= s.num ? 'white' : 'var(--text-muted)',
                  border: step === s.num ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  flexShrink: 0,
                  transition: 'all 0.3s ease'
                }}>
                  {step > s.num ? <Check size={13} /> : s.num}
                </div>
                <span style={{ fontSize: '0.72rem', color: step === s.num ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === s.num ? 600 : 400 }}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '1px', background: step > s.num ? '#10b981' : 'rgba(255,255,255,0.06)' }} />
                )}
              </div>
            ))}
          </div>

          <div className="auth-card-header">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              {step === 1 ? 'Get started free' : step === 2 ? 'Tell us about you' : 'Customize your experience'}
            </div>
            <h2 className="auth-card-title">
              {step === 1 ? 'Create your account' : step === 2 ? 'Your details' : 'Subjects of Interest'}
            </h2>
            {step === 1 && (
              <p className="auth-card-sub">
                Already have an account? <Link to="/auth/login">Sign in</Link>
              </p>
            )}
          </div>

          {error && (
            <div className="auth-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: Account Credentials ── */}
          {step === 1 && (
            <div className="auth-form">
              <div>
                <label htmlFor="reg-username" className="auth-label">Username</label>
                <div className="input-with-icon">
                  <User size={15} className="input-icon" />
                  <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-dark"
                    placeholder="studystudent"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="auth-label">Email address</label>
                <div className="input-with-icon">
                  <Mail size={15} className="input-icon" />
                  <input
                    id="reg-email"
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

              <div>
                <label htmlFor="reg-password" className="auth-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={15} className="input-icon" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-dark"
                    placeholder="Min. 6 characters"
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <div className="pw-strength-bar">
                      <div className="pw-strength-fill" style={{ width: `${pwStrength.level}%`, background: pwStrength.color }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: pwStrength.color, marginTop: '0.25rem', fontWeight: 600 }}>
                      {pwStrength.label}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="reg-confirm" className="auth-label">Confirm password</label>
                <div className="input-with-icon">
                  <Lock size={15} className="input-icon" />
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-dark"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="button" id="register-next-1" onClick={handleNext} className="btn btn-primary auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Name & Location ── */}
          {step === 2 && (
            <div className="auth-form">
              <div>
                <label htmlFor="reg-fullname" className="auth-label">Full Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <div className="input-with-icon">
                  <User size={15} className="input-icon" />
                  <input
                    id="reg-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-dark"
                    placeholder="Kavimalan K"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-country" className="auth-label">Country <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <div className="input-with-icon">
                  <Globe size={15} className="input-icon" />
                  <input
                    id="reg-country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="input-dark"
                    placeholder="India"
                    autoComplete="country-name"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label htmlFor="reg-state" className="auth-label">State / Province</label>
                  <div className="input-with-icon">
                    <MapPin size={15} className="input-icon" />
                    <input
                      id="reg-state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="input-dark"
                      placeholder="Tamil Nadu"
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-city" className="auth-label">City</label>
                  <div className="input-with-icon">
                    <MapPin size={15} className="input-icon" />
                    <input
                      id="reg-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-dark"
                      placeholder="Coimbatore"
                      autoComplete="address-level2"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={handleBack} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="button" id="register-next-2" onClick={handleNext} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 2 }}>
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Subjects ── */}
          {step === 3 && (
            <div className="auth-form">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Select the subjects you want to study. You can change these later. <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(optional)</span>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {AVAILABLE_SUBJECTS.map((sub) => {
                  const active = subjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: active ? 'rgba(129, 140, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid',
                        borderColor: active ? '#818cf8' : 'rgba(255, 255, 255, 0.06)',
                        color: active ? '#c084fc' : 'var(--text-muted)',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                      }}
                    >
                      {active && <Check size={11} />}
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Custom Subject */}
              <form onSubmit={addCustomSubject} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Add your own subject..."
                  className="input-dark"
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                />
                <button type="submit" className="btn btn-ghost" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.06)' }}>
                  + Add
                </button>
              </form>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={handleBack} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  id="register-submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn btn-primary auth-submit"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {loading ? (
                    <><Loader size={15} style={{ animation: 'spin 0.75s linear infinite' }} /> Creating account…</>
                  ) : (
                    <><Check size={15} /> Create Account</>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/auth/login">Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
