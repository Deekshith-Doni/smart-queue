import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

// User page: select service, get token, and see live status via polling
export default function UserPage() {
  const [serviceType, setServiceType] = useState('General');
  const [myToken, setMyToken] = useState(null);
  const [status, setStatus] = useState({ currentServingToken: null, waitingCount: 0, estimatedWaitTime: 0 });
  const [loading, setLoading] = useState(false);

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
    // Initial load
    fetchStatus(myToken?.tokenNumber);
    // Poll every 5 seconds
    const t = setInterval(() => fetchStatus(myToken?.tokenNumber), 5000);
    return () => clearInterval(t);
  }, [myToken?.tokenNumber]);

  const getToken = async () => {
    try {
      setLoading(true);
      const { data } = await api.post('/queue/token', { serviceType });
      setMyToken({ tokenNumber: data.tokenNumber, serviceType: data.serviceType });
      // Immediately refresh status with user's token
      fetchStatus(data.tokenNumber);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h2>Smart Queue</h2>
        {/* Required: visible Admin Login link */}
        <Link to="/admin/login" className="link">Admin Login</Link>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <select className="select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option>General</option>
            <option>Billing</option>
            <option>Support</option>
            <option>Technical</option>
          </select>
          <button className="button" onClick={getToken} disabled={loading}>
            {loading ? 'Generating…' : 'Get Token'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Queue Status</h3>
        <div className="stats">
          <div className="stat">
            <div>Currently Serving</div>
            <strong>{status.currentServingToken ?? '—'}</strong>
          </div>
          <div className="stat">
            <div>Waiting Count</div>
            <strong>{status.waitingCount}</strong>
          </div>
          <div className="stat">
            <div>Est. Wait (min)</div>
            <strong>{status.estimatedWaitTime}</strong>
          </div>
          <div className="stat">
            <div>Your Token</div>
            <strong>{myToken?.tokenNumber ?? '—'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
