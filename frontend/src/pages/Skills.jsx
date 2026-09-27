import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import SkillCard from '../components/SkillCard.jsx';
import Modal from '../components/Modal.jsx';
import Skeleton from '../components/Skeleton.jsx';

export const Skills = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [allMasterSkills, setAllMasterSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Skill Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [customCategory, setCustomCategory] = useState('Web Development');
  const [proficiency, setProficiency] = useState(8);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUserSkills = async () => {
    try {
      setLoading(true);
      const [userRes, masterRes] = await Promise.all([
        api.get(`/users/${user.username}`),
        api.get('/skills')
      ]);

      if (userRes.success) setSkills(userRes.profile?.skills || []);
      if (masterRes.success) setAllMasterSkills(masterRes.skills || []);
    } catch (err) {
      console.error('Fetch skills error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUserSkills();
  }, [user]);

  const handleAddSkill = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        proficiency: parseInt(proficiency, 10)
      };

      if (selectedSkillId) {
        payload.skill_id = parseInt(selectedSkillId, 10);
      } else if (customSkillName.trim()) {
        payload.skill_name = customSkillName.trim();
        payload.category = customCategory;
      } else {
        setError('Please choose a skill or enter a custom skill name.');
        setSaving(false);
        return;
      }

      await api.post(`/users/${user.id}/skills`, payload);
      setModalOpen(false);
      setSelectedSkillId('');
      setCustomSkillName('');
      await fetchUserSkills();
    } catch (err) {
      setError(err.message || 'Failed to add skill.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSkill = async (skillId) => {
    if (!window.confirm('Are you sure you want to remove this skill from your profile? Any linked active service will also be removed.')) return;

    try {
      await api.delete(`/users/${user.id}/skills/${skillId}`);
      await fetchUserSkills();
    } catch (err) {
      alert(err.message || 'Failed to remove skill.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>My Technical & Academic Skills</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            List your proficiencies (1-10) to qualify for peer endorsements and offer tutoring services.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          + Add New Skill
        </button>
      </div>

      {loading ? (
        <div className="grid-cols-3">
          <Skeleton count={6} height="160px" />
        </div>
      ) : skills.length > 0 ? (
        <div className="grid-cols-3">
          {skills.map((s) => (
            <SkillCard
              key={s.skill_id}
              skill={s}
              isOwner={true}
              onRemove={handleRemoveSkill}
            />
          ))}
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">⚡</div>
          <h3>No Skills Listed</h3>
          <p>Add your proficiencies so your network can recognize and endorse your expertise.</p>
          <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
            Add Your First Skill
          </button>
        </div>
      )}

      {/* Add Skill Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Skill to Your Profile"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleAddSkill} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Skill'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleAddSkill}>
          <div className="form-group">
            <label>Select Existing Skill</label>
            <select
              value={selectedSkillId}
              onChange={(e) => {
                setSelectedSkillId(e.target.value);
                if (e.target.value) setCustomSkillName('');
              }}
            >
              <option value="">-- Choose from Directory or Enter Custom Below --</option>
              {allMasterSkills.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>

          {!selectedSkillId && (
            <>
              <div className="form-group">
                <label>Or Enter Custom Skill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Kubernetes, PostgreSQL"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}>
                  <option value="Web Development">Web Development</option>
                  <option value="Backend Development">Backend Development</option>
                  <option value="Databases">Databases</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Design">Design / UI / UX</option>
                  <option value="Computer Science">Computer Science / Core</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <div className="flex-between">
              <label>Proficiency Level (1 to 10)</label>
              <span className="skill-tag">{proficiency} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>1 (Novice)</span>
              <span>5 (Competent)</span>
              <span>10 (Expert / Master)</span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Skills;
