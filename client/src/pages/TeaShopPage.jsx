import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { articleAPI, commentAPI } from '../services/api';
import { getImageUrl } from '../components/ArticleComponents';
import { format } from 'date-fns';
import { BiHeart, BiTime, BiComment, BiShareAlt, BiChat, BiX, BiCategory, BiHomeAlt, BiMessageSquareDots, BiCoffee, BiBookOpen, BiTrash } from 'react-icons/bi';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import BottomNavPill from '../components/BottomNavPill';
import '../NewsTag.css';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const TeaShopPage = () => {
  const { user } = useAuth();
  const { styleMode } = useTheme();
  const navigate = useNavigate();
  const socket = useRef(null);
  
  // Tab state: 'board' | 'studies' | 'ground'
  const [activeTab, setActiveTab] = useState('ground');

  const [groundPosts, setGroundPosts] = useState([]);
  const [boardPosts, setBoardPosts] = useState([]);
  const [studiesPosts, setStudiesPosts] = useState([]);
  const [trending, setTrending] = useState([]); // Mostly Hyped News
  
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Form State (Create)
  const [title, setTitle] = useState('');
  const [lead, setLead] = useState('');
  const [body, setBody] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Initial Data Load
  useEffect(() => {
    // Fetch mostly hyped (trending) news for the sidebar
    articleAPI.getTrending()
      .then((res) => setTrending(res.data?.data || []))
      .catch(console.error);
  }, []);

  // Fetch posts based on tab
  useEffect(() => {
    const fetchPosts = async (category, setter) => {
      setLoadingPosts(true);
      try {
        const res = await articleAPI.getAll({ category, status: 'published', limit: 40 });
        setter(res.data.data);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };

    if (activeTab === 'ground' && groundPosts.length === 0) fetchPosts('tea-shop', setGroundPosts);
    else if (activeTab === 'board' && boardPosts.length === 0) fetchPosts('board', setBoardPosts);
    else if (activeTab === 'studies' && studiesPosts.length === 0) fetchPosts('studies', setStudiesPosts);
  }, [activeTab]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to post.');
    if (!title || !lead) return toast.error('Please fill in required fields');

    setSubmittingPost(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('lead', lead);
    formData.append('body', body || lead);
    formData.append('category', 'tea-shop');
    formData.append('status', 'published');
    if (coverImage) formData.append('coverImage', coverImage);

    try {
      const res = await articleAPI.create(formData);
      const newPost = res.data.data;

      if (newPost.status === 'pending' || newPost.isFlagged) {
        // Post was flagged by the filter and sent for admin review
        toast('⚠️ Your post was flagged by our content filter and is under review. You\'ll regain access once approved.', {
          duration: 7000,
          style: {
            background: '#fef3c7',
            color: '#92400e',
            border: '2px solid #f59e0b',
          },
        });
      } else {
        setGroundPosts((prev) => [newPost, ...prev]);
        toast.success('Post shared to Tea Shop Ground! ☕');
      }
      setTitle(''); setLead(''); setBody(''); setCoverImage(null); setImagePreview(null);
    } catch (err) {
      if (err.response?.data?.blocked) {
        toast.error('Your account has been suspended due to community guideline violations.', { duration: 6000 });
      } else {
        toast.error(err.response?.data?.message || 'Failed to publish post');
      }
    } finally {
      setSubmittingPost(false);
    }
  };


  const handleReaction = async (id, type, setter, currentList) => {
    if (!user) return toast.error('Please log in to respond to posts');
    try {
      const res = type === 'like' ? await articleAPI.like(id) : await articleAPI.dislike(id);
      setter(currentList.map(post => post._id === id ? { ...post, likes: res.data.likes, dislikes: res.data.dislikes } : post));
    } catch (err) {
      toast.error('Failed to register reaction');
    }
  };

  const handleDeletePost = async (postId) => {
    const confirmation = prompt("To delete this post, type 'CONFIRM DELETE':");
    if (confirmation === 'CONFIRM DELETE') {
      try {
        await articleAPI.delete(postId);
        setGroundPosts(prev => prev.filter(p => p._id !== postId));
        setBoardPosts(prev => prev.filter(p => p._id !== postId));
        setStudiesPosts(prev => prev.filter(p => p._id !== postId));
        toast.success("Post deleted successfully.");
      } catch (err) {
        toast.error("Failed to delete post");
      }
    } else if (confirmation !== null) {
      toast.error("Confirmation text mismatched. Deletion cancelled.");
    }
  };

  const renderPostList = (posts, setter) => {
    if (loadingPosts) return <div style={{ textAlign: 'center', padding: '50px 0' }}>Loading...</div>;
    if (posts.length === 0) return <p style={{ color: 'var(--color-gray-500)', fontStyle: 'italic', padding: '20px 0' }}>No posts found in this section.</p>;
    
    return posts.map(post => (
      <PostCard
        key={post._id}
        post={post}
        user={user}
        onReaction={(id, type) => handleReaction(id, type, setter, posts)}
        onDelete={handleDeletePost}
      />
    ));
  };

  const isModern = styleMode === 'modern';

  return (
    <main className="newstag-page container">

      {/* Segmented control for Board, Studies, Ground */}
      <div className="teashop-tabs-bar" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '12px' }}>
        {[
          { id: 'ground', label: '☕ Ground' },
          { id: 'board', label: '📢 Board' },
          { id: 'studies', label: '📖 Studies' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px',
              borderRadius: isModern ? '999px' : '0px',
              border: isModern ? 'none' : '2px solid var(--color-black)',
              background: activeTab === tab.id 
                ? (isModern ? '#007aff' : 'var(--color-black)') 
                : (isModern ? 'rgba(0,0,0,0.05)' : 'var(--color-white)'),
              color: activeTab === tab.id 
                ? 'var(--color-white)' 
                : 'var(--color-black)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="newstag-grid">
        {/* Left Column: Feed Area */}
        <div className="newstag-feed">
          
          {/* Ground Tab Specific: Create Post Form */}
          {activeTab === 'ground' && user && user.role !== 'admin' && user.role !== 'editor' && (
            <div style={{ background: 'var(--color-gray-100)', padding: 20, borderRadius: 8, marginBottom: 24, border: '1px solid var(--color-gray-200)' }}>
              <form onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  placeholder="I wish to play football in Nationals..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-gray-300)', padding: '8px 0', fontSize: 16, color: 'var(--color-black)', outline: 'none', marginBottom: 12, fontWeight: 700 }}
                  required
                />
                <textarea
                  placeholder="All sub description like feed..."
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  rows={2}
                  style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', fontSize: 14, color: 'var(--color-gray-600)', outline: 'none', marginBottom: 12 }}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-gray-500)', fontSize: 12 }}>
                    <BiCategory size={16} />
                    {coverImage ? 'Image Selected' : 'Add Image'}
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                  <button type="submit" disabled={submittingPost} style={{ background: 'var(--color-red)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: submittingPost ? 'not-allowed' : 'pointer' }}>
                    {submittingPost ? 'Posting...' : 'Post'}
                  </button>
                </div>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" style={{ marginTop: 12, maxHeight: 150, borderRadius: 4, objectFit: 'cover' }} />
                )}
              </form>
            </div>
          )}

          {/* Render Feed based on active tab */}
          {activeTab === 'ground' && renderPostList(groundPosts, setGroundPosts)}
          {activeTab === 'board' && (
             <>
               <div style={{ padding: '16px 20px', background: 'rgba(200,16,46,0.08)', borderLeft: '4px solid var(--color-red)', marginBottom: 20, color: 'var(--color-black)', fontSize: 14, fontWeight: 600 }}>
                 This is only for announcements from the University & Any Special Information.
               </div>
               {renderPostList(boardPosts, setBoardPosts)}
             </>
          )}
          {activeTab === 'studies' && renderPostList(studiesPosts, setStudiesPosts)}
        </div>

        {/* Right Column: Sidebar (Mostly Hyped News) */}
        <aside className="newstag-sidebar">
          <h3 className="newstag-sidebar-title">Mostly Hyped News</h3>
          {trending.slice(0, 5).map((article, index) => (
            <div key={article._id} className="newstag-hyped-item">
              <div className="newstag-hyped-rank">#{index + 1}</div>
              <div className="newstag-hyped-content">
                <Link to={`/article/${article.slug}`}>
                  <h4 className="newstag-hyped-title">{article.title}</h4>
                </Link>
                <div className="newstag-hyped-meta">
                  <span className="newstag-author-name">By {article.author?.name}</span>
                  <Link to={`/article/${article.slug}`} className="newstag-view-btn">View</Link>
                </div>
              </div>
              {article.coverImage && (
                <Link to={`/article/${article.slug}`}>
                  <img src={getImageUrl(article.coverImage)} alt={article.title} className="newstag-hyped-image" />
                </Link>
              )}
            </div>
          ))}
        </aside>
      </div>

      {/* Render standard BottomNavPill component */}
      <BottomNavPill 
        category="tea-shop" 
        onPublishSuccess={(newPost) => {
          if (newPost.category === 'tea-shop') {
            setGroundPosts((prev) => [newPost, ...prev]);
          }
        }}
      />
    </main>
  );
};

// Reusable PostCard Component matching NewsTag UI but with inline comments
const PostCard = ({ post, user, onReaction }) => {
  const hasLiked = user && post.likes?.includes(user._id);

  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const socketRef = useRef(null);

  // Join this article's socket room when comments are opened
  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('article:joinRoom', { articleId: post._id });

    socket.on('comment:new', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [post._id]);

  const handleToggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const res = await commentAPI.getForArticle(post._id);
        setComments(res.data.data);
      } catch (err) {
        toast.error('Failed to load comments');
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to comment');
    if (!newComment.trim()) return;
    
    try {
      // The API call triggers the backend to broadcast via socket,
      // so we don't need to manually add here — the socket will deliver it.
      await commentAPI.add(post._id, { text: newComment });
      setNewComment('');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  return (
    <article className="newstag-article" style={{ marginBottom: 24, background: 'transparent' }}>
      <div className="newstag-article-meta">
        <img
          src={post.author?.avatar ? getImageUrl(post.author.avatar) : 'https://placehold.co/40'}
          alt={post.author?.name}
          className="newstag-author-avatar"
        />
        <div>
          <div className="newstag-author-name">By {post.author?.name}</div>
          <div className="newstag-date">
            {post.publishedAt ? format(new Date(post.publishedAt), 'MMM dd, yyyy') : 'Unknown Date'}
          </div>
        </div>
      </div>

      <Link to={`/article/${post.slug}`}>
        <h2 className="newstag-article-title">{post.title}</h2>
        <p className="newstag-article-excerpt">{post.lead}</p>
      </Link>

      {post.coverImage && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <img src={getImageUrl(post.coverImage)} alt={post.title} style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 8 }} />
        </div>
      )}

      <div className="newstag-actions" style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 16 }}>
        <button className={`newstag-btn ${hasLiked ? 'hype' : ''}`} onClick={() => onReaction(post._id, 'like')}>
          <BiHeart size={18} /> {hasLiked ? 'Hyped' : 'Hype'} ({post.likes?.length || 0})
        </button>
        <button className="newstag-btn">
          <BiTime size={18} /> Wait
        </button>
        <button className="newstag-btn" onClick={handleToggleComments} style={{ color: showComments ? 'var(--color-red)' : 'inherit' }}>
          <BiComment size={18} /> {showComments ? 'Hide Comments' : 'Comment'}
        </button>
        <button className="newstag-btn">
          <BiShareAlt size={18} /> Share
        </button>
        {user && user.role === 'admin' && (
          <button className="newstag-btn delete-btn" onClick={() => onDelete(post._id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--color-red, #c8102e)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
            <BiTrash size={18} /> Delete
          </button>
        )}
      </div>

      {/* Inline Comments Section */}
      {showComments && (
        <div style={{ marginTop: 20, padding: '16px', background: 'var(--color-gray-100)', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <img src={user?.avatar ? getImageUrl(user.avatar) : 'https://placehold.co/30'} alt="Me" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <input 
              type="text" 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add comments..."
              style={{ flex: 1, background: 'var(--color-white)', border: '1px solid var(--color-gray-300)', padding: '8px 14px', color: 'var(--color-black)', borderRadius: 20, outline: 'none', fontSize: 13 }}
            />
            <button type="submit" style={{ padding: '0 16px', background: 'var(--color-red)', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, cursor: 'pointer' }}>
              Reply
            </button>
          </form>

          <div>
            <h5 style={{ fontSize: 11, color: 'var(--color-gray-500)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Recent Comments</h5>
            {loadingComments ? (
              <span style={{ fontSize: 13, color: 'var(--color-gray-500)' }}>Loading comments...</span>
            ) : comments.length === 0 ? (
              <span style={{ fontSize: 13, color: 'var(--color-gray-500)', fontStyle: 'italic' }}>No comments yet.</span>
            ) : (() => {
              const LIMIT = 5;
              const showAll = comments.length <= LIMIT || showAllComments;
              const visibleComments = showAll ? comments : comments.slice(0, LIMIT);

              return (
                <>
                  <div style={{ position: 'relative' }}>
                    {visibleComments.map(c => (
                      <div key={c._id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <img src={c.author?.avatar ? getImageUrl(c.author.avatar) : 'https://placehold.co/30'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)' }}>{c.author?.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--color-gray-500)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: 14, margin: 0, color: 'var(--color-gray-700)', lineHeight: 1.4 }}>{c.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Fog/gradient overlay — fades to current theme bg color */}
                    {!showAll && comments.length > LIMIT && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 80,
                        background: 'linear-gradient(to bottom, transparent, var(--color-gray-100))',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>

                  {/* Show More button */}
                  {!showAll && comments.length > LIMIT && (
                    <button
                      onClick={() => setShowAllComments(true)}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: 4,
                        padding: '8px 0',
                        background: 'transparent',
                        border: '1px solid var(--color-gray-300)',
                        color: 'var(--color-gray-600)',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: 0.5,
                      }}
                    >
                      Show {comments.length - LIMIT} more comment{comments.length - LIMIT > 1 ? 's' : ''}
                    </button>
                  )}
                  {showAll && comments.length > LIMIT && (
                    <button
                      onClick={() => setShowAllComments(false)}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: 8,
                        padding: '8px 0',
                        background: 'transparent',
                        border: '1px solid var(--color-gray-200)',
                        color: 'var(--color-gray-500)',
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Show less
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </article>
  );
};

export default TeaShopPage;
