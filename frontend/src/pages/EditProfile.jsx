import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Skeleton from '../components/Skeleton.jsx';

export const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    college: '',
    branch: '',
    graduation_year: '',
    location: '',
    bio: '',
    phone: ''
  });

  const [externalLinks, setExternalLinks] = useState({
    github: '',
    linkedin: '',
    instagram: '',
    portfolio: '',
    x: ''
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;

    api.get(`/users/${user.username}`)
      .then((res) => {
        if (res.success && res.profile) {
          const p = res.profile;
          setFormData({
            full_name: p.full_name || '',
            college: p.college || '',
            branch: p.branch || '',
            graduation_year: p.graduation_year || '',
            location: p.location || '',
            bio: p.bio || '',
            phone: p.phone || ''
          });
          setAvatarPreview(p.profile_picture || '');

          if (p.external_profiles) {
            const links = { github: '', linkedin: '', instagram: '', portfolio: '', x: '' };
            p.external_profiles.forEach((ext) => {
              links[ext.platform] = ext.profile_url;
            });
            setExternalLinks(links);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLinkChange = (e) => {
    setExternalLinks({ ...externalLinks, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // 1. Upload Avatar if selected
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append('avatar', avatarFile);
        const avatarRes = await api.post('/users/avatar', avatarData);
        if (avatarRes.success) {
          updateUser({ profile_picture: avatarRes.profile_picture });
        }
      }

      // 2. Update Profile fields
      const res = await api.put('/users/profile', formData);
      if (res.success) {
        updateUser(res.user);
      }

      // 3. Update external profile links
      for (const [platform, url] of Object.entries(externalLinks)) {
        if (url && url.trim().startsWith('https://')) {
          await api.post(`/users/${user.id}/external`, {
            platform,
            profile_url: url.trim()
          });
        }
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate(`/u/${user.username}`), 1200);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="350px" />
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '750px' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Edit Profile Information</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Update your public bio, education credentials, and social links.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <img
              src={avatarPreview || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
              alt="Avatar Preview"
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }}
            />
            <div>
              <label style={{ display: 'inline-block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.875rem' }}>
                Change Profile Picture
              </label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ fontSize: '0.85rem' }} />
              <div className="form-helper">JPEG, PNG, WebP up to 3MB</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Private Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
              <span className="form-helper">Stored securely in user_private (not visible to peers)</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>College / University</label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Branch / Major</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Graduation Year</label>
              <input
                type="number"
                name="graduation_year"
                min="1990"
                max="2100"
                value={formData.graduation_year}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location / City</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              rows="4"
              value={formData.bio}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>External Profiles & Social Links</h3>
            <p className="form-helper">Links must start with https://</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GitHub Profile URL</label>
              <input
                type="url"
                name="github"
                placeholder="https://github.com/username"
                value={externalLinks.github}
                onChange={handleLinkChange}
              />
            </div>

            <div className="form-group">
              <label>LinkedIn Profile URL</label>
              <input
                type="url"
                name="linkedin"
                placeholder="https://linkedin.com/in/username"
                value={externalLinks.linkedin}
                onChange={handleLinkChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Portfolio / Personal Website</label>
              <input
                type="url"
                name="portfolio"
                placeholder="https://mywebsite.com"
                value={externalLinks.portfolio}
                onChange={handleLinkChange}
              />
            </div>

            <div className="form-group">
              <label>X / Twitter Profile URL</label>
              <input
                type="url"
                name="x"
                placeholder="https://x.com/username"
                value={externalLinks.x}
                onChange={handleLinkChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
