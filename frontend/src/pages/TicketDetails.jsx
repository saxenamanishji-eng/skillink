import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const TicketDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/helpdesk/tickets/${id}`);
      if (res.success) setTicket(res.ticket);
    } catch (err) {
      setError(err.message || 'Ticket not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/helpdesk/tickets/${id}/messages`, { message: replyText });
      setReplyText('');
      await fetchTicket();
    } catch (err) {
      alert(err.message || 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="350px" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="page-wrapper">
        <div className="state-container">
          <div className="icon">💬</div>
          <h3>Ticket Not Found</h3>
          <p>{error || 'This support ticket does not exist or access is restricted.'}</p>
          <Link to="/helpdesk" className="btn btn-primary btn-sm">Back to Helpdesk</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '850px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/helpdesk" style={{ fontSize: '0.85rem' }}>← Back to All Tickets</Link>
      </div>

      {/* Ticket Header */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Ticket #{ticket.id} • Category: {ticket.category_name}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatusBadge status={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{ticket.subject}</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Opened by {ticket.full_name} (@{ticket.username}) on {formatDate(ticket.created_at)}
        </div>

        {/* Attachments Section */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
              Attached Files:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ticket.attachments.map((att) => (
                <a
                  key={att.id}
                  href={`/api/helpdesk/attachments/${att.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  📎 {att.file_name} ({(att.file_size / 1024).toFixed(1)} KB)
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conversation Messages Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem' }}>Conversation History</h3>

        {ticket.messages && ticket.messages.map((msg) => {
          const isMe = user && user.id === msg.sender_id;
          const isStaff = msg.sender_role === 'admin';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                flexDirection: isMe ? 'row-reverse' : 'row'
              }}
            >
              <img
                src={msg.sender_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender_username}`}
                alt={msg.sender_name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />

              <div
                style={{
                  maxWidth: '75%',
                  backgroundColor: isMe ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  border: isStaff ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1rem 1.25rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div className="flex-between" style={{ gap: '1rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {msg.sender_name} {isStaff && <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Support Staff</span>}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(msg.created_at)}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--color-text)' }}>
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Form Box */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Post a Reply</h4>
        <form onSubmit={handleReplySubmit}>
          <div className="form-group">
            <textarea
              rows="4"
              placeholder="Type your reply or follow-up question here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
            />
          </div>

          <div className="flex-between">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              * Replying to a closed/resolved ticket will automatically reopen it.
            </span>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketDetails;
