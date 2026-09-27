import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';

export const AdminSkills = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [skillForm, setSkillForm] = useState({ id: null, name: '', category: 'Web Development', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/skills');
      if (res.success) setSkills(res.skills || []);
    } catch (err) {
      console.error('Admin skills fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSkillForm({ id: null, name: '', category: 'Web Development', description: '' });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setIsEditing(true);
    setSkillForm({ id: s.id, name: s.name, category: s.category || 'General', description: s.description || '' });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isEditing) {
        await api.put(`/admin/skills/${skillForm.id}`, skillForm);
      } else {
        await api.post('/admin/skills', skillForm);
      }
      setModalOpen(false);
      await fetchSkills();
    } catch (err) {
      setError(err.message || 'Failed to save skill.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skillId) => {
    if (!window.confirm('Are you sure you want to delete this master skill?')) return;

    try {
      await api.delete(`/admin/skills/${skillId}`);
      await fetchSkills();
    } catch (err) {
      alert(err.message || 'Failed to delete skill.');
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Master Skills Taxonomy</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Standardize and categorize technical proficiencies across the SkillLink platform.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Add New Master Skill
        </button>
      </div>

      {loading ? (
        <Skeleton count={6} height="55px" />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Skill Name</th>
                <th>Category</th>
                <th>Users Listed</th>
                <th>Endorsements</th>
                <th>Services</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>#{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <span className="badge badge-primary">{s.category || 'General'}</span>
                  </td>
                  <td>👥 {s.user_count}</td>
                  <td>⭐ {s.endorsement_count}</td>
                  <td>💼 {s.service_count}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleOpenEdit(s)} className="btn btn-secondary btn-sm">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-error)' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Skill Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Skill #${skillForm.id}` : 'Create Master Skill'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Skill'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Skill Name *</label>
            <input
              type="text"
              placeholder="e.g. Distributed Caching & Redis"
              value={skillForm.name}
              onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <input
              type="text"
              placeholder="e.g. Backend Development, Databases, AI"
              value={skillForm.category}
              onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description / Learning Outcomes</label>
            <textarea
              rows="3"
              placeholder="Brief summary of practical knowledge or topics covered..."
              value={skillForm.description}
              onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminSkills;
