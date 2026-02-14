import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await api.post('/admin/login', { username, password });
      localStorage.setItem('sq_admin_token', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <form onSubmit={submit} className="row">
          <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
