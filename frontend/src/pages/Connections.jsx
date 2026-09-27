import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Skeleton from '../components/Skeleton.jsx';

export const Connections = () => {
  const [activeTab, setActiveTab] = useState('accepted'); // 'accepted', 'received', 'sent'
  const [data, setData] = useState({ accepted: [], pending_received: [], pending_sent: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/connections');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Fetch connections error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleRespond = async (connectionId, action) => {
    try {
      setActionLoading(true);
      await api.put(`/connections/${connectionId}`, { action });
      await fetchConnections();
    } catch (err) {
      alert(err.message || 'Failed to update connection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (connectionId) => {
    if (!window.confirm('Are you sure you want to remove this connection?')) return;
    try {
      setActionLoading(true);
      await api.delete(`/connections/${connectionId}`);
      await fetchConnections();
    } catch (err) {
      alert(err.message || 'Failed to remove connection.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>My Peer Network</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Collaborators you have connected with across your campus
          </p>
        </div>
        <Link to="/discover" className="btn btn-primary btn-sm">+ Find New Peers</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('accepted')}
          style={{
            background: 'none',
            padding: '0.65rem 1.25rem',
            borderBottom: activeTab === 'accepted' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'accepted' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'accepted' ? 700 : 500,
            fontSize: '0.95rem'
          }}
        >
          Connected Peers ({data.accepted.length})
        </button>

        <button
          onClick={() => setActiveTab('received')}
          style={{
            background: 'none',
            padding: '0.65rem 1.25rem',
            borderBottom: activeTab === 'received' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'received' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'received' ? 700 : 500,
            fontSize: '0.95rem'
          }}
        >
          Received Requests ({data.pending_received.length})
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          style={{
            background: 'none',
            padding: '0.65rem 1.25rem',
            borderBottom: activeTab === 'sent' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'sent' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'sent' ? 700 : 500,
            fontSize: '0.95rem'
          }}
        >
          Sent Requests ({data.pending_sent.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton count={4} height="80px" />
      ) : activeTab === 'accepted' ? (
        data.accepted.length > 0 ? (
          <div className="grid-cols-2">
            {data.accepted.map((conn) => (
              <div key={conn.connection_id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img
                  src={conn.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${conn.username}`}
                  alt={conn.full_name}
                  style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <Link to={`/u/${conn.username}`} style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
                    {conn.full_name}
                  </Link>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>@{conn.username}</div>
                  {conn.where_we_met && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                      📍 Met at: {conn.where_we_met}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Link to={`/u/${conn.username}`} className="btn btn-secondary btn-sm">
                    View
                  </Link>
                  <button onClick={() => handleRemove(conn.connection_id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-error)' }} disabled={actionLoading}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="state-container">
            <div className="icon">🤝</div>
            <h3>No Connections Yet</h3>
            <p>Discover students across your university or share your profile link to start connecting.</p>
            <Link to="/discover" className="btn btn-primary btn-sm">Discover Peers</Link>
          </div>
        )
      ) : activeTab === 'received' ? (
        data.pending_received.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.pending_received.map((conn) => (
              <div key={conn.connection_id} className="card flex-between" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img
                    src={conn.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${conn.username}`}
                    alt={conn.full_name}
                    style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <Link to={`/u/${conn.username}`} style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {conn.full_name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>@{conn.username}</div>
                    {conn.where_we_met && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                        Note: "{conn.where_we_met}"
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleRespond(conn.connection_id, 'accept')} className="btn btn-success btn-sm" disabled={actionLoading}>
                    ✓ Accept
                  </button>
                  <button onClick={() => handleRespond(conn.connection_id, 'reject')} className="btn btn-danger btn-sm" disabled={actionLoading}>
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="state-container">
            <div className="icon">📥</div>
            <h3>No Pending Received Requests</h3>
            <p>When peers send you a connection request, they will appear here.</p>
          </div>
        )
      ) : (
        data.pending_sent.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.pending_sent.map((conn) => (
              <div key={conn.connection_id} className="card flex-between" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img
                    src={conn.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${conn.username}`}
                    alt={conn.full_name}
                    style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <Link to={`/u/${conn.username}`} style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {conn.full_name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>@{conn.username}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge badge-warning">⏳ Pending Approval</span>
                  <button onClick={() => handleRemove(conn.connection_id)} className="btn btn-secondary btn-sm" disabled={actionLoading}>
                    Cancel Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="state-container">
            <div className="icon">📤</div>
            <h3>No Pending Sent Requests</h3>
            <p>You haven't sent any pending connection requests.</p>
          </div>
        )
      )}
    </div>
  );
};

export default Connections;
