import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Skeleton from '../components/Skeleton.jsx';

export const Help = () => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/help/articles?${params.toString()}`);
      if (res.success) {
        setArticles(res.articles || []);
        if (res.categories) setCategories(res.categories);
      }
    } catch (err) {
      console.error('Fetch help articles error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  return (
    <div className="page-wrapper">
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>SkillLink Help & Knowledge Base</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Guides and official documentation on networking, QR profiles, booking cash services, and platform policies.
        </p>

        {/* Search Input */}
        <form onSubmit={(e) => { e.preventDefault(); fetchArticles(); }} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search guides, tutorials, FAQ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Categories Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
        <button
          onClick={() => setSelectedCategory('')}
          className={`btn btn-sm ${!selectedCategory ? 'btn-primary' : 'btn-secondary'}`}
        >
          All Topics
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`btn btn-sm ${selectedCategory === c ? 'btn-primary' : 'btn-secondary'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      {loading ? (
        <div className="grid-cols-2">
          <Skeleton count={4} height="120px" />
        </div>
      ) : articles.length > 0 ? (
        <div className="grid-cols-2">
          {articles.map((a) => (
            <Link key={a.id} to={`/help/${a.slug}`} className="card card-hoverable" style={{ textDecoration: 'none' }}>
              <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>{a.category}</span>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>{a.title}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                Read Guide →
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">📖</div>
          <h3>No Articles Found</h3>
          <p>Try searching for another topic or browse all categories.</p>
        </div>
      )}

      {/* Support Triad Distinction Banner */}
      <div className="card" style={{ marginTop: '3.5rem', padding: '1.75rem', backgroundColor: 'var(--color-surface-alt)' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', textAlign: 'center' }}>Need More Direct Help?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div className="card">
            <h4 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.35rem' }}>💬 Helpdesk</h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
              "I need help using SkillLink." For usage questions and technical troubleshooting.
            </p>
            <Link to="/helpdesk/new" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Open Ticket</Link>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '1rem', color: 'var(--color-error)', marginBottom: '0.35rem' }}>⚠️ Complaint</h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
              "I have a problem or dispute that needs investigation." For service disputes or reviews.
            </p>
            <Link to="/complaints/new" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>File Complaint</Link>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '1rem', color: 'var(--color-warning)', marginBottom: '0.35rem' }}>🚩 Report</h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
              "This user or content violates platform rules." Available on any user profile or service card.
            </p>
            <Link to="/discover" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Find Content</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
