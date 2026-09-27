import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import BookingCard from '../components/BookingCard.jsx';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';

export const Bookings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'as_customer', 'as_provider'
  const [statusFilter, setStatusFilter] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Endorse Modal State
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [endorseRating, setEndorseRating] = useState(10);
  const [endorseMessage, setEndorseMessage] = useState('');
  const [endorseLoading, setEndorseLoading] = useState(false);
  const [endorseError, setEndorseError] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let endpoint = `/bookings?role=${activeTab}`;
      if (statusFilter) endpoint += `&status=${statusFilter}`;

      const res = await api.get(endpoint);
      if (res.success) setBookings(res.bookings || []);
    } catch (err) {
      console.error('Fetch bookings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchBookings();
  }, [user, activeTab, statusFilter]);

  const handleRespond = async (bookingId, action) => {
    try {
      await api.put(`/bookings/${bookingId}/respond`, { action });
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Failed to respond to booking.');
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking session?')) return;
    try {
      await api.put(`/bookings/${bookingId}/cancel`, {});
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    }
  };

  const handleComplete = async (bookingId) => {
    if (!window.confirm('Confirm that this service session has been delivered and payment was received in cash?')) return;
    try {
      await api.put(`/bookings/${bookingId}/complete`, {});
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Failed to complete booking.');
    }
  };

  const handleOpenReview = (booking) => {
    setSelectedBooking(booking);
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewLoading(true);

    try {
      await api.post('/reviews', {
        booking_id: selectedBooking.id,
        rating: reviewRating,
        comment: reviewComment
      });
      setReviewModalOpen(false);
      await fetchBookings();
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleOpenEndorse = (booking) => {
    setSelectedBooking(booking);
    setEndorseRating(10);
    setEndorseMessage('');
    setEndorseError('');
    setEndorseModalOpen(true);
  };

  const handleSubmitEndorsement = async (e) => {
    e.preventDefault();
    setEndorseError('');
    setEndorseLoading(true);

    try {
      // Fetch the service's skill ID
      const svcRes = await api.get(`/services/${selectedBooking.service_id}`);
      if (svcRes.success && svcRes.service) {
        await api.post('/endorsements', {
          to_user_id: selectedBooking.provider_id,
          skill_id: svcRes.service.skill_id,
          rating: endorseRating,
          message: endorseMessage
        });
        setEndorseModalOpen(false);
        alert('Skill recognition endorsement submitted!');
      }
    } catch (err) {
      setEndorseError(err.message || 'Failed to submit skill endorsement.');
    } finally {
      setEndorseLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Bookings & Service Sessions</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Track requested sessions, confirm appointments, and complete reviews.
        </p>
      </div>

      {/* Filter and Tab Controls */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setActiveTab('as_customer')}
            className={`btn btn-sm ${activeTab === 'as_customer' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Sessions I Booked
          </button>
          <button
            onClick={() => setActiveTab('as_provider')}
            className={`btn btn-sm ${activeTab === 'as_provider' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Sessions Booked with Me
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Bookings Grid */}
      {loading ? (
        <div className="grid-cols-2">
          <Skeleton count={4} height="200px" />
        </div>
      ) : bookings.length > 0 ? (
        <div className="grid-cols-2">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              currentUserId={user.id}
              onRespond={handleRespond}
              onCancel={handleCancel}
              onComplete={handleComplete}
              onReview={handleOpenReview}
              onEndorse={handleOpenEndorse}
            />
          ))}
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🗓️</div>
          <h3>No Bookings Found</h3>
          <p>No booking sessions match your active tab or filter criteria.</p>
        </div>
      )}

      {/* Star Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Leave Star Review for ${selectedBooking?.service_title}`}
        footer={
          <>
            <button onClick={() => setReviewModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmitReview} className="btn btn-primary" disabled={reviewLoading}>
              {reviewLoading ? 'Submitting...' : 'Submit Star Review'}
            </button>
          </>
        }
      >
        {reviewError && <div className="alert alert-error">{reviewError}</div>}

        <form onSubmit={handleSubmitReview}>
          <div className="form-group">
            <label>Rating (1 to 5 Stars) *</label>
            <select value={reviewRating} onChange={(e) => setReviewRating(parseInt(e.target.value, 10))}>
              <option value="5">★★★★★ (5 Stars - Excellent)</option>
              <option value="4">★★★★☆ (4 Stars - Very Good)</option>
              <option value="3">★★★☆☆ (3 Stars - Average)</option>
              <option value="2">★★☆☆☆ (2 Stars - Below Average)</option>
              <option value="1">★☆☆☆☆ (1 Star - Poor)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Written Review Feedback</label>
            <textarea
              rows="3"
              placeholder="Share how helpful this session was in solving your problem or improving your skill..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              maxLength={500}
            />
          </div>
        </form>
      </Modal>

      {/* Endorse Modal */}
      <Modal
        isOpen={endorseModalOpen}
        onClose={() => setEndorseModalOpen(false)}
        title={`Recognize & Endorse Provider's Skill`}
        footer={
          <>
            <button onClick={() => setEndorseModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmitEndorsement} className="btn btn-primary" disabled={endorseLoading}>
              {endorseLoading ? 'Submitting...' : 'Recognize Skill'}
            </button>
          </>
        }
      >
        {endorseError && <div className="alert alert-error">{endorseError}</div>}

        <form onSubmit={handleSubmitEndorsement}>
          <div className="form-group">
            <label>Proficiency Endorsement (1 to 10)</label>
            <select value={endorseRating} onChange={(e) => setEndorseRating(parseInt(e.target.value, 10))}>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} / 10</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Endorsement Recognition Note</label>
            <textarea
              rows="3"
              placeholder="Recognize their technical proficiency..."
              value={endorseMessage}
              onChange={(e) => setEndorseMessage(e.target.value)}
              maxLength={300}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Bookings;
