import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.js';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const HelpArticle = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/help/articles/${slug}`)
      .then(res => {
        if (res.success) setArticle(res.article);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="page-wrapper" style={{ maxWidth: '800px' }}>
        <Skeleton height="350px" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="page-wrapper" style={{ maxWidth: '800px' }}>
        <div className="state-container">
          <div className="icon">📖</div>
          <h3>Article Not Found</h3>
          <p>{error || 'This knowledge base article is no longer published.'}</p>
          <Link to="/help" className="btn btn-primary btn-sm">Return to Knowledge Base</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/help" style={{ fontSize: '0.875rem' }}>← Back to Knowledge Base</Link>
      </div>

      <article className="card" style={{ padding: '2.5rem' }}>
        <span className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>
          {article.category}
        </span>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{article.title}</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
          Published on {formatDate(article.published_at || article.created_at)} {article.author_name ? `by ${article.author_name}` : ''}
        </div>

        {/* Content rendering */}
        <div style={{ lineHeight: 1.7, fontSize: '1rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
          {article.content}
        </div>
      </article>
    </div>
  );
};

export default HelpArticle;
