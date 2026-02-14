import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

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
    fetchData();
  }, []);

  const next = async () => {
    try {
      setLoadingNext(true);
      const { data } = await api.post('/admin/next');
      setServing(data.currentServingToken);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to move to next token');
    } finally {
      setLoadingNext(false);
    }
  };

  const reset = async () => {
    if (!confirm('Reset the entire queue?')) return;
    try {
      await api.post('/admin/reset');
      setServing(null);
      setWaiting([]);
      setTimings(null);
      setAllTokens([]);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset queue');
    }
  };

  const assignTime = async () => {
    if (!selectedTokenForTime || !timeInput) {
      alert('Please select a token and enter time (in minutes)');
      return;
    }

    try {
      setAssigningTime(true);
      const minutes = parseFloat(timeInput);
      if (isNaN(minutes) || minutes < 0) {
        alert('Please enter a valid positive number for time');
        return;
      }

      await api.post('/admin/assign-time', {
        tokenNumber: parseInt(selectedTokenForTime),
        assignedServiceTime: minutes,
      });

      alert(`Service time set to ${minutes} minute(s) for token #${selectedTokenForTime}`);
      setSelectedTokenForTime('');
      setTimeInput('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign time');
    } finally {
      setAssigningTime(false);
    }
  };

  const saveDefaultTime = async () => {
    try {
      setSavingDefaultTime(true);

      if (defaultTimeInput === '') {
        await api.post('/admin/service-times', { serviceType: serviceTypeForDefault, estimatedMinutes: null });
        alert(`Default time cleared for ${serviceTypeForDefault}`);
        fetchData();
        return;
      }

      const minutes = parseFloat(defaultTimeInput);
      if (isNaN(minutes) || minutes <= 0) {
        alert('Please enter a valid positive number (minutes) or leave empty to clear');
        return;
      }

      await api.post('/admin/service-times', { serviceType: serviceTypeForDefault, estimatedMinutes: minutes });
      alert(`Default time set to ${minutes} minute(s) for ${serviceTypeForDefault}`);
      setDefaultTimeInput('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save default time');
    } finally {
      setSavingDefaultTime(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h2>Admin Dashboard</h2>
        <button className="button" onClick={() => { localStorage.removeItem('sq_admin_token'); navigate('/'); }}>Logout</button>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className="button"
          onClick={() => setTab('overview')}
          style={{ background: tab === 'overview' ? '#0ea5e9' : '#cbd5e1', color: 'white' }}
        >
          Overview
        </button>
        <button
          className="button"
          onClick={() => setTab('timings')}
          style={{ background: tab === 'timings' ? '#0ea5e9' : '#cbd5e1', color: 'white' }}
        >
          Timing Stats
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Overview</h3>
            <div className="stats">
          <div className="stat">
            <div>Total Tokens</div>
            <strong>{analytics.totalTokensGenerated}</strong>
          </div>
          <div className="stat">
            <div>Tokens Served</div>
            <strong>{analytics.tokensServed}</strong>
          </div>
          <div className="stat">
            <div>Avg Wait (min)</div>
            <strong>{analytics.averageWaitingTime}</strong>
          </div>
          <div className="stat">
            <div>Currently Serving</div>
            <strong>{serving ?? '—'}</strong>
          </div>
        </div>
        <div style={{ marginTop: 12 }} className="row">
          <button className="button" onClick={next} disabled={loadingNext}>{loadingNext ? 'Processing…' : 'Move to Next'}</button>
          <button className="button" onClick={reset} style={{ background: '#ef4444' }}>Reset Queue</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Assign Service Time (Optional)</h3>
        <p style={{ fontSize: 14, color: '#666', marginTop: 0 }}>Set expected service duration for any token. If not set, estimated time is calculated automatically.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <select
            className="select"
            value={selectedTokenForTime}
            onChange={(e) => setSelectedTokenForTime(e.target.value)}
          >
            <option value="">Select Token</option>
            {allTokens.map((t) => (
              <option key={t.tokenNumber} value={t.tokenNumber}>
                Token #{t.tokenNumber} ({t.serviceType}) - {t.status}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="input"
            placeholder="Minutes"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            min="0"
            step="0.5"
          />
          <button
            className="button"
            onClick={assignTime}
            disabled={assigningTime}
          >
            {assigningTime ? 'Assigning…' : 'Assign Time'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Default Service Times (Optional)</h3>
        <p style={{ fontSize: 14, color: '#666', marginTop: 0 }}>Set default times per service. Leave empty and save to clear.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <select
            className="select"
            value={serviceTypeForDefault}
            onChange={(e) => setServiceTypeForDefault(e.target.value)}
          >
            <option>General</option>
            <option>Billing</option>
            <option>Support</option>
            <option>Technical</option>
          </select>
          <input
            type="number"
            className="input"
            placeholder="Minutes"
            value={defaultTimeInput}
            onChange={(e) => setDefaultTimeInput(e.target.value)}
            min="0"
            step="0.5"
          />
          <button
            className="button"
            onClick={saveDefaultTime}
            disabled={savingDefaultTime}
          >
            {savingDefaultTime ? 'Saving…' : 'Save Default'}
          </button>
        </div>
        {serviceTimes.length > 0 && (
          <div style={{ fontSize: 14, color: '#444' }}>
            Current defaults: {serviceTimes.map((t) => `${t.serviceType}: ${t.estimatedMinutes} min`).join(' | ')}
          </div>
        )}
      </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Waiting Tokens</h3>
            {waiting.length === 0 ? (
              <p>No tokens waiting.</p>
            ) : (
              <ul>
                {waiting.map((w) => (
                  <li key={w.tokenNumber}>Token #{w.tokenNumber} — {w.serviceType}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {tab === 'timings' && timings && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Timing Statistics</h3>
            <div className="stats">
              <div className="stat">
                <div>Average Time (min)</div>
                <strong>{timings.timings.averageTime}</strong>
              </div>
              <div className="stat">
                <div>Median Time (min)</div>
                <strong>{timings.timings.medianTime}</strong>
              </div>
              <div className="stat">
                <div>Min Time (min)</div>
                <strong>{timings.timings.minTime}</strong>
              </div>
              <div className="stat">
                <div>Max Time (min)</div>
                <strong>{timings.timings.maxTime}</strong>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
              Showing last {timings.timings.totalServed} served tokens
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Recent Served Tokens</h3>
            {timings.recentServed.length === 0 ? (
              <p>No served tokens yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Token #</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Service</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Duration (min)</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Served At</th>
                  </tr>
                </thead>
                <tbody>
                  {timings.recentServed.map((token) => (
                    <tr key={token.tokenNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8 }}>{token.tokenNumber}</td>
                      <td style={{ padding: 8 }}>{token.serviceType}</td>
                      <td style={{ padding: 8 }}>{token.duration}</td>
                      <td style={{ padding: 8, fontSize: 12 }}>{new Date(token.servedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
