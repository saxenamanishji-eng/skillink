import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { formatCurrency } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => {
        if (res.success) setAnalytics(res.analytics);
      })
      .catch(err => console.error('Admin analytics error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton count={4} height="150px" />;
  }

  if (!analytics) {
    return <div className="alert alert-error">Unable to load analytics aggregations.</div>;
  }

  const { user_trends, category_breakdown, booking_status, complaint_performance } = analytics;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>DBMS Analytical Aggregations</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Real SQL GROUP BY, HAVING, and Date Aggregations executed on MySQL 8.0 InnoDB engine.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Service Category Breakdown Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Services by Category (GROUP BY)</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Offerings</th>
                  <th>Avg Cash Rate</th>
                </tr>
              </thead>
              <tbody>
                {category_breakdown.map((cat, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{cat.category}</td>
                    <td>{cat.count} listings</td>
                    <td className="price-tag" style={{ fontSize: '0.9rem' }}>
                      {formatCurrency(cat.avg_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Booking Status Distribution Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Booking State Distribution (GROUP BY status)</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>State Machine Status</th>
                  <th>Total Count</th>
                </tr>
              </thead>
              <tbody>
                {booking_status.map((b, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{b.status}</td>
                    <td><strong>{b.count}</strong> sessions</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Growth Aggregation Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Monthly User Registration (DATE_FORMAT Aggregation)</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month (YYYY-MM)</th>
                  <th>New Registrations</th>
                </tr>
              </thead>
              <tbody>
                {user_trends.map((u, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{u.month}</td>
                    <td><strong>{u.count}</strong> accounts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Resolution Performance Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Dispute Resolution Performance (TIMESTAMPDIFF)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Total Logged Disputes:</span>
              <strong>{complaint_performance?.total_complaints || 0}</strong>
            </div>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Resolved Complaints:</span>
              <strong style={{ color: 'var(--color-success)' }}>{complaint_performance?.resolved_complaints || 0}</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Average Resolution Turnaround:</span>
              <strong style={{ color: 'var(--color-primary)' }}>
                {complaint_performance?.avg_resolution_hours ? `${parseFloat(complaint_performance.avg_resolution_hours).toFixed(1)} hours` : 'N/A (Pending)'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
