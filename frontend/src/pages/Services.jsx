import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import ServiceCard from '../components/ServiceCard.jsx';
import Skeleton from '../components/Skeleton.jsx';
import Modal from '../components/Modal.jsx';

export const Services = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [pricingType, setPricingType] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');

  // Create Service Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    user_skill_id: '',
    category: 'Tutoring',
    title: '',
    description: '',
    pricing_type: 'hourly',
    price: '',
    duration_minutes: '60',
    online_available: true,
    in_person_available: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (category) params.append('category', category);
      if (pricingType) params.append('pricing_type', pricingType);
      if (deliveryMode) params.append('mode', deliveryMode);

      const res = await api.get(`/services?${params.toString()}`);
      if (res.success) setServices(res.services || []);
    } catch (err) {
      console.error('Fetch services error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [category, pricingType, deliveryMode]);

  useEffect(() => {
    if (user) {
      api.get(`/users/${user.username}`)
        .then(res => {
          if (res.success && res.profile?.skills) {
            setUserSkills(res.profile.skills);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleCreateService = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.post('/services', serviceForm);
      setCreateModalOpen(false);
      setServiceForm({
        user_skill_id: '',
        category: 'Tutoring',
        title: '',
        description: '',
        pricing_type: 'hourly',
        price: '',
        duration_minutes: '60',
        online_available: true,
        in_person_available: false
      });
      await fetchServices();
    } catch (err) {
      setError(err.message || 'Failed to create service offering.');
    } finally {
      setSaving(false);
    }
  };

  const handleBook = (service) => {
    navigate(`/services/${service.id}`);
  };

  return (
    <div className="page-wrapper">
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Skill-Based Services Catalog</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Book 1-on-1 tutoring, code reviews, and project consulting directly from peers.
          </p>
        </div>

        {user && (
          <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
            + Offer a Service
          </button>
        )}
      </div>

      {/* Cash Notice Alert */}
      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <span>💵</span>
        <div>
          <strong>Direct Cash Payment:</strong> All service sessions on SkillLink are paid directly in cash between customer and provider upon delivery. No digital payment gateway or platform commissions.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Search Offerings</label>
            <input
              type="text"
              placeholder="Search title, skill, provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchServices()}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Tutoring">Tutoring & Mentoring</option>
              <option value="Consulting">Consulting & Schema Review</option>
              <option value="Development">Development & Coding</option>
              <option value="Design">Design & UI / UX</option>
              <option value="Academic Help">Academic Help</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Pricing Type</label>
            <select value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
              <option value="">All Pricing Models</option>
              <option value="hourly">Hourly Rate</option>
              <option value="per_session">Per Session</option>
              <option value="fixed_project">Fixed Project</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Delivery Mode</label>
            <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)}>
              <option value="">All Modes</option>
              <option value="online">Online Only</option>
              <option value="in_person">In-Person Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid-cols-2">
          <Skeleton count={4} height="220px" />
        </div>
      ) : services.length > 0 ? (
        <div className="grid-cols-2">
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              currentUserId={user?.id}
              onBook={handleBook}
              onEdit={(service) => navigate(`/services/${service.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">💼</div>
          <h3>No Services Found</h3>
          <p>No active service offerings match your current filters. Be the first to offer a service for your skill!</p>
          {user && (
            <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary btn-sm">
              Offer a Service
            </button>
          )}
        </div>
      )}

      {/* Create Service Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create a Skill-Based Service Listing"
        footer={
          <>
            <button onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleCreateService} className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Publish Service Listing'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleCreateService}>
          <div className="form-group">
            <label>Select Skill from Your Profile *</label>
            <select
              value={serviceForm.user_skill_id}
              onChange={(e) => setServiceForm({ ...serviceForm, user_skill_id: e.target.value })}
              required
            >
              <option value="">-- Choose one of your listed skills --</option>
              {userSkills.map((us) => (
                <option key={us.user_skill_id || us.id} value={us.user_skill_id || us.id}>
                  {us.name || us.skill_name} (Proficiency: {us.proficiency}/10)
                </option>
              ))}
            </select>
            {userSkills.length === 0 && (
              <span className="form-helper" style={{ color: 'var(--color-error)' }}>
                You must add at least one skill in <Link to="/skills">My Skills</Link> before creating a service.
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Service Title *</label>
            <input
              type="text"
              placeholder="e.g. 1-on-1 React & State Architecture Mentoring"
              value={serviceForm.title}
              onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
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
                value={serviceForm.pricing_type}
                onChange={(e) => setServiceForm({ ...serviceForm, pricing_type: e.target.value })}
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
                placeholder="e.g. 450"
                min="0"
                step="50"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                required
              />
              <span className="form-helper">Paid in cash directly between parties</span>
            </div>

            <div className="form-group">
              <label>Typical Duration (Minutes)</label>
              <input
                type="number"
                placeholder="60"
                min="15"
                step="15"
                value={serviceForm.duration_minutes}
                onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Service Description</label>
            <textarea
              rows="3"
              placeholder="Explain what topics or deliverables you cover during a session..."
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={serviceForm.online_available}
                onChange={(e) => setServiceForm({ ...serviceForm, online_available: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Online Sessions
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={serviceForm.in_person_available}
                onChange={(e) => setServiceForm({ ...serviceForm, in_person_available: e.target.checked })}
                style={{ width: 'auto' }}
              />
              In-Person Sessions
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Services;
