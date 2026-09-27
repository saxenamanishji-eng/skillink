import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminHelpCenter = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [articleForm, setArticleForm] = useState({
    id: null,
    title: '',
    slug: '',
    category: 'General',
    content: '',
    status: 'published'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/help-articles');
      if (res.success) setArticles(res.articles || []);
    } catch (err) {
      console.error('Admin articles fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setArticleForm({
      id: null,
      title: '',
      slug: '',
      category: 'General',
      content: '',
      status: 'published'
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (a) => {
    setIsEditing(true);
    setArticleForm({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category,
      content: a.content,
      status: a.status
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isEditing) {
        await api.put(`/admin/help-articles/${articleForm.id}`, articleForm);
      } else {
        await api.post('/admin/help-articles', articleForm);
      }
      setModalOpen(false);
      await fetchArticles();
    } catch (err) {
      setError(err.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await api.delete(`/admin/help-articles/${articleId}`);
      await fetchArticles();
    } catch (err) {
      alert(err.message || 'Failed to delete article.');
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Knowledge Base Article CMS</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Publish, edit, and categorize help center guides and documentation.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          + Write New Article
        </button>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Category</th>
                <th>Status</th>
                <th>Author</th>
                <th>Published Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>#{a.id}</td>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td className="skill-tag" style={{ border: 'none', background: 'none', padding: 0 }}>
                    /help/{a.slug}
                  </td>
                  <td><span className="badge badge-primary">{a.category}</span></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.author_name || 'Admin'}</td>
                  <td>{formatDate(a.published_at || a.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleOpenEdit(a)} className="btn btn-secondary btn-sm">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-error)' }}>
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

      {/* Article Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Article #${articleForm.id}` : 'Create Help Article'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Article'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Article Title *</label>
            <input
              type="text"
              placeholder="e.g. How to Connect with Peers"
              value={articleForm.title}
              onChange={(e) => {
                const title = e.target.value;
                setArticleForm({
                  ...articleForm,
                  title,
                  slug: isEditing ? articleForm.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                });
              }}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>URL Slug *</label>
              <input
                type="text"
                placeholder="e.g. how-to-connect-peers"
                value={articleForm.slug}
                onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                placeholder="e.g. Skills, Bookings, Security"
                value={articleForm.category}
                onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Publication Status</label>
            <select value={articleForm.status} onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value })}>
              <option value="published">Published (Visible to all users)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="form-group">
            <label>Markdown Content *</label>
            <textarea
              rows="8"
              placeholder="Write the guide content using markdown headings, bullets, and steps..."
              value={articleForm.content}
              onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminHelpCenter;
