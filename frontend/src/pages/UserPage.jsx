import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Ticket, Users, Clock, ArrowRight } from 'lucide-react';
import api from '../services/api.js';
import { socket } from '../services/socket.js';

export default function UserPage() {
  const [serviceType, setServiceType] = useState('General');
  const [theme, setTheme] = useState(() => localStorage.getItem('sq_theme') || 'light');
  const [myToken, setMyToken] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sq_user_token') || 'null');
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState({ 
    currentServingToken: null, 
    waitingCount: 0, 
    estimatedWaitTime: 0, 
    userTokenEstimatedWaitTime: null, 
    userTokenPosition: null 
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const fetchStatus = async (tokenNumber) => {
    try {
      const params = tokenNumber ? { params: { tokenNumber } } : undefined;
      const { data } = await api.get('/queue/status', params);
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status', err);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sq_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    fetchStatus(myToken?.tokenNumber);

    // Listen for real-time updates instead of polling
    socket.on('queueUpdate', (data) => {
      console.log('Real-time update received:', data);
      fetchStatus(myToken?.tokenNumber);
    });

    return () => {
      socket.off('queueUpdate');
    };
  }, [myToken?.tokenNumber]);

  useEffect(() => {
    if (myToken) {
      localStorage.setItem('sq_user_token', JSON.stringify(myToken));
    } else {
      localStorage.removeItem('sq_user_token');
    }
  }, [myToken]);

  const getToken = async () => {
    try {
      setNotice({ type: '', message: '' });
      setLoading(true);
      const { data } = await api.post('/queue/token', { serviceType });
      const newToken = { tokenNumber: data.tokenNumber, serviceType: data.serviceType };
      setMyToken(newToken);
      fetchStatus(data.tokenNumber);
      setNotice({ type: 'success', message: `Token #${data.tokenNumber} generated successfully.` });
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.error || 'Failed to generate token' });
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    setMyToken(null);
    setNotice({ type: 'success', message: 'Token history cleared.' });
  };

  const waitTime = myToken && status.userTokenEstimatedWaitTime !== null
    ? status.userTokenEstimatedWaitTime
    : status.estimatedWaitTime;

  return (
    <div className="container">
      <header className="header">
        <div className="page-brand">
          <motion.div initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ duration: 0.5 }}>
            <Ticket className="text-primary" size={28} style={{ color: 'var(--primary)' }} />
          </motion.div>
          <h2>Smart Queue</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="button ghost" onClick={toggleTheme} style={{ padding: '8px', borderRadius: '50%' }}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link to="/admin/login" className="link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Admin <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card" 
        style={{ marginBottom: 12 }}
      >
        <p className="section-title">New Token</p>
        <AnimatePresence>
          {notice.message && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`notice ${notice.type}`}
            >
              {notice.message}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <select className="select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option>General</option>
            <option>Billing</option>
            <option>Support</option>
            <option>Technical</option>
          </select>
          <button className="button" onClick={getToken} disabled={loading}>
            {loading ? '...' : 'Get Token'}
          </button>
        </div>

        {myToken && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontSize: '.8125rem', color: 'var(--muted)' }}>My active ticket:</span>
            <span className="token-badge">#{myToken.tokenNumber}</span>
            <button className="button ghost" onClick={clearToken} style={{ padding: '2px 8px', fontSize: '.7rem' }}>Clear</button>
          </motion.div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <p className="section-title">Queue Status <span className="live-indicator">LIVE</span></p>
        <div className="stats">
          <div className="stat">
            <div><Users size={12} style={{ marginBottom: 4 }} /> Currently Serving</div>
            <strong>{status.currentServingToken ?? '—'}</strong>
          </div>
          <div className="stat">
            <div><Users size={12} style={{ marginBottom: 4 }} /> In Line</div>
            <strong>{status.waitingCount}</strong>
          </div>
          <div className="stat">
            <div><Clock size={12} style={{ marginBottom: 4 }} /> Est. Delay</div>
            <strong>{waitTime} min</strong>
          </div>
          <div className="stat highlight">
            <div>Your Position</div>
            <strong>{status.userTokenPosition !== null ? (status.userTokenPosition === 0 ? 'NOW' : `#${status.userTokenPosition}`) : '--'}</strong>
          </div>
        </div>

        {myToken && status.userTokenPosition !== null && (
          <motion.div 
            animate={{ scale: [1, 1.02, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ 
              marginTop: 16, 
              padding: '12px', 
              background: 'var(--primary)', 
              color: 'white', 
              borderRadius: '8px', 
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '.9rem'
            }}
          >
            {status.userTokenPosition === 0 
              ? "It's your turn! Please proceed to the counter." 
              : `You are currently #${status.userTokenPosition} in the queue.`}
          </motion.div>
        )}
      </motion.div>
      
      <style>{`
        .live-indicator {
          background: #ef4444; color: white; border-radius: 4px; padding: 2px 6px; 
          font-size: 0.6rem; font-weight: 800; vertical-align: middle; margin-left: 8px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .stat.highlight { border-color: var(--primary); background: rgba(99, 102, 241, 0.05); }
      `}</style>
    </div>
  );
}
