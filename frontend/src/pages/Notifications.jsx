import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import NotificationCard from '../components/NotificationCard.jsx';
import Skeleton from '../components/Skeleton.jsx';

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.success) setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '750px' }}>
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Notifications & Activity Feed</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time updates on connection requests, endorsements, bookings, and support tickets.
          </p>
        </div>

        {notifications.some(n => !n.is_read) && (
          <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm">
            ✓ Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <Skeleton count={5} height="75px" />
      ) : notifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🔔</div>
          <h3>No Notifications Yet</h3>
          <p>You're all caught up! Activity involving your profile and bookings will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
