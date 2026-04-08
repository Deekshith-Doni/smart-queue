import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  LogOut, 
  Users, 
  Clock, 
  CheckCircle2, 
  Play, 
  RotateCcw,
  Sun,
  Moon
} from 'lucide-react';
import api from '../services/api.js';
import { socket } from '../services/socket.js';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState({ totalTokensGenerated: 0, tokensServed: 0, averageWaitingTime: 0 });
  const [waiting, setWaiting] = useState([]);
  const [serving, setServing] = useState(null);
  const [timings, setTimings] = useState(null);
  const [allTokens, setAllTokens] = useState([]);
  const [serviceTimes, setServiceTimes] = useState([]);
  const [serviceTypeForDefault, setServiceTypeForDefault] = useState('General');
  const [defaultTimeInput, setDefaultTimeInput] = useState('');
  const [loadingNext, setLoadingNext] = useState(false);
  const [tab, setTab] = useState('overview');
  const [selectedTokenForTime, setSelectedTokenForTime] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [assigningTime, setAssigningTime] = useState(false);
  const [savingDefaultTime, setSavingDefaultTime] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [confirmReset, setConfirmReset] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('sq_theme') || 'light');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [anRes, statusRes, waitingRes, timingsRes, allTokensRes, serviceTimesRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/queue/status'),
        api.get('/admin/waiting'),
        api.get('/admin/timings'),
        api.get('/admin/all-tokens'),
        api.get('/admin/service-times'),
      ]);
      setAnalytics(anRes.data);
      setServing(statusRes.data.currentServingToken);
      setWaiting(waitingRes.data.waiting || []);
      setTimings(timingsRes.data);
      setAllTokens(allTokensRes.data.tokens || []);
      setServiceTimes(serviceTimesRes.data.serviceTimes || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('sq_admin_token');
        navigate('/admin/login');
      }
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sq_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    fetchData();

    // Socket listener for real-time dashboard updates
    socket.on('queueUpdate', (data) => {
      console.log('Admin received update:', data);
      fetchData();
    });

    return () => {
      socket.off('queueUpdate');
    };
  }, []);

  const next = async () => {
    try {
      setNotice({ type: '', message: '' });
      setConfirmReset(false);
      setLoadingNext(true);
      await api.post('/admin/next');
      setNotice({ type: 'success', message: 'Queue advanced.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.error || 'Operation failed' });
    } finally {
      setLoadingNext(false);
    }
  };

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setNotice({ type: 'warning', message: 'Confirm reset?' });
      return;
    }
    try {
      setNotice({ type: '', message: '' });
      await api.post('/admin/reset');
      setConfirmReset(false);
      setNotice({ type: 'success', message: 'System reset.' });
    } catch (err) {
      setNotice({ type: 'error', message: err.response?.data?.error || 'Reset failed' });
    }
  };

  const assignTime = async () => {
    if (!selectedTokenForTime || !timeInput) return;
    try {
      setAssigningTime(true);
      await api.post('/admin/assign-time', {
        tokenNumber: parseInt(selectedTokenForTime, 10),
        assignedServiceTime: parseFloat(timeInput),
      });
      setNotice({ type: 'success', message: 'Time assigned.' });
      setSelectedTokenForTime('');
      setTimeInput('');
      fetchData();
    } catch (err) {
      setNotice({ type: 'error', message: 'Failed to assign time' });
    } finally {
      setAssigningTime(false);
    }
  };

  const saveDefaultTime = async () => {
    try {
      setSavingDefaultTime(true);
      const minutes = defaultTimeInput === '' ? null : parseFloat(defaultTimeInput);
      await api.post('/admin/service-times', { serviceType: serviceTypeForDefault, estimatedMinutes: minutes });
      setNotice({ type: 'success', message: 'Default saved.' });
      setDefaultTimeInput('');
      fetchData();
    } catch (err) {
      setNotice({ type: 'error', message: 'Failed to save' });
    } finally {
      setSavingDefaultTime(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <header className="header">
        <div className="page-brand">
          <LayoutDashboard size={24} style={{ color: 'var(--primary)' }} />
          <h2>Admin Center</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button ghost" onClick={toggleTheme} style={{ padding: '8px', borderRadius: '50%' }}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="button ghost" onClick={() => { localStorage.removeItem('sq_admin_token'); navigate('/'); }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab-btn${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>
          <Users size={14} style={{ marginRight: 6 }} /> Overview
        </button>
        <button className={`tab-btn${tab === 'timings' ? ' active' : ''}`} onClick={() => setTab('timings')}>
          <BarChart3 size={14} style={{ marginRight: 6 }} /> Analytics
        </button>
      </div>

      <AnimatePresence mode="wait">
        {notice.message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`notice ${notice.type}`}
            style={{ marginBottom: 16 }}
          >
            {notice.message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        key={tab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <p className="section-title">Live Controls</p>
              <div className="stats" style={{ marginBottom: 20 }}>
                <div className="stat highlight">
                  <div>Serving Now</div>
                  <strong style={{ fontSize: '2rem' }}>{serving ?? '—'}</strong>
                </div>
                <div className="stat">
                  <div>Waiting</div>
                  <strong>{waiting.length}</strong>
                </div>
                <div className="stat">
                  <div>Total Today</div>
                  <strong>{analytics.totalTokensGenerated}</strong>
                </div>
                <div className="stat">
                  <div>Avg. Wait</div>
                  <strong>{analytics.averageWaitingTime}m</strong>
                </div>
              </div>
              <div className="row">
                <button className="button" onClick={next} disabled={loadingNext} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Play size={16} fill="currentColor" /> {loadingNext ? '...' : 'Next Customer'}
                </button>
                <button className={`button ${confirmReset ? 'danger' : 'ghost'}`} onClick={reset} style={{ flex: confirmReset ? 1 : 0.5 }}>
                  <RotateCcw size={16} /> {confirmReset ? 'Confirm Reset' : 'Reset'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="card">
                <p className="section-title"><Clock size={14} /> Service Times</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select className="select" value={serviceTypeForDefault} onChange={(e) => setServiceTypeForDefault(e.target.value)}>
                    <option>General</option><option>Billing</option><option>Support</option><option>Technical</option>
                  </select>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" className="input" placeholder="Min" value={defaultTimeInput} onChange={(e) => setDefaultTimeInput(e.target.value)} />
                    <button className="button" onClick={saveDefaultTime} disabled={savingDefaultTime}><Settings size={14} /></button>
                  </div>
                </div>
              </div>

              <div className="card">
                <p className="section-title"><Users size={14} /> Waiting List</p>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {waiting.length === 0 ? (
                    <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Empty</p>
                  ) : (
                    <ul className="token-list">
                      {waiting.map(w => (
                        <li key={w.tokenNumber} className="token-item" style={{ padding: '6px 10px', fontSize: '.8rem' }}>
                          <strong>#{w.tokenNumber}</strong>
                          <span className="service-tag">{w.serviceType}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'timings' && timings && (
          <div className="card">
            <p className="section-title">Historical Analytics</p>
            <div className="stats" style={{ marginBottom: 24 }}>
              <div className="stat"><div>Median</div><strong>{timings.timings.medianTime}m</strong></div>
              <div className="stat"><div>Fastest</div><strong>{timings.timings.minTime}m</strong></div>
              <div className="stat"><div>Slowest</div><strong>{timings.timings.maxTime}m</strong></div>
              <div className="stat"><div>Served</div><strong>{timings.timings.totalServed}</strong></div>
            </div>
            
            <p className="section-title" style={{ fontSize: '.8rem' }}>Recent History</p>
            <table className="data-table">
              <thead><tr><th>Token</th><th>Type</th><th>Time</th><th>Success</th></tr></thead>
              <tbody>
                {timings.recentServed.slice(0, 8).map(token => (
                  <tr key={token.tokenNumber}>
                    <td>#{token.tokenNumber}</td>
                    <td>{token.serviceType}</td>
                    <td>{token.duration}m</td>
                    <td><CheckCircle2 size={14} style={{ color: '#10b981' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
