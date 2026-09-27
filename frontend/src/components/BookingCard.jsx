import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { formatCurrency, formatDate, formatTime } from '../utils/helpers.js';

export const BookingCard = ({
  booking,
  currentUserId,
  onRespond,
  onCancel,
  onComplete,
  onReview,
  onEndorse
}) => {
  const isCustomer = booking.customer_id === currentUserId;
  const isProvider = booking.provider_id === currentUserId;
  const otherPartyName = isCustomer ? booking.provider_name : booking.customer_name;
  const otherPartyUsername = isCustomer ? booking.provider_username : booking.customer_username;
  const otherPartyAvatar = isCustomer ? booking.provider_avatar : booking.customer_avatar;

  const isTodayOrPast = new Date(booking.booking_date) <= new Date(new Date().toISOString().split('T')[0]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="flex-between">
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Booking #{booking.id}
        </span>
        <StatusBadge status={booking.status} />
      </div>

      <div>
        <h4 style={{ fontSize: '1.1rem' }}>{booking.service_title}</h4>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          📅 {formatDate(booking.booking_date)} • ⏰ {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>
            ({booking.mode.replace('_', ' ')})
          </span>
        </div>
      </div>

      {/* Counterparty summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
        <img
          src={otherPartyAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${otherPartyUsername}`}
          alt={otherPartyName}
          style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <div style={{ fontSize: '0.825rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>{isCustomer ? 'Provider:' : 'Customer:'} </span>
          <Link to={`/u/${otherPartyUsername}`} style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            {otherPartyName}
          </Link>
        </div>
      </div>

      {booking.notes && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', background: 'var(--color-bg)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
          "{booking.notes}"
        </div>
      )}

      {/* Agreed Cash Price Snapshot */}
      <div className="flex-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Agreed Cash Fee:</span>
        <span className="price-tag" style={{ fontSize: '1rem' }}>
          {formatCurrency(booking.price, booking.currency)}
        </span>
      </div>

      {/* Action Buttons based on state machine */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
        {/* Provider pending response */}
        {isProvider && booking.status === 'pending' && onRespond && (
          <>
            <button onClick={() => onRespond(booking.id, 'confirm')} className="btn btn-success btn-sm" style={{ flex: 1 }}>
              ✓ Confirm
            </button>
            <button onClick={() => onRespond(booking.id, 'reject')} className="btn btn-danger btn-sm" style={{ flex: 1 }}>
              ✕ Decline
            </button>
          </>
        )}

        {/* Cancel (either party if pending or confirmed) */}
        {['pending', 'confirmed'].includes(booking.status) && onCancel && (
          <button onClick={() => onCancel(booking.id)} className="btn btn-secondary btn-sm">
            Cancel Booking
          </button>
        )}

        {/* Provider complete booking (only once confirmed and date has arrived) */}
        {isProvider && booking.status === 'confirmed' && isTodayOrPast && onComplete && (
          <button onClick={() => onComplete(booking.id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            ✓ Mark as Completed
          </button>
        )}

        {/* Customer review action (if completed and not yet reviewed) */}
        {isCustomer && booking.status === 'completed' && !booking.review_id && onReview && (
          <button onClick={() => onReview(booking)} className="btn btn-primary btn-sm">
            ⭐ Leave Star Review
          </button>
        )}

        {/* Customer peer endorsement recommendation */}
        {isCustomer && booking.status === 'completed' && onEndorse && (
          <button onClick={() => onEndorse(booking)} className="btn btn-secondary btn-sm">
            🏆 Recognize Skill
          </button>
        )}

        {/* Display existing review if present */}
        {booking.review_id && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', width: '100%' }}>
            ⭐ Reviewed: {booking.review_rating}/5 stars {booking.review_comment ? `— "${booking.review_comment}"` : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
