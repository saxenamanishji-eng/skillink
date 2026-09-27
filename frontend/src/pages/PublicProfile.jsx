import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import SkillCard from '../components/SkillCard.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';

export const PublicProfile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Connect Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [whereWeMet, setWhereWeMet] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState('');

  // Endorse Modal State
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [endorseRating, setEndorseRating] = useState(10);
  const [endorseMessage, setEndorseMessage] = useState('');
  const [endorseLoading, setEndorseLoading] = useState(false);
  const [endorseSuccess, setEndorseSuccess] = useState('');

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/users/${username}`);
      if (res.success) {
        setProfile(res.profile);
      }
    } catch (err) {
      setError(err.message || 'Profile not found or access restricted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const isOwner = currentUser && profile && currentUser.id === profile.id;
  const isConnected = profile?.connection_status?.status === 'accepted';
  const isPending = profile?.connection_status?.status === 'pending';

  const handleSendConnection = async (e) => {
    e.preventDefault();
    setConnectLoading(true);
    try {
      await api.post('/connections', {
        receiver_id: profile.id,
        where_we_met: whereWeMet
      });
      setConnectSuccess('Connection request sent!');
      setTimeout(() => {
        setConnectModalOpen(false);
        fetchProfile();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to send connection request.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleOpenEndorse = (skill) => {
    setSelectedSkill(skill);
    setEndorseRating(10);
    setEndorseMessage('');
    setEndorseSuccess('');
    setEndorseModalOpen(true);
  };

  const handleSubmitEndorsement = async (e) => {
    e.preventDefault();
    setEndorseLoading(true);
    try {
      await api.post('/endorsements', {
        to_user_id: profile.id,
        skill_id: selectedSkill.skill_id || selectedSkill.id,
        rating: endorseRating,
        message: endorseMessage
      });
      setEndorseSuccess('Skill endorsement submitted!');
      setTimeout(() => {
        setEndorseModalOpen(false);
        fetchProfile();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to submit endorsement.');
    } finally {
      setEndorseLoading(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    try {
      await api.post('/reports', {
        reported_user_id: profile.id,
        content_type: 'profile',
        content_id: profile.id,
        reason: reportReason,
        description: reportDescription
      });
      setReportSuccess('Report submitted for moderation review.');
      setTimeout(() => {
        setReportModalOpen(false);
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to submit report.');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="200px" />
        <div style={{ marginTop: '2rem' }}>
          <Skeleton count={3} height="100px" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-wrapper">
        <div className="state-container">
          <div className="icon">👤</div>
          <h3>Profile Not Available</h3>
          <p>{error || 'This user profile does not exist or has been made private.'}</p>
          <Link to="/discover" className="btn btn-primary btn-sm">Discover Other Peers</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Profile Header Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          <img
            src={profile.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`}
            alt={profile.full_name}
            style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }}
          />

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem' }}>{profile.full_name}</h1>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>@{profile.username}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isOwner ? (
                  <Link to="/edit-profile" className="btn btn-secondary btn-sm">
                    ✏️ Edit Profile
                  </Link>
                ) : (
                  <>
                    {!isConnected && (
                      <button
                        onClick={() => setConnectModalOpen(true)}
                        className="btn btn-primary btn-sm"
                        disabled={isPending}
                      >
                        {isPending ? '⏳ Connection Pending' : '🤝 Connect'}
                      </button>
                    )}

                    {isConnected && (
                      <span className="badge badge-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                        ✓ Connected
                      </span>
                    )}

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="btn btn-secondary btn-sm"
                      title="Report policy violation"
                    >
                      🚩 Report
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Academic Info */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {profile.college && <span>🎓 {profile.college}</span>}
              {profile.branch && <span>📚 {profile.branch}</span>}
              {profile.graduation_year && <span>🗓️ Class of {profile.graduation_year}</span>}
              {profile.location && <span>📍 {profile.location}</span>}
            </div>

            {profile.bio && (
              <p style={{ marginTop: '1rem', fontSize: '0.925rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                {profile.bio}
              </p>
            )}

            {/* External Links */}
            {profile.external_profiles && profile.external_profiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                {profile.external_profiles.map((ext) => (
                  <a
                    key={ext.id}
                    href={ext.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                  >
                    🔗 {ext.platform.toUpperCase()}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>Skills & Proficiency</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Verified skill levels and peer recognitions
            </p>
          </div>
          {isOwner && <Link to="/skills" className="btn btn-secondary btn-sm">+ Manage Skills</Link>}
        </div>

        {profile.skills && profile.skills.length > 0 ? (
          <div className="grid-cols-3">
            {profile.skills.map((s) => (
              <SkillCard
                key={s.skill_id}
                skill={s}
                isOwner={isOwner}
                canEndorse={isConnected && !isOwner}
                onEndorse={handleOpenEndorse}
              />
            ))}
          </div>
        ) : (
          <div className="state-container">
            <div className="icon">⚡</div>
            <h3>No Skills Listed</h3>
            <p>This user has not yet added skills to their profile.</p>
          </div>
        )}
      </div>

      {/* Services Offered Section */}
      {profile.services && profile.services.length > 0 && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.4rem' }}>Bookable Skill Services</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Mentoring, consulting, and tutoring sessions offered by {profile.full_name} (Cash Payment Only)
            </p>
          </div>

          <div className="grid-cols-2">
            {profile.services.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={{ ...svc, provider_name: profile.full_name, provider_username: profile.username }}
                isOwner={isOwner}
                currentUserId={currentUser?.id}
                onEdit={(service) => window.location.href = `/services/${service.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connect Modal */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={`Connect with ${profile.full_name}`}
        footer={
          <>
            <button onClick={() => setConnectModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSendConnection} className="btn btn-primary" disabled={connectLoading}>
              {connectLoading ? 'Sending...' : 'Send Connection Request'}
            </button>
          </>
        }
      >
        {connectSuccess ? (
          <div className="alert alert-success">{connectSuccess}</div>
        ) : (
          <form onSubmit={handleSendConnection}>
            <div className="form-group">
              <label>Where did you meet or collaborate? (Optional Context Note)</label>
              <input
                type="text"
                placeholder="e.g. DTU Hackathon, Database Lab, Campus Meetup"
                value={whereWeMet}
                onChange={(e) => setWhereWeMet(e.target.value)}
                maxLength={200}
              />
              <span className="form-helper">Adding context helps peers recognize who you are.</span>
            </div>
          </form>
        )}
      </Modal>

      {/* Endorse Modal */}
      <Modal
        isOpen={endorseModalOpen}
        onClose={() => setEndorseModalOpen(false)}
        title={`Endorse ${profile.full_name} for ${selectedSkill?.name || selectedSkill?.skill_name}`}
        footer={
          <>
            <button onClick={() => setEndorseModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmitEndorsement} className="btn btn-primary" disabled={endorseLoading}>
              {endorseLoading ? 'Submitting...' : 'Submit Endorsement'}
            </button>
          </>
        }
      >
        {endorseSuccess ? (
          <div className="alert alert-success">{endorseSuccess}</div>
        ) : (
          <form onSubmit={handleSubmitEndorsement}>
            <div className="form-group">
              <label>Proficiency Rating (1 to 10)</label>
              <select
                value={endorseRating}
                onChange={(e) => setEndorseRating(parseInt(e.target.value, 10))}
              >
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                  <option key={num} value={num}>
                    {num} / 10 {num === 10 ? '— Master/Expert' : num >= 8 ? '— Highly Proficient' : num >= 5 ? '— Intermediate' : '— Novice'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Recognition Feedback Note</label>
              <textarea
                rows="3"
                placeholder="Share specific feedback about their practical skill or collaboration experience..."
                value={endorseMessage}
                onChange={(e) => setEndorseMessage(e.target.value)}
                maxLength={300}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Profile or Policy Violation"
        footer={
          <>
            <button onClick={() => setReportModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmitReport} className="btn btn-danger" disabled={reportLoading}>
              {reportLoading ? 'Reporting...' : 'Submit Report'}
            </button>
          </>
        }
      >
        {reportSuccess ? (
          <div className="alert alert-success">{reportSuccess}</div>
        ) : (
          <form onSubmit={handleSubmitReport}>
            <div className="form-group">
              <label>Reason for Report</label>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="spam">Spam / Unsolicited Promotion</option>
                <option value="fake_profile">Fake Profile or Impersonation</option>
                <option value="harassment">Harassment or Inappropriate Behavior</option>
                <option value="inappropriate_content">Inappropriate Content / Language</option>
                <option value="misleading_service">Misleading Skill / Service Details</option>
                <option value="suspicious_activity">Suspicious Security Activity</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Explanation & Details</label>
              <textarea
                rows="4"
                placeholder="Please describe why this profile violates SkillLink terms..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                required
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PublicProfile;
