import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { chatAPI, notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

// Smart resolver: maps any notification to its respected content page (article, author, chat room, etc.)
export const resolveNotifUrl = (n) => {
  if (!n) return null;

  // 1. Explicit actionType handling
  if (n.actionType === 'open_article') {
    if (n.actionPayload?.slug) return `/article/${n.actionPayload.slug}`;
  }
  if (n.actionType === 'open_profile') {
    if (n.actionPayload?.username) return `/author/${n.actionPayload.username}`;
  }
  if (n.actionType === 'open_comment') {
    if (n.actionPayload?.slug) return `/article/${n.actionPayload.slug}#comments`;
  }
  if (n.actionType === 'open_chat_room') {
    return { isChatRoom: true, payload: n.actionPayload };
  }
  if (n.actionType === 'appeal_review') {
    return { isAppealReview: true };
  }
  if (n.actionType === 'navigate' || n.actionType === 'external_url') {
    if (n.actionUrl && !n.actionUrl.startsWith('/notifications')) return n.actionUrl;
  }

  // 2. Direct actionUrl fallback (if present and NOT generic /notifications)
  if (n.actionUrl && typeof n.actionUrl === 'string') {
    const trimmed = n.actionUrl.trim();
    if (trimmed && !trimmed.startsWith('/notifications')) {
      return trimmed;
    }
  }

  // 3. Content inference from title/message
  const combinedText = `${n.title || ''} ${n.message || ''}`;

  const articleMatch = combinedText.match(/\/article\/([a-zA-Z0-9_-]+)/);
  if (articleMatch) return `/article/${articleMatch[1]}`;

  const authorMatch = combinedText.match(/\/author\/([a-zA-Z0-9_-]+)/);
  if (authorMatch) return `/author/${authorMatch[1]}`;

  const extUrlMatch = combinedText.match(/https?:\/\/[^\s)]+/);
  if (extUrlMatch) return extUrlMatch[0];

  // 4. Type-specific smart resolution
  if (n.type === 'comment' && n.actionPayload?.slug) {
    return `/article/${n.actionPayload.slug}#comments`;
  }
  if (n.type === 'board_news' || n.type === 'editorial') {
    if (n.actionPayload?.slug) return `/article/${n.actionPayload.slug}`;
    return '/'; // Go to homepage feed instead of notification page
  }
  if (n.type === 'message') {
    if (n.actionPayload?.name) return { isChatRoom: true, payload: n.actionPayload };
    return '/chat';
  }
  if (n.type === 'appeal' || n.type === 'sensitivity') {
    return { isAppealReview: true };
  }

  // 5. Default content fallback: view sender's profile if available
  const senderUser = typeof n.sender === 'object' ? n.sender : null;
  if (senderUser && senderUser.username) {
    return `/author/${senderUser.username}`;
  }

  return null;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [replies, setReplies] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [replyToArticle, setReplyToArticle] = useState(null);
  const [highlightArticleId, setHighlightArticleId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const socketRef = useRef(null);
  const userRef = useRef(user);
  const activeRoomRef = useRef(activeRoom);
  const isOpenRef = useRef(isOpen);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  // Initialize socket connection and load unread counts when user logs in
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setRooms([]);
      setReplies([]);
      setTotalUnread(0);
      setActiveRoom(null);
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }

    // Connect socket
    const token = localStorage.getItem('sw_token');
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      auth: token ? { token } : {}
    });

    socketRef.current.on('connect', () => {
      console.log('Chat socket connected:', socketRef.current.id);
    });

    // Real-time status updates (block/unblock)
    socketRef.current.on('user:status', (data) => {
      if (data && data.userId === user._id) {
        window.dispatchEvent(new CustomEvent('auth:status-change', { detail: data }));
      }
    });

    // Notification deleted by admin — remove from local state
    socketRef.current.on('notification:deleted', ({ id }) => {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadNotificationsCount((prev) => {
        const removed = notifications.find((n) => n._id === id);
        return removed && !removed.isRead ? Math.max(0, prev - 1) : prev;
      });
    });

    fetchUnreadCounts();
    fetchReplies();
    fetchNotifications();

    // Real-time lightweight chat notifications
    socketRef.current.on('chat:notification', (notification) => {
      let incomingRoomKey = '';
      if (notification.tags && notification.tags.length > 0) {
        incomingRoomKey = `tag:${notification.tags[0]}`;
      } else {
        incomingRoomKey = `category:${notification.category}`;
      }

      const currentUser = userRef.current || user;
      const isSender = currentUser && notification.user && (
        String(notification.user._id) === String(currentUser._id) ||
        notification.user.name === currentUser.name
      );

      const isChatPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/chat');
      const isViewingActiveRoom = Boolean(
        activeRoomRef.current &&
        activeRoomRef.current.roomKey === incomingRoomKey &&
        (isOpenRef.current || isChatPage)
      );

      setRooms((prevRooms) => {
        let roomExists = false;
        const updated = prevRooms.map((room) => {
          if (room.roomKey === incomingRoomKey) {
            roomExists = true;
            // Never increment unread for sender; if actively viewing the room, keep 0
            const newUnread = (isSender || isViewingActiveRoom) ? 0 : (room.unreadCount || 0) + 1;
            return {
              ...room,
              unreadCount: newUnread,
              lastMessage: {
                text: notification.text,
                user: notification.user?.name || 'User',
                createdAt: notification.createdAt,
              },
            };
          }
          return room;
        });

        if (!roomExists && notification.tags && notification.tags.length > 0) {
          const tagName = notification.tags[0];
          const newUnread = (isSender || isViewingActiveRoom) ? 0 : 1;
          updated.push({
            type: 'tag',
            name: tagName,
            roomKey: incomingRoomKey,
            unreadCount: newUnread,
            lastMessage: {
              text: notification.text,
              user: notification.user?.name || 'User',
              createdAt: notification.createdAt,
            },
          });
        }

        return updated;
      });

      if (isViewingActiveRoom && !isSender) {
        markRoomAsRead(incomingRoomKey);
      }

      if (notification.replyToUser === currentUser?._id && !isSender) {
        setReplies((prev) => [notification, ...prev].slice(0, 50));
      }
    });

    // ── Real-time broadcast notifications ──
    socketRef.current.on('notification:new', (newNotification) => {
      const currentUser = userRef.current || user;
      const isSender = newNotification.sender &&
        (typeof newNotification.sender === 'object'
          ? String(newNotification.sender._id) === String(currentUser?._id)
          : String(newNotification.sender) === String(currentUser?._id));

      // Client-side role gate: skip if user's role is not targeted
      if (
        newNotification.targetRoles &&
        newNotification.targetRoles.length > 0 &&
        !newNotification.targetRoles.includes(user.role)
      ) {
        return;
      }

      // Appeals are strictly for admins and moderators
      if (newNotification.type === 'appeal' && user.role !== 'admin' && user.role !== 'moderator') {
        return;
      }

      // Add to notifications list
      setNotifications((prev) => {
        if (prev.some(n => n._id === newNotification._id)) return prev;
        return [{ ...newNotification, isRead: isSender, isDismissed: false }, ...prev];
      });

      if (isSender) return; // Don't toast or increment count for sender

      setUnreadNotificationsCount((prev) => prev + 1);

      // ── Build toast styles ──
      let toastBg = '#1e293b';
      let toastBorder = 'rgba(255,255,255,0.12)';
      let emoji = '📢';
      let typeLabel = 'Announcement';

      if (newNotification.type === 'sensitivity' || newNotification.priority === 'urgent') {
        toastBg = '#991b1b'; toastBorder = '#7f1d1d';
        emoji = '🚨'; typeLabel = 'Critical Alert';
      } else if (newNotification.type === 'board_news') {
        toastBg = '#0f4c81'; toastBorder = '#1e40af';
        emoji = '📰'; typeLabel = 'Board News';
      } else if (newNotification.type === 'appeal') {
        toastBg = '#78350f'; toastBorder = '#92400e';
        emoji = '🛡️'; typeLabel = 'User Appeal';
      } else if (newNotification.type === 'editorial') {
        toastBg = '#1e3a5f'; toastBorder = '#1e40af';
        emoji = '✍️'; typeLabel = 'Editorial Update';
      } else if (newNotification.type === 'comment') {
        toastBg = '#312e81'; toastBorder = '#4338ca';
        emoji = '💬'; typeLabel = 'New Comment';
      }

      const ctaUrl = resolveNotifUrl(newNotification);
      const isExternal = newNotification.actionType === 'external_url';
      const hasCta = !!ctaUrl && newNotification.actionType !== 'none' && newNotification.actionType !== 'appeal_review';

      const ctaLabel =
        newNotification.actionType === 'open_article' ? '📄 Read Article' :
        newNotification.actionType === 'open_profile' ? '👤 View Profile' :
        newNotification.actionType === 'open_comment' ? '💬 View Comment' :
        newNotification.actionType === 'open_chat_room' ? '🗨️ Join Room' :
        newNotification.actionType === 'external_url' ? '🔗 Open Link' :
        '→ View';

      toast.custom((t) => (
        <div
          style={{
            background: toastBg,
            color: '#fff',
            border: `1.5px solid ${toastBorder}`,
            padding: '13px 16px',
            borderRadius: '14px',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '11px',
            boxShadow: '0 10px 35px rgba(0,0,0,0.25)',
            maxWidth: '370px',
            width: '100%',
            pointerEvents: 'auto',
            zIndex: 99999,
            opacity: t.visible ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
          onClick={() => toast.dismiss(t.id)}
        >
          <span style={{ fontSize: '19px', flexShrink: 0, marginTop: '1px' }}>{emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '9.5px', letterSpacing: '0.7px', marginBottom: '3px', opacity: 0.7 }}>
              {typeLabel}
            </div>
            <div style={{ fontWeight: 750, fontSize: '12.5px', marginBottom: '3px', lineHeight: 1.3 }}>
              {newNotification.title}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {newNotification.message}
            </div>
            {hasCta && (
              <button
                style={{
                  marginTop: '8px',
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '4px 11px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss(t.id);
                  if (isExternal) {
                    window.open(ctaUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    window.dispatchEvent(new CustomEvent('notif:navigate', { detail: { url: ctaUrl } }));
                  }
                }}
              >
                {ctaLabel}
              </button>
            )}
          </div>
          <button
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
            title="Dismiss"
          >×</button>
        </div>
      ), { duration: 7000 });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // Recalculate total unread badge whenever rooms change
  useEffect(() => {
    const total = rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
    setTotalUnread(total);
  }, [rooms]);

  // Handle active room switching for marking as read
  useEffect(() => {
    const isChatPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/chat');
    if (activeRoom && (isOpen || isChatPage)) {
      const timer = setTimeout(() => {
        markRoomAsRead(activeRoom.roomKey);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeRoom, isOpen]);

  const fetchUnreadCounts = async () => {
    try {
      const res = await chatAPI.getUnreadCounts();
      setRooms(res.data.data);
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await chatAPI.getReplies();
      setReplies(res.data.data);
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.data);
      const unread = res.data.data.filter((n) => !n.isRead).length;
      setUnreadNotificationsCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      await notificationAPI.markRead(id);
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
      await notificationAPI.markAllRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const dismissNotification = async (id) => {
    try {
      // Optimistic update — mark as dismissed + read in local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isDismissed: true, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => {
        const target = notifications.find((n) => n._id === id);
        return target && !target.isRead ? Math.max(0, prev - 1) : prev;
      });
      await notificationAPI.dismiss(id);
    } catch (err) {
      console.error(`Failed to dismiss notification ${id}:`, err);
      // Revert on error
      fetchNotifications();
    }
  };

  const deleteNotification = async (id) => {
    try {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadNotificationsCount((prev) => {
        const removed = notifications.find((n) => n._id === id);
        return removed && !removed.isRead ? Math.max(0, prev - 1) : prev;
      });
      await notificationAPI.delete(id);
      toast.success('Notification deleted');
    } catch (err) {
      console.error(`Failed to delete notification ${id}:`, err);
      toast.error('Failed to delete notification');
      fetchNotifications();
    }
  };

  const markRoomAsRead = async (roomKey) => {
    try {
      setRooms((prev) =>
        prev.map((r) => (r.roomKey === roomKey ? { ...r, unreadCount: 0 } : r))
      );
      await chatAPI.markAsRead(roomKey);
    } catch (err) {
      console.error(`Failed to mark room ${roomKey} as read:`, err);
    }
  };

  const joinRoom = (roomKey) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:joinRoom', { room: roomKey });
    }
  };

  const leaveRoom = (roomKey) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:leaveRoom', { room: roomKey });
    }
  };

  const openRoom = (roomType, name) => {
    const roomKey = roomType === 'tag' ? `tag:${name.toLowerCase()}` : `category:${name.toLowerCase()}`;
    let initialUnreadCount = 0;

    setRooms((prev) => {
      const existing = prev.find((r) => r.roomKey === roomKey);
      if (existing) {
        initialUnreadCount = existing.unreadCount || 0;
      }
      const exists = prev.some((r) => r.roomKey === roomKey);
      if (!exists) {
        return [...prev, { type: roomType, name: name.toLowerCase(), roomKey, unreadCount: 0, lastMessage: null }];
      }
      return prev;
    });

    setActiveRoom({ type: roomType, name: name.toLowerCase(), roomKey, initialUnreadCount });
    setIsOpen(true);
  };

  const updateRoomLastMessage = (roomKey, lastMessage) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.roomKey === roomKey
          ? {
              ...r,
              unreadCount: 0,
              lastMessage: {
                text: lastMessage.text,
                user: lastMessage.user?.name || lastMessage.user || 'User',
                createdAt: lastMessage.createdAt || new Date().toISOString(),
              },
            }
          : r
      )
    );
  };

  return (
    <ChatContext.Provider
      value={{
        socket: socketRef.current,
        rooms,
        replies,
        activeRoom,
        setActiveRoom,
        activeTab,
        setActiveTab,
        isOpen,
        setIsOpen,
        totalUnread,
        joinRoom,
        leaveRoom,
        openRoom,
        updateRoomLastMessage,
        fetchUnreadCounts,
        fetchReplies,
        markRoomAsRead,
        replyToArticle,
        setReplyToArticle,
        highlightArticleId,
        setHighlightArticleId,
        notifications,
        unreadNotificationsCount,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        deleteNotification,
        resolveNotifUrl,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
