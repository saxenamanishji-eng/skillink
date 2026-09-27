import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { formatCurrency, formatDate, DAYS_OF_WEEK } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';
import Modal from '../components/Modal.jsx';

export const ServiceDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Form State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [mode, setMode] = useState('online');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Complaint Modal State
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState('');

  // Edit Service Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'Tutoring',
    pricing_type: 'hourly',
    price: '',
    duration_minutes: '60',
    online_available: true,
    in_person_available: false,
    is_active: true
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/services/${id}`);
      if (res.success && res.service) {
        setService(res.service);
        setEditForm({
          title: res.service.title || '',
          description: res.service.description || '',
          category: res.service.category || 'Tutoring',
          pricing_type: res.service.pricing_type || 'hourly',
          price: res.service.price || '',
          duration_minutes: res.service.duration_minutes || '60',
          online_available: Boolean(res.service.online_available),
          in_person_available: Boolean(res.service.in_person_available),
          is_active: Boolean(res.service.is_active)
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceDetails();
  }, [id]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const res = await api.put(`/services/${id}`, editForm);
      if (res.success) {
        setEditSuccess('Service updated successfully!');
        setTimeout(() => {
          setEditModalOpen(false);
          setEditSuccess('');
          fetchServiceDetails();
        }, 1200);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update service.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingLoading(true);

    try {
      const res = await api.post('/bookings', {
        service_id: service.id,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        mode,
        notes
      });

      if (res.success) {
        setBookingSuccess('Booking request submitted to provider! Payment will be handled directly in cash.');
        setTimeout(() => {
          setBookingModalOpen(false);
          navigate('/bookings');
        }, 2000);
      }
    } catch (err) {
      setBookingError(err.message || 'Unable to schedule booking. Please choose a non-conflicting time slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/complaints', {
        complaint_type: 'service',
        service_id: service.id,
        reported_user_id: service.provider_id,
        subject: complaintSubject,
        description: complaintDesc
      });
      setComplaintSuccess('Complaint logged with administrators.');
      setTimeout(() => setComplaintModalOpen(false), 1500);
    } catch (err) {
      alert(err.message || 'Failed to file complaint.');
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="300px" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="page-wrapper">
        <div className="state-container">
          <div className="icon">💼</div>
          <h3>Service Not Found</h3>
          <p>{error || 'This service listing is inactive or no longer available.'}</p>
          <Link to="/services" className="btn btn-primary btn-sm">Return to Services</Link>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === service.provider_id;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="page-wrapper" style={{ maxWidth: '900px' }}>
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="badge badge-primary">{service.category}</span>
          <span className="price-tag" style={{ fontSize: '1.5rem' }}>
            {formatCurrency(service.price, service.currency)}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {' '}/ {service.pricing_type.replace(/_/g, ' ')}
            </span>
          </span>
        </div>

        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.75rem' }}>{service.title}</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          <span>⚡ Skill: <strong>{service.skill_name}</strong> ({service.proficiency}/10)</span>
          {service.duration_minutes && <span>⏱️ Typical Session: {service.duration_minutes} mins</span>}
          <span>⭐ {parseFloat(service.avg_rating || 0).toFixed(1)} / 5 ({service.review_count || 0} reviews)</span>
        </div>

        {/* Cash payment notice banner */}
        <div className="alert alert-info">
          <span>💵</span>
          <div>
            <strong>Cash Payment Policy:</strong> The agreed price of <strong>{formatCurrency(service.price, service.currency)}</strong> is paid directly in cash (or agreed peer method) between you and the provider at session time.
          </div>
        </div>

        <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text)', margin: '1.5rem 0' }}>
          {service.description || 'No detailed description provided for this service offering.'}
        </p>

        {/* Provider Profile Snippet */}
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src={service.provider_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${service.provider_username}`}
              alt={service.provider_name}
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Offered By
              </div>
              <Link to={`/u/${service.provider_username}`} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {service.provider_name}
              </Link>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {service.provider_college} {service.provider_branch ? `• ${service.provider_branch}` : ''}
              </div>
            </div>
            <Link to={`/u/${service.provider_username}`} className="btn btn-secondary btn-sm">
              View Profile
            </Link>
          </div>
        </div>

        {/* Provider Availability Schedule */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Provider Weekly Availability Windows</h3>
          {service.availability && service.availability.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {service.availability.map((av) => (
                <div key={av.id} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700 }}>{DAYS_OF_WEEK[av.day_of_week]}</div>
                  <div style={{ color: 'var(--color-primary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    {av.start_time.slice(0, 5)} - {av.end_time.slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Provider has not listed explicit weekly slots. You can still propose a custom date and time below.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setComplaintModalOpen(true)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-error)' }}>
            ⚠️ Report Issue / Complaint
          </button>

          {!isOwner ? (
            <button onClick={() => setBookingModalOpen(true)} className="btn btn-primary btn-lg">
              🗓️ Request Booking Session
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-neutral" style={{ padding: '0.5rem 1rem' }}>
                You own this service offering
              </span>
              <button onClick={() => setEditModalOpen(true)} className="btn btn-primary">
                ✏️ Edit Service Offering
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Customer Reviews & Ratings</h3>
        {service.reviews && service.reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {service.reviews.map((rev) => (
              <div key={rev.id} style={{ padding: '1rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex-between" style={{ marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={rev.reviewer_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${rev.reviewer_username}`}
                      alt={rev.reviewer_name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    />
                    <strong style={{ fontSize: '0.9rem' }}>{rev.reviewer_name}</strong>
                  </div>
                  <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </span>
                </div>
                {rev.comment && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>"{rev.comment}"</p>}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                  {formatDate(rev.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No reviews submitted yet for this service offering.
          </p>
        )}
      </div>

      {/* Booking Request Modal */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={`Request Booking: ${service.title}`}
        footer={
          <>
            <button onClick={() => setBookingModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleBookingSubmit} className="btn btn-primary" disabled={bookingLoading}>
              {bookingLoading ? 'Submitting Request...' : 'Confirm Booking Request'}
            </button>
          </>
        }
      >
        {bookingError && <div className="alert alert-error">{bookingError}</div>}
        {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}

        <form onSubmit={handleBookingSubmit}>
          <div className="form-group">
            <label>Booking Date *</label>
            <input
              type="date"
              min={todayStr}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Delivery Mode *</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {service.online_available && <option value="online">Online Video Session</option>}
              {service.in_person_available && <option value="in_person">In-Person Meetup</option>}
            </select>
          </div>

          <div className="form-group">
            <label>Context Notes / Goals for Session</label>
            <textarea
              rows="3"
              placeholder="What questions or project parts would you like to review during this session?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', border: '1px solid var(--color-border)' }}>
            <div className="flex-between">
              <span>Agreed Snapshot Fee:</span>
              <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
                {formatCurrency(service.price, service.currency)}
              </strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
              * You will pay this amount in cash directly to {service.provider_name} upon session delivery.
            </div>
          </div>
        </form>
      </Modal>

      {/* Complaint Modal */}
      <Modal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        title="File a Service Complaint"
        footer={
          <>
            <button onClick={() => setComplaintModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleComplaintSubmit} className="btn btn-danger">Submit Complaint</button>
          </>
        }
      >
        {complaintSuccess ? (
          <div className="alert alert-success">{complaintSuccess}</div>
        ) : (
          <form onSubmit={handleComplaintSubmit}>
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                placeholder="e.g. Inaccurate service description"
                value={complaintSubject}
                onChange={(e) => setComplaintSubject(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Detailed Description</label>
              <textarea
                rows="4"
                placeholder="Please describe the issue in detail for administrator review..."
                value={complaintDesc}
                onChange={(e) => setComplaintDesc(e.target.value)}
                required
              />
            </div>
          </form>
        )}
      </Modal>
      {/* Edit Service Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Service Offering"
        footer={
          <>
            <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleEditSubmit} className="btn btn-primary" disabled={editLoading}>
              {editLoading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editError && <div className="alert alert-error">{editError}</div>}
        {editSuccess && <div className="alert alert-success">{editSuccess}</div>}

        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label>Service Title *</label>
            <input
              type="text"
              placeholder="e.g. 1-on-1 React & Architecture Mentoring"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                <option value="Tutoring">Tutoring</option>
                <option value="Consulting">Consulting</option>
                <option value="Freelancing">Freelancing</option>
                <option value="Mentoring">Mentoring</option>
                <option value="Design">Design</option>
                <option value="Development">Development</option>
                <option value="Academic Help">Academic Help</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Pricing Model *</label>
              <select
                value={editForm.pricing_type}
                onChange={(e) => setEditForm({ ...editForm, pricing_type: e.target.value })}
              >
                <option value="hourly">Hourly Rate</option>
                <option value="per_session">Per Session</option>
                <option value="fixed_project">Fixed Project</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price in INR (₹) *</label>
              <input
                type="number"
                placeholder="450"
                min="0"
                step="50"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                required
              />
              <span className="form-helper">Paid in cash directly upon delivery</span>
            </div>

            <div className="form-group">
              <label>Typical Duration (Minutes)</label>
              <input
                type="number"
                placeholder="60"
                min="15"
                step="15"
                value={editForm.duration_minutes}
                onChange={(e) => setEditForm({ ...editForm, duration_minutes: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Service Description</label>
            <textarea
              rows="3"
              placeholder="Explain what topics or deliverables you cover during a session..."
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editForm.online_available}
                onChange={(e) => setEditForm({ ...editForm, online_available: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Online Sessions
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editForm.in_person_available}
                onChange={(e) => setEditForm({ ...editForm, in_person_available: e.target.checked })}
                style={{ width: 'auto' }}
              />
              In-Person Sessions
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Listing Active (Visible in Catalog)
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServiceDetails;
