import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { articleAPI, chatAPI, commentAPI } from '../services/api';
import { getImageUrl } from '../components/ArticleComponents';
import { FiHome, FiPlus, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiShare2, FiSend, FiX, FiHeart } from 'react-icons/fi';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

const GenericCategoryPage = ({ category, title: displayTitle }) => {
  const { user, isEditor } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(true);
  const [globalTrendingPosts, setGlobalTrendingPosts] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);

  // Tab state: 'home' | 'create' | 'chat'
  const [activeTab, setActiveTab] = useState('home');

  // Form State (Create)
  const [title, setTitle] = useState('');
  const [lead, setLead] = useState('');
  const [body, setBody] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Chat State
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Load Posts & Chat History whenever category changes
  useEffect(() => {
    setPostsLoading(true);
    setChatLoading(true);
    setGlobalLoading(true);
    setActiveTab('home');

    // Fetch category posts
    articleAPI.getAll({ category, status: 'published', limit: 40 })
      .then((res) => setPosts(res.data.data))
      .catch((err) => console.error('Failed to load posts:', err))
      .finally(() => setPostsLoading(false));

    // Fetch category-specific chat messages
    chatAPI.getMessages({ category })
      .then((res) => {
        setChatMessages(res.data.data);
        scrollToBottom();
      })
      .catch((err) => console.error('Failed to load chat history:', err))
      .finally(() => setChatLoading(false));

    // Fetch global trending posts across all categories
    articleAPI.getTrending()
      .then((res) => setGlobalTrendingPosts(res.data.data.slice(0, 10)))
      .catch((err) => console.error('Failed to load global trending posts:', err))
      .finally(() => setGlobalLoading(false));

    // Socket.io Connection
    socketRef.current = io(SOCKET_URL, { withCredentials: true });

    socketRef.current.on('chat:message', (message) => {
      // Only append if the chat message matches this category
      if (message.category === category) {
        setChatMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [category]);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Scroll chat when switching tabs
  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [activeTab]);

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Post Submission
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!title || !lead || !body) {
      return toast.error('Please fill in all fields');
    }

    setSubmittingPost(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('lead', lead);
    formData.append('body', body);
    formData.append('category', category);
    formData.append('status', 'published');
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    try {
      const res = await articleAPI.create(formData);
      setPosts((prev) => [res.data.data, ...prev]);
      toast.success('Article published successfully!');
      
      // Reset form
      setTitle('');
      setLead('');
      setBody('');
      setCoverImage(null);
      setImagePreview(null);
      
      // Switch back to home tab
      setActiveTab('home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish post');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Chat message send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await chatAPI.sendMessage({ text: newMessage.trim(), category });
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Likes & Dislikes Reactions
  const handleReaction = async (id, type) => {
    if (!user) {
      return toast.error('Please log in to react to posts');
    }

    try {
      let res;
      if (type === 'like') {
        res = await articleAPI.like(id);
      } else {
        res = await articleAPI.dislike(id);
      }

      setPosts((prev) =>
        prev.map((post) =>
          post._id === id
            ? { ...post, likes: res.data.likes, dislikes: res.data.dislikes }
            : post
        )
      );
    } catch (err) {
      toast.error('Failed to register reaction');
    }
  };

  // Share
  const handleShare = async (post) => {
    try {
      await articleAPI.share(post._id);
      setPosts((prev) =>
        prev.map((p) => (p._id === post._id ? { ...p, shares: p.shares + 1 } : p))
      );

      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.lead,
          url: `${window.location.origin}/article/${post.slug}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/article/${post.slug}`);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mostly Talked sorting: Likes + Shares (descending)
  const mostlyTalkedPosts = [...posts].sort((a, b) => {
    const aEngagement = (a.likes?.length || 0) + (a.shares || 0);
    const bEngagement = (b.likes?.length || 0) + (b.shares || 0);
    return bEngagement - aEngagement;
  });

  // Role Gate: only editors/admins can publish in news/editorial/features, etc.
  // Student can write in tea-shop only.
  const canPost = category === 'tea-shop' ? !!user : (user && isEditor);

  return (
    <div className="tea-shop-mockup-wrapper">
      
      {/* Mockup Header Row */}
      <header className="tea-shop-mockup-header">
        <button
          className="mockup-close-btn"
          onClick={() => navigate('/')}
          aria-label="Close and return to Home"
        >
          <FiX size={24} />
        </button>
        <span className="mockup-header-title">{displayTitle}</span>
      </header>

      {/* Content wrapper */}
      <div className="tea-shop-mockup-content">
        
        {/* TAB 1: SPLIT COLUMN BOARD LAYOUT */}
        {activeTab === 'home' && (
          <div className="mockup-split-three-grid">
            
            {/* PANEL 1: HOME (CATEGORY NAME) */}
            <div className="mockup-panel">
              <span className="mockup-panel-label">Home ({displayTitle})</span>
              
              <div className="mockup-panel-content">
                {postsLoading ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                ) : posts.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-gray-500)', textAlign: 'center', margin: 'auto' }}>
                    No posts shared in this category yet.
                  </p>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      user={user}
                      onReaction={handleReaction}
                      onShare={handleShare}
                    />
                  ))
                )}
              </div>
            </div>

            {/* PANEL 2: TRENDING */}
            <div className="mockup-panel">
              <span className="mockup-panel-label">Trending</span>
              
              <div className="mockup-panel-content">
                {postsLoading ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                ) : mostlyTalkedPosts.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-gray-500)', textAlign: 'center', margin: 'auto' }}>
                    No popular posts in this category yet.
                  </p>
                ) : (
                  mostlyTalkedPosts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      user={user}
                      onReaction={handleReaction}
                      onShare={handleShare}
                    />
                  ))
                )}
              </div>
            </div>

            {/* PANEL 3: TRENDS IN ALL CATEGORY */}
            <div className="mockup-panel">
              <span className="mockup-panel-label">Trends in all Category</span>
              
              <div className="mockup-panel-content">
                {globalLoading ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                ) : globalTrendingPosts.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-gray-500)', textAlign: 'center', margin: 'auto' }}>
                    No global trending posts yet.
                  </p>
                ) : (
                  globalTrendingPosts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      user={user}
                      onReaction={handleReaction}
                      onShare={handleShare}
                    />
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: POST CREATION (PLUS ICON ACTIVE) */}
        {activeTab === 'create' && canPost && (
          <div className="instagram-create-container" style={{ height: '100%', overflowY: 'auto' }}>
            <div className="instagram-create-card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
                Publish to {displayTitle}
              </h2>
              
              <form onSubmit={handlePostSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Article Title</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter article title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Lead Summary</label>
                  <textarea
                    className="auth-input"
                    rows={2}
                    placeholder="A short summary of what this is about..."
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Body content (HTML supported)</label>
                  <textarea
                    className="auth-input"
                    rows={4}
                    placeholder="Write details of the article..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Cover Image</label>
                  <div
                    className="instagram-upload-box"
                    onClick={() => document.getElementById(`image-file-${category}`).click()}
                    style={{ padding: '20px 32px' }}
                  >
                    <FiPlus size={24} style={{ color: 'var(--color-gray-500)', marginBottom: 4 }} />
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gray-600)' }}>
                      {coverImage ? 'Change Selected Image' : 'Select Image from files'}
                    </p>
                    <input
                      id={`image-file-${category}`}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="instagram-upload-preview" style={{ maxHeight: 180 }} />
                    )}
                  </div>
                </div>

                <button type="submit" className="btn-submit" style={{ width: '100%' }} disabled={submittingPost}>
                  {submittingPost ? 'Publishing...' : `Publish to ${displayTitle}`}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: CHALKBOARD CATEGORY CHAT */}
        {activeTab === 'chat' && (
          <div className="instagram-chat-console" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="instagram-chat-header">
              💬 {displayTitle} Chalkboard chat room
            </div>
            
            <div className="instagram-chat-scroll-area" style={{ flexGrow: 1, height: 'auto' }}>
              {chatLoading ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13 }}>
                  Fresh chalkboard. Write down your thoughts!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = user && msg.user?._id === user._id;
                  return (
                    <div key={msg._id} className={`instagram-chat-message ${isMe ? 'me' : ''}`}>
                      <img
                        src={msg.user?.avatar ? getImageUrl(msg.user.avatar) : 'https://placehold.co/30'}
                        alt={msg.user?.name}
                        className="chat-avatar-small"
                      />
                      <div className="chat-bubble-body">
                        <span className="chat-sender-info">
                          {msg.user?.name} <span style={{ opacity: 0.7, fontSize: 9 }}>({msg.user?.role})</span>
                        </span>
                        <div className="chat-bubble-text">
                          {msg.text}
                        </div>
                        <span className="chat-message-time" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            {user ? (
              <form className="instagram-chat-input-bar" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="instagram-chat-input"
                  placeholder="Write on the board..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sendingMessage}
                />
                <button type="submit" className="instagram-chat-send" disabled={sendingMessage || !newMessage.trim()}>
                  <FiSend />
                </button>
              </form>
            ) : (
              <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', color: '#fff', textAlign: 'center', fontSize: 12 }}>
                <Link to="/login" style={{ color: '#fbf0b9', textDecoration: 'underline', fontWeight: 700 }}>Log in</Link> to write on the chat room.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating bottom capsule menu */}
      <nav className="tea-shop-floating-capsule" aria-label="Floating Navigation Menu">
        <button
          className={`floating-capsule-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
          title="Home Panels"
        >
          <FiHome size={22} />
        </button>
        {canPost && (
          <button
            className={`floating-capsule-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            title="Create Post"
          >
            <FiPlus size={24} />
          </button>
        )}
        <button
          className={`floating-capsule-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          title="Chalkboard Chat Room"
        >
          <FiMessageSquare size={22} />
        </button>
      </nav>

    </div>
  );
};

// Reusable PostCard Component for Panels
const PostCard = ({ post, user, onReaction, onShare }) => {
  const hasLiked = user && post.likes?.includes(user._id);
  const hasDisliked = user && post.dislikes?.includes(user._id);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const toggleComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    setShowComments(true);
    setCommentsLoading(true);
    try {
      const res = await commentAPI.getForArticle(post._id);
      // Sort descending (newest first) and take the recent 5
      const sorted = (res.data.data || res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComments(sorted.slice(0, 5));
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) {
      return toast.error('Please log in to submit a comment');
    }
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      await commentAPI.add(post._id, { text: newCommentText.trim() });
      toast.success('Comment submitted! Note: Comments require approval before appearing publicly.');
      setNewCommentText('');
      
      // Reload comments list to show the new comment
      const updatedRes = await commentAPI.getForArticle(post._id);
      const sorted = (updatedRes.data.data || updatedRes.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComments(sorted.slice(0, 5));
    } catch (err) {
      toast.error('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <article className="mockup-card-foggy">
      {/* 1. Image first (if present) */}
      {post.coverImage && (
        <div className="mockup-card-foggy-img-container">
          <img
            src={getImageUrl(post.coverImage)}
            alt={post.title}
          />
        </div>
      )}

      {/* Author and Date Meta */}
      <div className="mockup-card-foggy-meta">
        <img
          src={post.author?.avatar ? getImageUrl(post.author.avatar) : 'https://placehold.co/24'}
          alt={post.author?.name}
          style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
        />
        <span>By <strong>{post.author?.name}</strong> • {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
      </div>

      {/* 2. First row title */}
      <h3 className="mockup-card-foggy-title">
        <Link to={`/article/${post.slug}`} style={{ color: 'var(--color-black)' }}>{post.title}</Link>
      </h3>

      {/* 3. Next row: sub description with eclips fog style */}
      <div className="mockup-card-foggy-desc-container">
        <p className="mockup-card-foggy-desc">{post.lead}</p>
        <div className="mockup-card-foggy-overlay" />
      </div>

      <div className="rule" style={{ margin: '4px 0' }} />

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: 12 }}>
        <button
          onClick={() => onReaction(post._id, 'like')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: hasLiked ? 'var(--color-red)' : 'inherit',
            fontWeight: hasLiked ? '700' : 'normal'
          }}
        >
          <FiHeart size={14} fill={hasLiked ? 'var(--color-red)' : 'none'} />
          <span>{post.likes?.length || 0}</span>
        </button>
        <button
          onClick={() => onReaction(post._id, 'dislike')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: hasDisliked ? 'var(--color-red)' : 'inherit',
            fontWeight: hasDisliked ? '700' : 'normal'
          }}
        >
          <FiThumbsDown size={14} />
          <span>{post.dislikes?.length || 0}</span>
        </button>
        <button
          onClick={toggleComments}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: showComments ? 'var(--color-red)' : 'inherit',
            fontWeight: showComments ? '700' : 'normal'
          }}
        >
          <FiMessageSquare size={14} />
          <span>Comments</span>
        </button>
        <button
          onClick={() => onShare(post)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <FiShare2 size={14} />
        </button>
      </div>

      {/* Inline Comments Section */}
      {showComments && (
        <div className="mockup-comments-dropdown">
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recent Comments (Recent 5)</span>
            <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-gray-500)' }}>✕</button>
          </h4>
          
          <div className="mockup-comments-list">
            {commentsLoading ? (
              <p style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-gray-500)', textAlign: 'center', margin: '12px 0' }}>Loading comments...</p>
            ) : comments.length === 0 ? (
              <p style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-gray-500)', textAlign: 'center', margin: '12px 0' }}>No approved comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c._id} className="mockup-comment-item">
                  <img
                    src={c.author?.avatar ? getImageUrl(c.author.avatar) : 'https://placehold.co/24'}
                    alt={c.author?.name}
                    className="mockup-comment-avatar"
                  />
                  <div className="mockup-comment-content">
                    <span className="mockup-comment-author">{c.author?.name}</span>
                    <span className="mockup-comment-text">{c.text}</span>
                    <span className="mockup-comment-time">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <form className="mockup-comment-form" onSubmit={handlePostComment}>
            <input
              type="text"
              placeholder="Write a comment..."
              className="mockup-comment-input"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              disabled={submittingComment}
              required
            />
            <button
              type="submit"
              className="mockup-comment-submit"
              disabled={submittingComment || !newCommentText.trim()}
            >
              {submittingComment ? '...' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </article>
  );
};

export default GenericCategoryPage;
