import React from 'react';
import { formatDate } from '../utils/helpers.js';

export const NotificationCard = ({ notification, onMarkRead }) => {
  const isUnread = !notification.is_read;

  const getIcon = (type) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return '🤝';
      case 'endorsement_received':
        return '⭐';
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_rejected':
      case 'booking_cancelled':
      case 'booking_completed':
        return '🗓️';
      case 'complaint_created':
      case 'complaint_resolved':
        return '⚠️';
      case 'helpdesk_ticket_created':
      case 'helpdesk_reply':
      case 'helpdesk_resolved':
        return '💬';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1rem 1.25rem',
        backgroundColor: isUnread ? 'var(--color-surface)' : 'var(--color-surface-alt)',
        borderLeft: isUnread ? '4px solid var(--color-primary)' : '1px solid var(--color-border)'
      }}
    >
      <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{getIcon(notification.type)}</div>

      <div style={{ flex: 1 }}>
        <div className="flex-between">
          <h4 style={{ fontSize: '0.95rem', fontWeight: isUnread ? 700 : 600 }}>{notification.title}</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formatDate(notification.created_at)}
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
          {notification.message}
        </p>
      </div>

      {isUnread && onMarkRead && (
        <button
          onClick={() => onMarkRead(notification.id)}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          title="Mark as read"
        >
          Mark Read
        </button>
      )}
    </div>
  );
};

export default NotificationCard;
