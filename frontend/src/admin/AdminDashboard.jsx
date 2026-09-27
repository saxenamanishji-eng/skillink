import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => {
        if (res.success) setMetrics(res.metrics);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton count={4} height="120px" />;
  }

  if (error || !metrics) {
    return (
      <div className="alert alert-error">
        Failed to load administrative dashboard: {error}
      </div>
    );
  }

  const { users, bookings, support, top_skills, recent_logs } = metrics;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Administrator Command Center</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Real-time system health, user analytics, support queues, and append-only audit trail.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Registered Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-primary)' }}>
            {users.total_users}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{users.active_users} Active</span> •{' '}
            <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>{users.suspended_users} Suspended</span>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Bookings Volume</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-success)' }}>
            {formatCurrency(bookings.total_volume_inr)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            {bookings.completed_bookings} Completed • {bookings.confirmed_bookings} Confirmed
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active Support Queue</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-warning)' }}>
            {parseInt(support.open_complaints || 0, 10) + parseInt(support.active_tickets || 0, 10) + parseInt(support.pending_reports || 0, 10)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            {support.open_complaints} Complaints • {support.active_tickets} Tickets • {support.pending_reports} Reports
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Admin Accounts</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-secondary)' }}>
            {users.admin_users}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Privileged Staff Members
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Top Skills & Recent Audit Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Top Skills Table */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Top Platform Skills</h3>
            <Link to="/admin/skills" style={{ fontSize: '0.85rem' }}>Manage All →</Link>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Skill Name</th>
                  <th>Users</th>
                  <th>Endorsements</th>
                </tr>
              </thead>
              <tbody>
                {top_skills.map((s, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.user_count}</td>
                    <td>⭐ {s.endorsement_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Recent Audit Log Events</h3>
            <Link to="/admin/audit-logs" style={{ fontSize: '0.85rem' }}>View Full Audit Trail →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recent_logs.map((log) => (
              <div key={log.id} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.825rem' }}>
                <div className="flex-between">
                  <strong>{log.admin_name} (@{log.admin_username})</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatDate(log.created_at)}</span>
                </div>
                <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.15rem' }}>
                  {log.action} on {log.target_type} #{log.target_id || ''}
                </div>
                {log.reason && (
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                    "{log.reason}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
