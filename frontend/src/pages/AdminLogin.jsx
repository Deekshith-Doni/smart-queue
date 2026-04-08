import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      setErrorMessage('');
      setLoading(true);
      const { data } = await api.post('/admin/login', { username, password });
      localStorage.setItem('sq_admin_token', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Brand mark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, gap: 10 }}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="24" cy="22" r="3.5" fill="white"/>
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-.02em' }}>Smart Queue</div>
            <div style={{ fontSize: '.8125rem', color: 'var(--muted)', marginTop: 2 }}>Admin Portal</div>
          </div>
        </div>

        <div className="card">
          <p className="section-title" style={{ marginBottom: 18 }}>Sign in</p>
          {errorMessage && <div className="notice error">{errorMessage}</div>}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="button" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
