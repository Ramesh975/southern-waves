import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articleAPI } from '../../services/api';
import QuickPublishModal from '../../components/QuickPublishModal';

const ArticleEditor = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [editingArticle, setEditingArticle] = useState(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      articleAPI.getById(id)
        .then((res) => {
          setEditingArticle(res.data.data);
          setLoading(false);
        })
        .catch(() => {
          articleAPI.getAll({ limit: 100 })
            .then((res) => {
              const found = res.data?.data?.find(a => a._id === id);
              setEditingArticle(found || null);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        });
    }
  }, [id, isEdit]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <QuickPublishModal
      editingArticle={editingArticle}
      defaultCategory="news"
      onClose={() => navigate(-1)}
      onPublishSuccess={() => navigate(-1)}
    />
  );
};

export default ArticleEditor;
