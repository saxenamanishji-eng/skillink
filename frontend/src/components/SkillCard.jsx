import React from 'react';

export const SkillCard = ({ skill, onEndorse, onRemove, isOwner = false, canEndorse = false }) => {
  const proficiency = skill.proficiency || 5;
  const percentage = (proficiency / 10) * 100;

  return (
    <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="flex-between">
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.25rem' }}>
            {skill.category || 'General'}
          </span>
          <h4 style={{ fontSize: '1.05rem', marginTop: '0.2rem' }}>{skill.name || skill.skill_name}</h4>
        </div>

        {isOwner && onRemove && (
          <button
            onClick={() => onRemove(skill.skill_id || skill.id)}
            style={{ background: 'none', color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}
            title="Remove skill"
          >
            ✕ Remove
          </button>
        )}
      </div>

      {skill.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          {skill.description}
        </p>
      )}

      {/* Proficiency Bar */}
      <div>
        <div className="flex-between" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          <span>Proficiency</span>
          <span className="skill-tag" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>
            {proficiency}/10
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      {/* Endorsements summary & action */}
      <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          ⭐ {skill.endorsement_count || 0} Endorsement{(skill.endorsement_count || 0) !== 1 ? 's' : ''}
          {skill.avg_rating > 0 && ` (${parseFloat(skill.avg_rating).toFixed(1)}/10)`}
        </span>

        {canEndorse && onEndorse && (
          <button
            onClick={() => onEndorse(skill)}
            className="btn btn-secondary btn-sm"
          >
            ⭐ Endorse
          </button>
        )}
      </div>
    </div>
  );
};

export default SkillCard;
