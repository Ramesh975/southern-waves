import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { chatAPI, filterAPI } from '../../services/api';
import { FiX, FiSend, FiSearch, FiPlus, FiSmile, FiEdit2, FiCornerUpLeft, FiArrowLeft, FiTag, FiHash, FiVolume2, FiAlertCircle, FiLock, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './MessageApp.css';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:5000';
  return `${baseUrl}${path}`;
};

const getCategoryLabel = (cat) => {
  if (!cat) return 'News';
  const mapping = {
    'news': 'News',
    'editorial': 'Editorial',
    'features': 'Features',
    'kyp': 'Know Our Past',
    'tea-shop': 'Tea Shop',
    'pictures-speak': 'Pictures Speak'
  };
  return mapping[cat] || cat.toUpperCase();
};

const MessageApp = ({ isFullPage = false }) => {
  const { user, isBlocked, refreshUser, isEditor, isAdmin, isModerator } = useAuth();
  const {
    socket,
    rooms,
    replies,
    activeRoom,
    setActiveRoom,
    isOpen,
    setIsOpen,
    joinRoom,
    leaveRoom,
    markRoomAsRead,
    openRoom,
    activeTab,
    setActiveTab,
    replyToArticle,
    setReplyToArticle,
    setHighlightArticleId,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useChat();

  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryRoom = searchParams.get('room');

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  
  // Chat Detail Room State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null); // Message object being replied to
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const [activeReactionMenu, setActiveReactionMenu] = useState(null); // messageId
  const [globalChatLock, setGlobalChatLock] = useState(false);

  useEffect(() => {
    filterAPI.getSettings()
      .then((res) => {
        if (res.data?.success) {
          setGlobalChatLock(res.data.data.globalChatLock || false);
        }
      })
      .catch((err) => console.error('Failed to load system settings in chat:', err));
  }, []);
  const [previewArticle, setPreviewArticle] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null); // scroll container ref
  const sentinelRef = useRef(null);     // top-of-list intersection target
  const oldestIdRef = useRef(null);     // _id of oldest loaded message (cursor)
  const chatListRef = useRef(null);

  // Handle URL Query Parameters for full page mode
  useEffect(() => {
    if (isFullPage && queryRoom) {
      const [type, name] = queryRoom.split(':');
      if (type && name) {
        openRoom(type, name);
      }
    }
  }, [queryRoom, isFullPage]);

  // Load messages whenever active room changes
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const roomKey = activeRoom.roomKey;
    
    // Join Socket Room
    joinRoom(roomKey);
    fetchRoomMessages();

    // Listen to real-time events for the active room
    if (socket) {
      socket.on('chat:message', handleIncomingMessage);
      socket.on('chat:messageEdited', handleIncomingEdit);
      socket.on('chat:messageReacted', handleIncomingReaction);
      socket.on('chat:messageDeleted', handleIncomingDeletion);
    }

    return () => {
      // Leave Socket Room
      leaveRoom(roomKey);
      if (socket) {
        socket.off('chat:message', handleIncomingMessage);
        socket.off('chat:messageEdited', handleIncomingEdit);
        socket.off('chat:messageReacted', handleIncomingReaction);
        socket.off('chat:messageDeleted', handleIncomingDeletion);
      }
    };
  }, [activeRoom, socket]);

  const handleIncomingMessage = (msg) => {
    // Verify message matches active room
    const isTagMsg = msg.tags && msg.tags.length > 0;
    const activeIsTag = activeRoom?.type === 'tag';
    const incomingWithAnim = { ...msg, isNew: true };

    if (activeIsTag && isTagMsg && msg.tags.includes(activeRoom.name)) {
      setMessages((prev) => [...prev.filter((m) => m._id !== msg.tempId && m._id !== msg._id), incomingWithAnim]);
      scrollToBottom();
    } else if (!activeIsTag && !isTagMsg && msg.category === activeRoom?.name) {
      setMessages((prev) => [...prev.filter((m) => m._id !== msg.tempId && m._id !== msg._id), incomingWithAnim]);
      scrollToBottom();
    }
  };

  const handleIncomingEdit = (updatedMsg) => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
    );
  };

  const handleIncomingReaction = (updatedMsg) => {
    setMessages((prev) =>
      prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
    );
  };

  const handleIncomingDeletion = (data) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== data._id));
  };

  const fetchRoomMessages = async () => {
    setLoadingMessages(true);
    setHasMore(false);
    oldestIdRef.current = null;
    try {
      const params = {};
      if (activeRoom.type === 'tag') {
        params.tag = activeRoom.name;
      } else {
        params.category = activeRoom.name;
      }
      const res = await chatAPI.getMessages(params);
      const fetched = res.data.data || [];
      setMessages(fetched);
      setHasMore(res.data.hasMore || false);
      if (fetched.length > 0) oldestIdRef.current = fetched[0]._id;
      // Snap to bottom immediately after first paint
      requestAnimationFrame(() => {
        if (messagesListRef.current) {
          messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
        }
      });
    } catch (err) {
      console.error('Failed to load messages for room:', err);
      toast.error('Failed to load chat history');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load older messages (scroll-up pagination) while preserving scroll position
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore || !oldestIdRef.current) return;
    setIsLoadingMore(true);
    const list = messagesListRef.current;
    const prevScrollHeight = list ? list.scrollHeight : 0;
    try {
      const params = { before: oldestIdRef.current };
      if (activeRoom.type === 'tag') {
        params.tag = activeRoom.name;
      } else {
        params.category = activeRoom.name;
      }
      const res = await chatAPI.getMessages(params);
      const older = res.data.data || [];
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
        oldestIdRef.current = older[0]._id;
        // Restore scroll position so the view doesn't jump
        requestAnimationFrame(() => {
          if (list) {
            list.scrollTop = list.scrollHeight - prevScrollHeight;
          }
        });
      }
      setHasMore(res.data.hasMore || false);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, activeRoom]);

  // IntersectionObserver — fires loadOlderMessages when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadOlderMessages(); },
      { root: messagesListRef.current, rootMargin: '60px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlderMessages]);

  const scrollToBottom = () => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  };

  // Optimistic Message Sending (Latency reduction)
  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const isChatModerator = user?.role === 'admin' || user?.role === 'moderator';
    if (globalChatLock && !isChatModerator) {
      return toast.error('Chat is temporarily locked.');
    }
    if (replyToArticle?.chatDisabled && !isChatModerator) {
      return toast.error('Chat is disabled for this article.');
    }

    const messageText = newMessage.trim();
    const tempId = `optimistic-${Date.now()}`;
    
    // Create optimistic message object
    const optimisticMsg = {
      _id: tempId,
      tempId: tempId,
      text: messageText,
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      },
      category: activeRoom.type === 'group' ? activeRoom.name : 'tea-shop',
      tags: activeRoom.type === 'tag' ? [activeRoom.name] : [],
      isBroadcast: isBroadcast,
      parentMessage: replyToMessage ? {
        _id: replyToMessage._id,
        text: replyToMessage.text,
        user: { name: replyToMessage.user.name }
      } : null,
      reactions: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true // UI indicator flag
    };

    // Append optimistically to list
    setMessages((prev) => [...prev, { ...optimisticMsg, isNew: true }]);
    setNewMessage('');
    setIsBroadcast(false);
    setReplyToMessage(null);
    scrollToBottom();

    try {
      // API call to persist message
      const payload = {
        text: messageText,
        category: activeRoom.type === 'group' ? activeRoom.name : 'tea-shop',
        tags: activeRoom.type === 'tag' ? [activeRoom.name] : [],
        isBroadcast: optimisticMsg.isBroadcast,
        parentMessageId: replyToMessage?._id || null,
        parentArticleId: replyToArticle?._id || null,
        tempId: tempId
      };

      setReplyToArticle(null);
      const res = await chatAPI.sendMessage(payload);
      
      // Update message list by replacing optimistic message with server-saved message
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? res.data.data : msg))
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));

      // Handle filter block response
      if (err.response?.data?.blocked) {
        toast.error(
          '⚠️ Your message was flagged and your account has been temporarily suspended.',
          { duration: 5000, style: { background: '#fef3c7', color: '#92400e', border: '2px solid #f59e0b' } }
        );
        // Refresh user so isBlocked state updates, which will show the BlockedAccountScreen
        await refreshUser();
      } else {
        const errorMsg = err.response?.data?.message;
        if (errorMsg === 'Not Allowed Tags') {
          toast.error(
            '⚠️ This message contains tags (#) that are restricted/banned by the administrator.',
            { duration: 5000, style: { background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca' } }
          );
        } else {
          toast.error(errorMsg || 'Failed to send message. Please try again.');
        }
      }
    }
  };

  // Reactions
  const handleReaction = async (messageId, emoji) => {
    try {
      // Optimistic reaction toggle
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const hasReacted = msg.reactions?.some(r => r.user?._id === user._id && r.emoji === emoji);
            const newReactions = hasReacted
              ? msg.reactions.filter(r => !(r.user?._id === user._id && r.emoji === emoji))
              : [...(msg.reactions || []), { user: { _id: user._id, name: user.name }, emoji }];
            return { ...msg, reactions: newReactions };
          }
          return msg;
        })
      );
      setActiveReactionMenu(null);
      
      await chatAPI.reactToMessage(messageId, emoji);
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  // Editing Message
  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingId) return;
    const targetId = editingId;
    const text = editText.trim();

    // Optimistic edit
    setMessages((prev) =>
      prev.map((msg) => (msg._id === targetId ? { ...msg, text, isEdited: true } : msg))
    );
    setEditingId(null);
    setEditText('');

    try {
      await chatAPI.editMessage(targetId, { text });
    } catch (err) {
      const errorMsg = err.response?.data?.message;
      if (errorMsg === 'Not Allowed Tags') {
        toast.error(
          '⚠️ This message contains tags (#) that are restricted/banned by the administrator.',
          { duration: 5000, style: { background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca' } }
        );
      } else {
        toast.error(errorMsg || 'Failed to edit message');
      }
      // Re-fetch messages if edit failed to sync database
      fetchRoomMessages();
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this message? This cannot be undone.')) return;
    try {
      await chatAPI.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const checkCanEdit = (msg) => {
    if (!user || msg.user?._id !== user._id || msg.isOptimistic) return false;
    const timeElapsed = Date.now() - new Date(msg.createdAt).getTime();
    return timeElapsed <= 15 * 60 * 1000; // 15 mins window
  };

  // Filtering and sorting rooms (unread first, then recent comments/messages)
  const getSortedAndFilteredRooms = () => {
    let filtered = [];
    if (activeTab === 'groups') {
      filtered = rooms.filter((r) => r.type === 'group');
    } else if (activeTab === 'tags') {
      filtered = rooms.filter((r) => r.type === 'tag');
    } else if (activeTab === 'announcements') {
      filtered = rooms.filter((r) => r.type === 'group');
    } else {
      filtered = rooms;
    }

    return [...filtered].sort((a, b) => {
      // 1. Sort by unreadCount > 0 first
      const aHasUnread = (a.unreadCount || 0) > 0;
      const bHasUnread = (b.unreadCount || 0) > 0;
      if (aHasUnread && !bHasUnread) return -1;
      if (!aHasUnread && bHasUnread) return 1;

      // 2. Sort by last message time descending
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  };

  // Searching categories & tags for floating + button
  const getSearchResults = () => {
    const categories = [
      { type: 'group', name: 'news', display: '📰 News' },
      { type: 'group', name: 'editorial', display: '✍️ Editorial' },
      { type: 'group', name: 'features', display: '🎬 Features' },
      { type: 'group', name: 'know-your-past', display: '📖 Know Your Past' },
      { type: 'group', name: 'tea-shop', display: '☕ Tea Shop' },
      { type: 'group', name: 'pictures-speak', display: '📷 Pictures Speak' }
    ];

    // Get active tags from currently loaded rooms plus trending tags
    const tagRooms = rooms.filter((r) => r.type === 'tag').map((r) => ({
      type: 'tag',
      name: r.name,
      display: `# ${r.name}`
    }));

    // Merge categories and tags
    const allOptions = [...categories, ...tagRooms];

    if (!searchQuery.trim()) {
      return allOptions;
    }

    const query = searchQuery.toLowerCase();
    return allOptions.filter((opt) => opt.name.toLowerCase().includes(query));
  };

  const handleStartSearchChat = (option) => {
    openRoom(option.type, option.name);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleCreateCustomTagChat = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Create new tag room
    openRoom('tag', searchQuery.trim().toLowerCase());
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <>
      {/* Backdrop overlay */}
      {!isFullPage && (
        <div 
          className={`message-app-backdrop ${isOpen ? 'open' : ''}`} 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Drawer / Full Page Layout Container */}
      <div className={`message-app-container ${isFullPage ? 'full-page' : 'drawer'} ${isOpen ? 'open' : ''} ${window.innerWidth <= 768 && !isFullPage ? 'mobile-fullscreen' : ''}`}>
        <div className="msg-app-layout">
          
          {/* COLUMN 1: SIDEBAR (Channel List) */}
          <div className={`msg-sidebar-col ${(!activeRoom || isFullPage) ? 'show' : 'hide'}`}>
            <header className="msg-drawer-header">
              {isFullPage ? (
                <div className="msg-sidebar-branding">
                  <Link to="/" className="msg-logo-link">
                    <span className="msg-logo-text">Southern Waves</span>
                  </Link>
                </div>
              ) : (
                <div className="msg-user-info">
                  <img 
                    src={user?.avatar ? `${SOCKET_URL}${user.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Guest')}&background=0d0d0d&color=fff`} 
                    alt={user?.name || 'Guest'} 
                    className="msg-user-avatar" 
                  />
                  <span className="msg-user-name">{user?.name || 'Not Logged In'}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isFullPage && (
                  <>
                    <button 
                      className="msg-close-btn msg-maximize-btn" 
                      onClick={() => {
                        navigate('/chat');
                        setIsOpen(false);
                      }}
                      title="Open full-screen discussion page"
                    >
                      <FiCornerUpLeft size={18} style={{ transform: 'rotate(135deg)' }} />
                    </button>
                    <button className="msg-close-btn" onClick={() => setIsOpen(false)}>
                      <FiX size={24} />
                    </button>
                  </>
                )}
                {isFullPage && (
                  <button 
                    className="msg-close-btn msg-back-home-btn" 
                    onClick={() => navigate('/news')}
                    title="Back to Home Feed"
                  >
                    <FiArrowLeft size={22} />
                    <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 4, marginRight: 8 }}>Home</span>
                  </button>
                )}
              </div>
            </header>

            {/* Navigation Category Tabs */}
            <nav 
              className="msg-nav-pills"
              onWheel={(e) => {
                const container = e.currentTarget;
                if (e.deltaY !== 0) {
                  e.preventDefault();
                  container.scrollLeft += e.deltaY;
                }
              }}
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'board_alerts', label: unreadNotificationsCount > 0 ? `Alerts (${unreadNotificationsCount})` : 'Alerts' },
                { id: 'groups', label: 'Groups' },
                { id: 'tags', label: 'Tags' },
                { id: 'announcements', label: 'Announcements' },
                { id: 'replies', label: 'Replies' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`msg-pill ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* List Content */}
            <div className="msg-rooms-list" ref={chatListRef}>
              
              {/* BOARD ALERTS TAB */}
              {activeTab === 'board_alerts' ? (
                notifications.length === 0 ? (
                  <div className="msg-empty">No board alerts found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-500)' }}>University Alerts</span>
                      {notifications.some(n => !n.isRead) && (
                        <button 
                          onClick={markAllNotificationsRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-color)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            textTransform: 'uppercase'
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.map((n) => {
                      const isExpanded = expandedAlertId === n._id;
                      const getTypeStyle = (type, isRead) => {
                        if (type === 'sensitivity') {
                          return {
                            borderLeft: '4px solid #c8102e',
                            background: isRead ? 'rgba(200, 16, 46, 0.02)' : 'rgba(200, 16, 46, 0.06)'
                          };
                        }
                        if (type === 'board_news') {
                          return {
                            borderLeft: '4px solid var(--accent-color)',
                            background: isRead ? 'transparent' : 'rgba(0, 122, 255, 0.04)'
                          };
                        }
                        return {
                          borderLeft: '4px solid #4b5563',
                          background: isRead ? 'transparent' : 'rgba(75, 85, 99, 0.04)'
                        };
                      };
                      return (
                        <div
                          key={n._id}
                          onClick={() => {
                            setExpandedAlertId(isExpanded ? null : n._id);
                            if (!n.isRead) markNotificationRead(n._id);
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid var(--color-black)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            textAlign: 'left',
                            ...getTypeStyle(n.type, n.isRead)
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: n.type === 'sensitivity' ? '#fee2e2' : n.type === 'board_news' ? '#e0f2fe' : '#f3f4f6',
                              color: n.type === 'sensitivity' ? '#991b1b' : n.type === 'board_news' ? '#0369a1' : '#374151'
                            }}>
                              {n.type === 'sensitivity' ? 'Critical Alert' : n.type === 'board_news' ? 'Board News' : 'Announcement'}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                              {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ fontWeight: n.isRead ? 600 : 800, fontSize: '12px', color: 'var(--color-black)' }}>
                            {n.title}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--color-gray-600)',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebKitLineClamp: isExpanded ? 'initial' : 2,
                            WebKitBoxOrient: 'vertical'
                          }}>
                            {n.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : activeTab === 'replies' ? (
                replies.length === 0 ? (
                  <div className="msg-empty">No message replies found.</div>
                ) : (
                  replies.map((reply) => (
                    <div 
                      key={reply._id} 
                      className="msg-room-item"
                      onClick={() => {
                        const isTag = reply.tags && reply.tags.length > 0;
                        openRoom(isTag ? 'tag' : 'group', isTag ? reply.tags[0] : reply.category);
                      }}
                    >
                      <div className="msg-room-avatar tag-avatar">@</div>
                      <div className="msg-room-details">
                        <div className="msg-room-top">
                          <span className="msg-room-name">Reply from {reply.user?.name}</span>
                          <span className="msg-room-time">
                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="msg-room-bottom">
                          <span className="msg-room-lasttext">{reply.text}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : activeTab === 'announcements' ? (
                /* ANNOUNCEMENTS TAB - show messages tagged as broadcast */
                rooms.filter(r => r.type === 'group').length === 0 ? (
                  <div className="msg-empty">No announcements yet.</div>
                ) : (
                  rooms.filter(r => r.type === 'group').map((room) => (
                    <div 
                      key={room.roomKey} 
                      className="msg-room-item"
                      onClick={() => openRoom(room.type, room.name)}
                    >
                      <div className="msg-room-avatar"><FiVolume2 size={16} /></div>
                      <div className="msg-room-details">
                        <div className="msg-room-top">
                          <span className="msg-room-name">{room.name} announcements</span>
                          {room.lastMessage && (
                            <span className="msg-room-time">
                              {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="msg-room-bottom">
                          <span className="msg-room-lasttext">
                            {room.lastMessage ? `${room.lastMessage.user}: ${room.lastMessage.text}` : 'No announcements published.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* ROOMS (GROUPS & TAGS) */
                getSortedAndFilteredRooms().length === 0 ? (
                  <div className="msg-empty">
                    No active chats here. Click the "+" button below to search and open one!
                  </div>
                ) : (
                  getSortedAndFilteredRooms().map((room) => (
                    <div 
                      key={room.roomKey} 
                      className={`msg-room-item ${activeRoom?.roomKey === room.roomKey ? 'active' : ''}`} 
                      onClick={() => openRoom(room.type, room.name)}
                    >
                      <div className={`msg-room-avatar ${room.type === 'tag' ? 'tag-avatar' : ''}`}>
                        {room.type === 'tag' ? <FiHash size={16} /> : room.name.charAt(0)}
                      </div>
                      
                      <div className="msg-room-details">
                        <div className="msg-room-top">
                          <span className="msg-room-name">{room.name}</span>
                          {room.lastMessage && (
                            <span className="msg-room-time">
                              {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        
                        <div className="msg-room-bottom">
                          <span className="msg-room-lasttext">
                            {room.lastMessage ? `${room.lastMessage.user}: ${room.lastMessage.text}` : 'No messages yet. Start the chat!'}
                          </span>
                          {room.unreadCount > 0 && (
                            <span className="msg-unread-badge">{room.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Circular Floating Plus Button */}
            {user && (
              <button className="msg-plus-btn" onClick={() => setShowSearch(true)} title="Find or create chat tag">
                <FiPlus size={24} />
              </button>
            )}
          </div>

          {/* COLUMN 2: CHAT AREA (Detail View or Placeholder Greeting) */}
          <div className={`msg-detail-col ${(activeRoom || isFullPage) ? 'show' : 'hide'}`}>
            {activeRoom ? (
              <div className="msg-detail-view-inner">
                <header className="msg-detail-header">
                  <button className="msg-detail-back" onClick={() => setActiveRoom(null)}>
                    <FiArrowLeft size={22} />
                  </button>
                  <div className="msg-detail-title-box">
                    <h3 className="msg-detail-title">
                      {activeRoom.type === 'tag' ? '#' : ''}{activeRoom.name}
                    </h3>
                    <span className="msg-detail-subtitle">
                      {activeRoom.type === 'tag' ? 'Hashtag Channel' : 'Category Discussion Group'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isFullPage ? (
                      <>
                        <button 
                          className="msg-close-btn msg-maximize-btn" 
                          onClick={() => {
                            const roomParam = activeRoom.type === 'tag' ? `tag:${activeRoom.name}` : `category:${activeRoom.name}`;
                            navigate(`/chat?room=${roomParam}`);
                            setIsOpen(false);
                          }}
                          title="Open full-screen discussion page"
                        >
                          <FiCornerUpLeft size={18} style={{ transform: 'rotate(135deg)' }} />
                        </button>
                        <button 
                          className="msg-close-btn" 
                          onClick={() => setIsOpen(false)}
                          title="Close discussion board"
                        >
                          <FiX size={24} />
                        </button>
                      </>
                    ) : (
                      <button 
                        className="msg-close-btn" 
                        onClick={() => setActiveRoom(null)}
                        title="Close chatroom"
                      >
                        <FiX size={24} />
                      </button>
                    )}
                  </div>
                </header>

                {/* Message Stream */}
                <div className="msg-messages-list" ref={messagesListRef}>
                  {/* Sentinel at the very top triggers loading older messages */}
                  {hasMore && (
                    <div ref={sentinelRef} className="msg-load-more-sentinel">
                      {isLoadingMore && (
                        <div className="msg-load-more-spinner">
                          <div className="msg-load-more-dot" />
                          <div className="msg-load-more-dot" />
                          <div className="msg-load-more-dot" />
                        </div>
                      )}
                    </div>
                  )}
                  {loadingMessages ? (
                    <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div className="spinner" style={{ width: 30, height: 30 }} />
                      <span style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="msg-empty" style={{ margin: 'auto' }}>
                      No messages here yet.<br />Be the first to speak in #{activeRoom.name}!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = user && msg.user?._id === user._id;
                      const isBeingEdited = editingId === msg._id;

                      return (
                        <div key={msg._id} style={{ display: 'flex', flexDirection: 'column' }} className={msg.isNew ? 'msg-new-entry' : ''}>
                          {msg.isBroadcast && (
                            <span className="msg-broadcast-badge">Broadcast Announcement</span>
                          )}
                          
                          <div className={`msg-bubble-wrapper ${isMe ? 'me' : ''} ${msg.isNew ? 'msg-bubble--new' : ''}`}>
                            {!isMe && (
                              <img 
                                src={msg.user?.avatar ? `${SOCKET_URL}${msg.user.avatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user?.name || 'User')}&background=random&color=fff`} 
                                alt={msg.user?.name} 
                                className="msg-bubble-avatar"
                              />
                            )}

                            <div className="msg-bubble-inner">
                              {!isMe && (
                                <span className="msg-bubble-sender">
                                  {msg.user?.name} {msg.user?.role ? `(${msg.user.role})` : ''}
                                </span>
                              )}

                              <div className="msg-bubble-content">
                                {/* Render parent article if this is a news reply */}
                                {msg.parentArticle && (
                                  <button
                                    className="msg-parent-article-badge"
                                    onClick={() => setPreviewArticle(msg.parentArticle)}
                                    title="View this article details"
                                  >
                                    <span className="msg-parent-article-icon">📰</span>
                                    <span className="msg-parent-article-text">
                                      <span className="msg-parent-article-label">Reply to {getCategoryLabel(msg.parentArticle.category)}:</span>
                                      <span className="msg-parent-article-title">{msg.parentArticle.title}</span>
                                    </span>
                                    <span className="msg-parent-article-arrow">→</span>
                                  </button>
                                )}

                                {/* Render parent message if this is a reply */}
                                {msg.parentMessage && (
                                  <div className="msg-parent-in-bubble">
                                    <strong>@{msg.parentMessage.user?.name || 'User'}:</strong> {msg.parentMessage.text}
                                  </div>
                                )}

                                {isBeingEdited ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <textarea
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      rows={2}
                                      style={{ border: '1px solid var(--color-black)', padding: 4, width: '100%', fontSize: 12, resize: 'none' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                      <button style={{ fontSize: 10, textDecoration: 'underline' }} onClick={() => setEditingId(null)}>Cancel</button>
                                      <button style={{ fontSize: 10, fontWeight: 700 }} onClick={handleSaveEdit}>Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>{msg.text}</div>
                                    
                                    {/* Bubble Actions on Hover */}
                                    {user && !isBeingEdited && (
                                      <div className="msg-bubble-actions">
                                        <button className="msg-action-btn" onClick={() => setReplyToMessage(msg)} title="Reply">
                                          <FiCornerUpLeft size={12} />
                                        </button>
                                        <button className="msg-action-btn" onClick={() => setActiveReactionMenu(msg._id === activeReactionMenu ? null : msg._id)} title="React">
                                          <FiSmile size={12} />
                                        </button>
                                        {checkCanEdit(msg) && (
                                          <button className="msg-action-btn" onClick={() => { setEditingId(msg._id); setEditText(msg.text); }} title="Edit">
                                            <FiEdit2 size={12} />
                                          </button>
                                        )}
                                        {(msg.user?._id === user?._id || msg.user === user?._id || isAdmin || isEditor || isModerator) && (
                                          <button className="msg-action-btn" onClick={() => handleDeleteMessage(msg._id)} title="Delete" style={{ color: '#dc2626' }}>
                                            <FiTrash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Reactions display */}
                                {msg.reactions && msg.reactions.length > 0 && (
                                  <div className="msg-reactions-display">
                                    {Object.entries(
                                      msg.reactions.reduce((acc, r) => {
                                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                        return acc;
                                      }, {})
                                    ).map(([emoji, count]) => (
                                      <div key={emoji} className="msg-reaction-pill" onClick={() => handleReaction(msg._id, emoji)}>
                                        <span>{emoji}</span>
                                        <span>{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Reaction menu picker */}
                                {activeReactionMenu === msg._id && (
                                  <div className="msg-reaction-picker">
                                    {EMOJIS.map((em) => (
                                      <button key={em} className="msg-picker-emoji" onClick={() => handleReaction(msg._id, em)}>
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="msg-bubble-meta">
                                {msg.isEdited && <span className="msg-bubble-edited">edited</span>}
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.isOptimistic && (
                                  <span style={{ color: 'var(--color-gray-400)' }}>• sending...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Preview Bar - Article */}
                {replyToArticle && (
                  <div className="msg-reply-article-bar">
                    <span className="msg-reply-article-icon">📰</span>
                    <div className="msg-reply-article-info">
                      <span className="msg-reply-article-label">Replying to News</span>
                      <span className="msg-reply-article-title">{replyToArticle.title}</span>
                    </div>
                    <button className="msg-reply-preview-cancel" onClick={() => setReplyToArticle(null)}>
                      <FiX size={14} />
                    </button>
                  </div>
                )}

                {/* Reply Preview Bar - Message */}
                {replyToMessage && (
                  <div className="msg-reply-preview-bar">
                    <span className="msg-reply-preview-text">
                      Replying to <strong>@{replyToMessage.user?.name}</strong>: "{replyToMessage.text}"
                    </span>
                    <button className="msg-reply-preview-cancel" onClick={() => setReplyToMessage(null)}>
                      <FiX size={14} />
                    </button>
                  </div>
                )}

                {/* Bottom Input Area */}
                <div className="msg-input-area">
                  {user ? (
                    isBlocked ? (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        color: '#f87171',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <FiLock size={16} style={{ flexShrink: 0 }} />
                        <span style={{ lineHeight: 1.4 }}>
                          <strong>Chat Restricted:</strong> {user.blockedReason || 'Violation of community safety guidelines.'}
                        </span>
                      </div>
                    ) : ((globalChatLock || (replyToArticle && replyToArticle.chatDisabled)) && !(user?.role === 'admin' || user?.role === 'moderator')) ? (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        color: '#ef4444',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <FiLock size={16} style={{ flexShrink: 0 }} />
                        <span style={{ lineHeight: 1.4 }}>
                          {globalChatLock 
                            ? <span><strong>Chat Locked:</strong> Chat is temporarily disabled globally by the administrator.</span>
                            : <span><strong>Chat Locked:</strong> Discussion chat has been disabled for this article.</span>
                          }
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleSendMessage} className="msg-input-form">
                        <div className="msg-input-row">
                          <input 
                            type="text" 
                            placeholder="Write message... Use #tag to hashtag." 
                            className="msg-input-text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                          />
                          <button type="submit" className="msg-send-btn" disabled={!newMessage.trim()}>
                            <FiSend size={16} />
                          </button>
                        </div>
                        <div className="msg-options-row">
                          {(user.role === 'admin' || user.role === 'editor') && (
                            <label className="msg-broadcast-label">
                              <input 
                                type="checkbox" 
                                checked={isBroadcast} 
                                onChange={(e) => setIsBroadcast(e.target.checked)}
                              />
                              <span>Broadcast (Announcement)</span>
                            </label>
                          )}
                        </div>
                      </form>
                    )
                  ) : (
                    <div className="msg-login-prompt">
                      Please login as student to speak in #{activeRoom.name}.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Greeting Placeholder for Full Page Mode when no room is selected */
              <div className="msg-no-active-room">
                <div className="msg-no-active-inner">
                  <span className="msg-placeholder-logo-mark">🌊</span>
                  <h2>Southern Waves Discussion Space</h2>
                  <p>Choose a category discussion group or a trending topic tag from the left sidebar to start chatting with other students!</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* VIEW 2: SEARCH TAG OVERLAY */}
        {showSearch && (
          <div className="msg-search-overlay">
            <header className="msg-search-header">
              <button className="msg-detail-back" onClick={() => setShowSearch(false)}>
                <FiArrowLeft size={22} />
              </button>
              <form onSubmit={handleCreateCustomTagChat} className="msg-search-input-wrapper">
                <FiSearch size={16} />
                <input 
                  type="text" 
                  placeholder="Search tag or category..." 
                  className="msg-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')}>
                    <FiX size={16} />
                  </button>
                )}
              </form>
            </header>

            <div className="msg-search-results">
              {searchQuery && !getSearchResults().some(opt => opt.name === searchQuery.toLowerCase()) && (
                <div style={{ marginBottom: 20 }}>
                  <span className="msg-search-section-title">Create New Tag Room</span>
                  <div className="msg-tag-chip" onClick={handleCreateCustomTagChat}>
                    <span className="msg-tag-chip-name">Create #{searchQuery.toLowerCase()}</span>
                    <FiPlus />
                  </div>
                </div>
              )}

              <span className="msg-search-section-title">Categories & Active Tags</span>
              {getSearchResults().length === 0 ? (
                <div className="msg-empty">No results match "{searchQuery}"</div>
              ) : (
                getSearchResults().map((opt) => (
                  <div 
                    key={opt.name} 
                    className="msg-tag-chip"
                    onClick={() => handleStartSearchChat(opt)}
                  >
                    <span className="msg-tag-chip-name">{opt.display}</span>
                    <FiArrowLeft style={{ transform: 'rotate(180deg)' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Article Preview Popup */}
        {previewArticle && (
          <div className="msg-preview-backdrop" onClick={() => setPreviewArticle(null)}>
            <div className="msg-preview-card" onClick={e => e.stopPropagation()}>
              <button className="msg-preview-close" onClick={() => setPreviewArticle(null)}>×</button>
              {previewArticle.coverImage && (
                <img 
                  src={getImageUrl(previewArticle.coverImage)} 
                  alt={previewArticle.title} 
                  className="msg-preview-image" 
                />
              )}
              <div className="msg-preview-body">
                <span className="msg-preview-category">{getCategoryLabel(previewArticle.category)}</span>
                <h4 className="msg-preview-title">{previewArticle.title}</h4>
                <p className="msg-preview-lead">{previewArticle.lead}</p>
                <div className="msg-preview-meta">
                  <span>By {previewArticle.author?.name || 'Unknown'}</span>
                  <span>·</span>
                  <span>{previewArticle.publishedAt ? new Date(previewArticle.publishedAt).toLocaleDateString() : 'Unknown date'}</span>
                </div>
                <button 
                  className="msg-preview-view-btn" 
                  onClick={() => {
                    setPreviewArticle(null);
                    navigate(`/article/${previewArticle.slug}`);
                    setIsOpen(false);
                  }}
                >
                  Read Full Story
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MessageApp;
