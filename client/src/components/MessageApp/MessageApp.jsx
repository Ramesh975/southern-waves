import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { chatAPI, filterAPI, articleAPI } from '../../services/api';
import { FiX, FiSend, FiSearch, FiPlus, FiSmile, FiEdit2, FiCornerUpLeft, FiArrowLeft, FiTag, FiHash, FiVolume2, FiAlertCircle, FiLock, FiTrash2, FiChevronDown, FiFileText, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './MessageApp.css';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏', '🚀', '💡', '☕', '💯', '🤝', '👀', '✨', '🙌'];

const TRENDING_HASHTAGS = ['exam', 'results', 'madras', 'events', 'campus', 'sports', 'tech', 'admissions', 'protest', 'placement', 'library', 'internship', 'symposium', 'cultural'];

const STICKER_PACK = ['🎉', '☕', '🔥', '👏', '🤯', '📚', '⚡', '💯', '🚀', '💡', '😎', '🥳', '🎯', '🙌'];

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
    'kyp': 'Know Your Past',
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

  // Chat-wide Search State [Tags, Chats, Conversation]
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchTab, setChatSearchTab] = useState('all'); // 'all' | 'tags' | 'chats' | 'messages'
  const [chatSearchResults, setChatSearchResults] = useState({ tags: [], chats: [], messages: [] });
  const [chatSearchLoading, setChatSearchLoading] = useState(false);

  // News Attachment & Recommendations State
  const [showNewsAttach, setShowNewsAttach] = useState(false);
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  
  // Chat Detail Room State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null); // Message object being replied to
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Suggestions state
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showStickerTray, setShowStickerTray] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const [activeReactionMenu, setActiveReactionMenu] = useState(null); // messageId
  const [globalChatLock, setGlobalChatLock] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null); // Target message to scroll to & highlight

  useEffect(() => {
    filterAPI.getPublicSettings()
      .then((res) => {
        if (res.data?.success) {
          setGlobalChatLock(res.data.data.globalChatLock || false);
        }
      })
      .catch((err) => console.error('Failed to load system settings in chat:', err));
  }, []);
  const [previewArticle, setPreviewArticle] = useState(null);

  // Debounced Chat Search across [Tags, Chats, Conversation]
  useEffect(() => {
    if (!chatSearchQuery.trim()) {
      setChatSearchResults({ tags: [], chats: [], messages: [] });
      setChatSearchLoading(false);
      return;
    }
    setChatSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await chatAPI.search({ q: chatSearchQuery.trim(), type: chatSearchTab });
        if (res.data?.success) {
          setChatSearchResults(res.data.data);
        }
      } catch (err) {
        console.error('Chat search failed:', err);
      } finally {
        setChatSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [chatSearchQuery, chatSearchTab]);

  // Debounced News Search / Live Recommendations for Chat Attachment
  useEffect(() => {
    if (!showNewsAttach) return;
    setNewsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = { limit: 8 };
        if (newsSearchQuery.trim()) {
          params.search = newsSearchQuery.trim();
        } else {
          params.sort = '-createdAt';
        }
        const res = await articleAPI.getAll(params);
        setNewsArticles(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load news for chat attachment:', err);
      } finally {
        setNewsLoading(false);
      }
    }, newsSearchQuery ? 250 : 0);

    return () => clearTimeout(timer);
  }, [showNewsAttach, newsSearchQuery]);

  // Send a news article directly into the chatroom
  const handleSendNewsArticle = async (article) => {
    if (!user || !activeRoom) return;
    const isChatModerator = user?.role === 'admin' || user?.role === 'moderator';
    if (globalChatLock && !isChatModerator) {
      return toast.error('Chat is temporarily locked.');
    }

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      tempId: tempId,
      text: '',
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      },
      category: activeRoom.type === 'group' ? activeRoom.name : 'tea-shop',
      tags: activeRoom.type === 'tag' ? [activeRoom.name] : [],
      isBroadcast: isBroadcast,
      parentArticle: {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        category: article.category,
        coverImage: article.coverImage,
        lead: article.lead || article.dek || '',
        author: article.author
      },
      reactions: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages((prev) => [...prev, { ...optimisticMsg, isNew: true }]);
    setShowNewsAttach(false);
    setNewsSearchQuery('');
    scrollToBottom();

    try {
      const payload = {
        text: `Shared story: "${article.title}"`,
        category: activeRoom.type === 'group' ? activeRoom.name : 'tea-shop',
        tags: activeRoom.type === 'tag' ? [activeRoom.name] : [],
        isBroadcast: isBroadcast,
        parentArticleId: article._id,
        tempId: tempId
      };
      const res = await chatAPI.sendMessage(payload);
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? res.data.data : msg))
      );
    } catch (err) {
      console.error('Failed to send news article:', err);
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      toast.error('Failed to send news story to chat');
    }
  };

  // Formatter for clickable hashtags and user mentions in messages
  const renderFormattedMessage = (text) => {
    if (!text) return null;
    const trimmed = text.trim();

    // If message is purely a tag like `#siva shankar` or `#exam`
    if (/^#[\w\u00C0-\u017F -]{1,40}$/.test(trimmed)) {
      const tagName = trimmed.replace(/^#/, '').trim().toLowerCase();
      return (
        <button
          type="button"
          className="msg-inline-tag-pill"
          onClick={(e) => {
            e.stopPropagation();
            openRoom('tag', tagName);
          }}
          title={`Jump to #${tagName} chat channel`}
        >
          <FiHash size={13} className="msg-tag-hash-icon" />
          <span>{tagName}</span>
        </button>
      );
    }

    // Split text by inline #tag and @mention
    const regex = /(#[\w\u00C0-\u017F-]+|@[\w\u00C0-\u017F-]+)/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.startsWith('#') && part.length > 1) {
        const rawTag = part.slice(1).toLowerCase();
        return (
          <button
            key={idx}
            type="button"
            className="msg-inline-tag"
            onClick={(e) => {
              e.stopPropagation();
              openRoom('tag', rawTag);
            }}
            title={`Open #${rawTag} chat`}
          >
            #{rawTag}
          </button>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        const mention = part.slice(1);
        return (
          <span key={idx} className="msg-inline-mention" title={`Mentioning @${mention}`}>
            @{mention}
          </span>
        );
      }
      return part;
    });
  };

  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null); // scroll container ref
  const sentinelRef = useRef(null);     // top-of-list intersection target
  const oldestIdRef = useRef(null);     // _id of oldest loaded message (cursor)
  const chatListRef = useRef(null);

  // Lock background scroll when drawer is open on mobile / overlay
  useEffect(() => {
    if (isOpen && !isFullPage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isFullPage]);

  // Smooth scroll and flash-highlight message when navigated from conversation search
  useEffect(() => {
    if (!highlightMessageId) return;

    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(() => {
      attempts += 1;
      const el = document.getElementById(`msg-${highlightMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    const clearTimer = setTimeout(() => {
      setHighlightMessageId(null);
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(clearTimer);
    };
  }, [highlightMessageId, messages]);

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
      prev.map((msg) => {
        if (msg._id === updatedMsg._id) {
          return {
            ...msg,
            ...updatedMsg,
            parentArticle: (updatedMsg.parentArticle && typeof updatedMsg.parentArticle === 'object' && updatedMsg.parentArticle.title)
              ? updatedMsg.parentArticle
              : msg.parentArticle
          };
        }
        return msg;
      })
    );
  };

  const handleIncomingReaction = (updatedMsg) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id === updatedMsg._id) {
          return {
            ...msg,
            ...updatedMsg,
            parentArticle: (updatedMsg.parentArticle && typeof updatedMsg.parentArticle === 'object' && updatedMsg.parentArticle.title)
              ? updatedMsg.parentArticle
              : msg.parentArticle,
            reactions: updatedMsg.reactions
          };
        }
        return msg;
      })
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
      // Snap to bottom immediately after first paint (unless jumping to a specific highlighted message)
      requestAnimationFrame(() => {
        if (messagesListRef.current && !highlightMessageId) {
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

  // Ensure chat list is scrolled to the very bottom when loading finishes or messages update
  useLayoutEffect(() => {
    if (!loadingMessages && messages.length > 0 && !highlightMessageId) {
      scrollToBottom();
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loadingMessages, messages.length, activeRoom, highlightMessageId]);

  // Scroll to bottom when the chat drawer/window is opened
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleMessagesScroll = () => {
    const list = messagesListRef.current;
    if (!list) return;
    const isScrolledUp = list.scrollHeight - list.scrollTop - list.clientHeight > 100;
    setShowScrollBottom(isScrolledUp);
  };

  const scrollToBottom = (smooth = false) => {
    if (messagesListRef.current) {
      if (smooth) {
        messagesListRef.current.scrollTo({
          top: messagesListRef.current.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
      }
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
      // Optimistic reaction toggle: one user can have only one reaction
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const existingReactionIndex = msg.reactions?.findIndex(
              r => r.user?._id === user._id || r.user === user._id
            );
            let newReactions = msg.reactions ? [...msg.reactions] : [];

            if (existingReactionIndex !== -1 && existingReactionIndex !== undefined) {
              const existingEmoji = newReactions[existingReactionIndex].emoji;
              if (existingEmoji === emoji) {
                // Toggle off (remove)
                newReactions.splice(existingReactionIndex, 1);
              } else {
                // Replace previous reaction with new emoji
                newReactions.splice(existingReactionIndex, 1);
                newReactions.push({ user: { _id: user._id, name: user.name }, emoji });
              }
            } else {
              // Add reaction
              newReactions.push({ user: { _id: user._id, name: user.name }, emoji });
            }
            return { ...msg, reactions: newReactions };
          }
          return msg;
        })
      );
      setActiveReactionMenu(null);
      
      const res = await chatAPI.reactToMessage(messageId, emoji);
      if (res?.data?.data) {
        const serverMsg = res.data.data;
        setMessages((prev) =>
          prev.map((msg) => (msg._id === serverMsg._id ? {
            ...msg,
            ...serverMsg,
            parentArticle: (serverMsg.parentArticle && typeof serverMsg.parentArticle === 'object' && serverMsg.parentArticle.title)
              ? serverMsg.parentArticle
              : msg.parentArticle
          } : msg))
        );
      }
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

            {/* QUICK SEARCH OPTION [Tags, Chats, Conversation] */}
            <div className="msg-chat-search-wrap">
              <FiSearch size={14} className="msg-chat-search-icon" />
              <input 
                type="text"
                placeholder="Search tags, chats, messages..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="msg-chat-search-input"
              />
              {chatSearchQuery && (
                <button 
                  type="button" 
                  onClick={() => setChatSearchQuery('')}
                  className="msg-chat-search-clear"
                  title="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            {/* Navigation Category Tabs (hidden when searching) */}
            {!chatSearchQuery.trim() && (
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
            )}

            {/* List Content */}
            <div className="msg-rooms-list" ref={chatListRef}>
              {chatSearchQuery.trim() ? (
                <div className="msg-search-results-panel">
                  {/* Filter Pills */}
                  <div className="msg-search-filter-pills">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'tags', label: `Tags (${chatSearchResults.tags?.length || 0})` },
                      { id: 'chats', label: `Chats (${chatSearchResults.chats?.length || 0})` },
                      { id: 'messages', label: `Messages (${chatSearchResults.messages?.length || 0})` }
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        className={`msg-search-filter-pill ${chatSearchTab === pill.id ? 'active' : ''}`}
                        onClick={() => setChatSearchTab(pill.id)}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {chatSearchLoading ? (
                    <div className="msg-search-loading-state">
                      <div className="spinner" style={{ width: 22, height: 22 }} />
                      <span>Searching discussion board...</span>
                    </div>
                  ) : (
                    (!chatSearchResults.tags?.length && !chatSearchResults.chats?.length && !chatSearchResults.messages?.length) ? (
                      <div className="msg-empty">
                        No tags, chats, or conversation messages found matching "{chatSearchQuery}".
                      </div>
                    ) : (
                      <div className="msg-search-results-content">
                        {/* TAGS SECTION */}
                        {(chatSearchTab === 'all' || chatSearchTab === 'tags') && chatSearchResults.tags?.length > 0 && (
                          <div className="msg-search-group-block">
                            <span className="msg-search-group-heading">Tag Channels</span>
                            {chatSearchResults.tags.map((t) => (
                              <div
                                key={t.name}
                                className="msg-room-item"
                                onClick={() => {
                                  openRoom('tag', t.name);
                                  setChatSearchQuery('');
                                }}
                              >
                                <div className="msg-room-avatar tag-avatar">
                                  <FiHash size={16} />
                                </div>
                                <div className="msg-room-details">
                                  <span className="msg-room-name">#{t.name}</span>
                                  <span className="msg-room-lasttext">Hashtag channel</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CHATS SECTION */}
                        {(chatSearchTab === 'all' || chatSearchTab === 'chats') && chatSearchResults.chats?.length > 0 && (
                          <div className="msg-search-group-block">
                            <span className="msg-search-group-heading">Chat Channels</span>
                            {chatSearchResults.chats.map((c) => (
                              <div
                                key={c.name}
                                className="msg-room-item"
                                onClick={() => {
                                  openRoom('group', c.name);
                                  setChatSearchQuery('');
                                }}
                              >
                                <div className="msg-room-avatar">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="msg-room-details">
                                  <span className="msg-room-name">{c.display}</span>
                                  <span className="msg-room-lasttext">{c.description}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CONVERSATION MESSAGES SECTION */}
                        {(chatSearchTab === 'all' || chatSearchTab === 'messages') && chatSearchResults.messages?.length > 0 && (
                          <div className="msg-search-group-block">
                            <span className="msg-search-group-heading">Conversation Messages</span>
                            {chatSearchResults.messages.map((m) => {
                              const isTag = m.tags && m.tags.length > 0;
                              const channelName = isTag ? `#${m.tags[0]}` : m.category;
                              return (
                                <div
                                  key={m._id}
                                  className="msg-room-item"
                                  onClick={() => {
                                    openRoom(isTag ? 'tag' : 'group', isTag ? m.tags[0] : m.category);
                                    setChatSearchQuery('');
                                    setHighlightMessageId(m._id);
                                  }}
                                >
                                  <div className="msg-room-avatar">
                                    <FiMessageSquare size={16} />
                                  </div>
                                  <div className="msg-room-details">
                                    <div className="msg-room-top">
                                      <span className="msg-room-name">{m.user?.name || 'User'} <span className="msg-search-channel-tag">in {channelName}</span></span>
                                      <span className="msg-room-time">
                                        {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <div className="msg-room-bottom">
                                      <span className="msg-room-lasttext">{m.text}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <>
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
                </>
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
                <div className="msg-messages-list-wrapper">
                  <div className="msg-messages-list" ref={messagesListRef} onScroll={handleMessagesScroll}>
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
                        const isHighlighted = highlightMessageId === msg._id;

                        return (
                          <div 
                            id={`msg-${msg._id}`}
                            key={msg._id} 
                            style={{ display: 'flex', flexDirection: 'column' }} 
                            className={`${isHighlighted ? 'msg-highlight-pulse' : ''} ${msg.isNew ? 'msg-new-entry' : ''}`}
                          >
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
                                  {/* Render parent message if this is a reply */}
                                  {msg.parentMessage && (
                                    <div className="msg-parent-in-bubble">
                                      <strong>@{msg.parentMessage.user?.name || 'User'}:</strong> {msg.parentMessage.text}
                                    </div>
                                  )}

                                  {/* Rich News Card if article attached */}
                                  {msg.parentArticle && typeof msg.parentArticle === 'object' && msg.parentArticle.title && (
                                    <div 
                                      className="msg-news-card-bubble"
                                      onClick={() => {
                                        if (msg.parentArticle.slug) {
                                          navigate(`/article/${msg.parentArticle.slug}`);
                                          setIsOpen(false);
                                        } else {
                                          setPreviewArticle(msg.parentArticle);
                                        }
                                      }}
                                      title="Click to view full story"
                                    >
                                      <div className="msg-news-card-header">
                                        <span className="msg-news-card-badge">
                                          📰 {getCategoryLabel(msg.parentArticle.category)}
                                        </span>
                                        <span className="msg-news-card-tap-hint">Read Story →</span>
                                      </div>

                                      {msg.parentArticle.coverImage && (
                                        <div className="msg-news-card-image-wrap">
                                          <img 
                                            src={getImageUrl(msg.parentArticle.coverImage)} 
                                            alt={msg.parentArticle.title} 
                                            className="msg-news-card-image"
                                            loading="lazy"
                                          />
                                        </div>
                                      )}

                                      <div className="msg-news-card-content">
                                        <h4 className="msg-news-card-title">{msg.parentArticle.title}</h4>
                                        {(msg.parentArticle.lead || msg.parentArticle.dek) && (
                                          <p className="msg-news-card-lead">
                                            {msg.parentArticle.lead || msg.parentArticle.dek}
                                          </p>
                                        )}
                                        <div className="msg-news-card-footer">
                                          <button 
                                            type="button" 
                                            className="msg-news-card-read-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (msg.parentArticle.slug) {
                                                navigate(`/article/${msg.parentArticle.slug}`);
                                                setIsOpen(false);
                                              } else {
                                                setPreviewArticle(msg.parentArticle);
                                              }
                                            }}
                                          >
                                            Read Full Story →
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {isBeingEdited ? (
                                    /* MODERN DARK INLINE EDITING CARD */
                                    <div className="msg-edit-box-dark">
                                      <div className="msg-edit-header-dark">
                                        <span className="msg-edit-title-dark">Editing message</span>
                                        <span className="msg-edit-hint-dark">Esc to cancel • Enter to save</span>
                                      </div>
                                      <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveEdit();
                                          } else if (e.key === 'Escape') {
                                            setEditingId(null);
                                          }
                                        }}
                                        rows={2}
                                        autoFocus
                                        className="msg-edit-textarea-dark"
                                        placeholder="Edit your message..."
                                      />
                                      <div className="msg-edit-actions-dark">
                                        <button 
                                          type="button" 
                                          className="msg-edit-btn-cancel" 
                                          onClick={() => setEditingId(null)}
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          type="button" 
                                          className="msg-edit-btn-save" 
                                          onClick={handleSaveEdit}
                                          disabled={!editText.trim()}
                                        >
                                          Save Changes
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Message text with clickable tags (#) and mentions (@) */}
                                      {msg.text && (
                                        <div className="msg-bubble-text-wrap">
                                          {renderFormattedMessage(msg.text)}
                                        </div>
                                      )}
                                      
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

                  {/* Navigate to bottom of sheet button */}
                  {showScrollBottom && (
                    <button
                      type="button"
                      className="msg-scroll-bottom-btn"
                      onClick={() => scrollToBottom(true)}
                      title="Navigate to bottom of chat"
                      aria-label="Navigate to bottom of chat"
                    >
                      <FiChevronDown size={20} />
                    </button>
                  )}
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
                      <form onSubmit={handleSendMessage} className="msg-input-form" autoComplete="off">
                        {/* Hashtag suggestions popup */}
                        {showTagSuggestions && (
                          <div className="msg-suggestions-popup" style={{
                            position: 'absolute', bottom: '100%', left: '16px', right: '16px',
                            background: 'var(--color-paper, #ffffff)', border: '1px solid var(--color-gray-300, #ccc)',
                            borderRadius: '8px', padding: '8px', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                            display: 'flex', flexWrap: 'wrap', gap: '6px', zIndex: 10
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-gray-500)', width: '100%', marginBottom: '2px' }}>
                              Trending Topics (Click to add):
                            </span>
                            {TRENDING_HASHTAGS.filter(t => !tagQuery || t.includes(tagQuery)).slice(0, 6).map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setNewMessage(prev => prev.replace(/#([a-zA-Z0-9_-]*)$/, `#${t} `));
                                  setShowTagSuggestions(false);
                                }}
                                style={{
                                  background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-300)',
                                  borderRadius: '12px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700,
                                  cursor: 'pointer', color: 'var(--accent-color)'
                                }}
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Mention suggestions popup */}
                        {showMentionSuggestions && (
                          <div className="msg-suggestions-popup" style={{
                            position: 'absolute', bottom: '100%', left: '16px', right: '16px',
                            background: 'var(--color-paper, #ffffff)', border: '1px solid var(--color-gray-300, #ccc)',
                            borderRadius: '8px', padding: '8px', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                            display: 'flex', flexWrap: 'wrap', gap: '6px', zIndex: 10
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-gray-500)', width: '100%', marginBottom: '2px' }}>
                              Mention Students:
                            </span>
                            {['student', 'editor', 'moderator', 'alex_morgan', 'campus_lead'].filter(m => !mentionQuery || m.includes(mentionQuery)).map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setNewMessage(prev => prev.replace(/@([a-zA-Z0-9_-]*)$/, `@${m} `));
                                  setShowMentionSuggestions(false);
                                }}
                                style={{
                                  background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-300)',
                                  borderRadius: '12px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700,
                                  cursor: 'pointer', color: 'var(--color-black)'
                                }}
                              >
                                @{m}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Sticker / GIF tray popup */}
                        {showStickerTray && (
                          <div style={{
                            position: 'absolute', bottom: '100%', right: '16px',
                            background: 'var(--color-paper, #ffffff)', border: '1px solid var(--color-gray-300, #ccc)',
                            borderRadius: '12px', padding: '10px', boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
                            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', zIndex: 10
                          }}>
                            {STICKER_PACK.map(stk => (
                              <button
                                key={stk}
                                type="button"
                                onClick={() => {
                                  setNewMessage(prev => `${prev} ${stk} `.trimStart());
                                  setShowStickerTray(false);
                                }}
                                style={{
                                  fontSize: '20px', padding: '6px', border: 'none', background: 'none',
                                  cursor: 'pointer', borderRadius: '6px', transition: 'transform 0.1s'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                              >
                                {stk}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* News Live Recommendations Tray (spreads above input bar) */}
                        {showNewsAttach && (
                          <div className="msg-news-recommendations-tray">
                            <div className="msg-news-rec-header">
                              <div className="msg-news-rec-title-wrap">
                                <FiFileText size={14} className="msg-news-rec-icon" />
                                <span className="msg-news-rec-title">
                                  {newsSearchQuery.trim() ? 'Search Results' : 'Recommended News Stories'}
                                </span>
                              </div>
                              <button 
                                type="button" 
                                className="msg-news-rec-close"
                                onClick={() => {
                                  setShowNewsAttach(false);
                                  setNewsSearchQuery('');
                                }}
                                title="Close news search"
                              >
                                <FiX size={14} />
                              </button>
                            </div>

                            {newsLoading ? (
                              <div className="msg-news-rec-loading">
                                <div className="spinner" style={{ width: 18, height: 18 }} />
                                <span>Loading news recommendations...</span>
                              </div>
                            ) : newsArticles.length === 0 ? (
                              <div className="msg-news-rec-empty">
                                No articles found matching "{newsSearchQuery}".
                              </div>
                            ) : (
                              <div className="msg-news-rec-list">
                                {newsArticles.map((art) => (
                                  <div 
                                    key={art._id}
                                    className="msg-news-rec-card"
                                    onClick={() => handleSendNewsArticle(art)}
                                    title="Click to send story to chat"
                                  >
                                    {art.coverImage ? (
                                      <img 
                                        src={getImageUrl(art.coverImage)} 
                                        alt={art.title} 
                                        className="msg-news-rec-thumb"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="msg-news-rec-thumb-placeholder">📰</div>
                                    )}
                                    <div className="msg-news-rec-info">
                                      <span className="msg-news-rec-badge">
                                        {getCategoryLabel(art.category)}
                                      </span>
                                      <h5 className="msg-news-rec-heading">{art.title}</h5>
                                      {(art.lead || art.dek) && <p className="msg-news-rec-snippet">{art.lead || art.dek}</p>}
                                    </div>
                                    <button type="button" className="msg-news-rec-send-btn" title="Send story to chat">
                                      <FiSend size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`msg-input-row ${showNewsAttach ? 'news-search-expanded' : ''}`} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setShowStickerTray(prev => !prev)}
                            style={{
                              border: 'none', background: 'none', cursor: 'pointer',
                              padding: '8px', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center'
                            }}
                            title="Stickers / Quick Emojis"
                          >
                            <FiSmile size={18} />
                          </button>

                          {showNewsAttach ? (
                            <div className="msg-news-search-bar-wrap">
                              <FiSearch size={16} className="msg-news-search-icon-spread" />
                              <input
                                type="text"
                                autoFocus
                                value={newsSearchQuery}
                                onChange={(e) => setNewsSearchQuery(e.target.value)}
                                placeholder="Type to search and share news articles..."
                                className="msg-news-search-bar-input"
                              />
                              {newsSearchQuery && (
                                <button 
                                  type="button" 
                                  onClick={() => setNewsSearchQuery('')}
                                  className="msg-news-search-bar-clear"
                                  title="Clear"
                                >
                                  <FiX size={14} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <input 
                              type="text" 
                              name="chat_message_content"
                              autoComplete="off"
                              data-lpignore="true"
                              data-form-type="other"
                              placeholder="Write message... Use #tag or @mention." 
                              className="msg-input-text"
                              value={newMessage}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewMessage(val);
                                const hashMatch = val.match(/#([a-zA-Z0-9_\u00C0-\u017F-]*)$/);
                                if (hashMatch) {
                                  setShowTagSuggestions(true);
                                  setTagQuery(hashMatch[1].toLowerCase());
                                  setShowMentionSuggestions(false);
                                } else {
                                  setShowTagSuggestions(false);
                                }
                                const mentionMatch = val.match(/@([a-zA-Z0-9_\u00C0-\u017F-]*)$/);
                                if (mentionMatch) {
                                  setShowMentionSuggestions(true);
                                  setMentionQuery(mentionMatch[1].toLowerCase());
                                  setShowTagSuggestions(false);
                                } else {
                                  setShowMentionSuggestions(false);
                                }
                              }}
                            />
                          )}

                          {/* Document / News Attachment Button */}
                          <button
                            type="button"
                            className={`msg-news-attach-btn ${showNewsAttach ? 'active' : ''}`}
                            onClick={() => {
                              setShowNewsAttach(prev => !prev);
                              if (showNewsAttach) setNewsSearchQuery('');
                            }}
                            title={showNewsAttach ? "Close news search" : "Attach / Share News Story"}
                          >
                            <FiFileText size={17} />
                          </button>

                          <button type="submit" className="msg-send-btn" disabled={!newMessage.trim() && !showNewsAttach}>
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
                    const target = previewArticle.slug || previewArticle._id;
                    if (target) {
                      setPreviewArticle(null);
                      navigate(`/article/${target}`);
                      setIsOpen(false);
                    }
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
