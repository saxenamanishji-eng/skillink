import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatCurrency, formatDate, formatTime } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/bookings')
      .then(res => {
        if (res.success) setBookings(res.bookings || []);
      })
      .catch(err => console.error('Admin bookings fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Platform Bookings Ledger</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Complete record of all peer sessions, time slots, snapshot prices, and execution states.
        </p>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : bookings.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Service</th>
                <th>Customer</th>
                <th>Provider</th>
                <th>Date & Time Slot</th>
                <th>Snapshot Fee</th>
                <th>Status</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 700 }}>#{b.id}</td>
                  <td style={{ fontWeight: 600 }}>{b.service_title}</td>
                  <td>
                    <div>{b.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{b.customer_username}</div>
                  </td>
                  <td>
                    <div>{b.provider_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{b.provider_username}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    📅 {formatDate(b.booking_date)}<br />
                    ⏰ {formatTime(b.start_time)} - {formatTime(b.end_time)}
                  </td>
                  <td className="price-tag" style={{ fontSize: '0.95rem' }}>
                    {formatCurrency(b.price, b.currency)}
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🗓️</div>
          <h3>No Bookings Recorded</h3>
          <p>No bookings have been scheduled on the platform yet.</p>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
