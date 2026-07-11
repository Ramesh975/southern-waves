import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { chatAPI, notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [replies, setReplies] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null); // { type: 'group'|'tag', name: string, roomKey: string }
  const [isOpen, setIsOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [replyToArticle, setReplyToArticle] = useState(null); // { _id, title, slug, category, coverImage }
  const [highlightArticleId, setHighlightArticleId] = useState(null); // article._id to flash-highlight on news page
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  const socketRef = useRef(null);

  // Initialize socket connection and load unread counts when user logs in
  useEffect(() => {
    if (!user) {
      // Disconnect socket if user logs out
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
    socketRef.current = io(SOCKET_URL, { withCredentials: true });

    socketRef.current.on('connect', () => {
      console.log('Chat socket connected:', socketRef.current.id);
    });

    // Listen to real-time status updates (block/unblock)
    socketRef.current.on('user:status', (data) => {
      if (data && data.userId === user._id) {
        window.dispatchEvent(new CustomEvent('auth:status-change', { detail: data }));
      }
    });

    // Fetch initial room unread status and replies
    fetchUnreadCounts();
    fetchReplies();
    fetchNotifications();

    // Listen to global lightweight message notifications to update sidebar counts/last messages in real time
    socketRef.current.on('chat:notification', (notification) => {
      // Determine the incoming roomKey
      let incomingRoomKey = '';
      if (notification.tags && notification.tags.length > 0) {
        // If it's a tagged message, we find the first tag to update that room
        incomingRoomKey = `tag:${notification.tags[0]}`;
      } else {
        incomingRoomKey = `category:${notification.category}`;
      }

      // Check if we are currently active in this room AND the chat drawer is open
      const isViewingActiveRoom = activeRoom && activeRoom.roomKey === incomingRoomKey && isOpen;

      setRooms((prevRooms) => {
        let roomExists = false;
        const updated = prevRooms.map((room) => {
          if (room.roomKey === incomingRoomKey) {
            roomExists = true;
            return {
              ...room,
              unreadCount: isViewingActiveRoom ? 0 : room.unreadCount + 1,
              lastMessage: {
                text: notification.text,
                user: notification.user.name,
                createdAt: notification.createdAt,
              },
            };
          }
          return room;
        });

        // If it's a new tag room that wasn't in our list yet, add it
        if (!roomExists && notification.tags && notification.tags.length > 0) {
          const tagName = notification.tags[0];
          updated.push({
            type: 'tag',
            name: tagName,
            roomKey: incomingRoomKey,
            unreadCount: isViewingActiveRoom ? 0 : 1,
            lastMessage: {
              text: notification.text,
              user: notification.user.name,
              createdAt: notification.createdAt,
            },
          });
        }

        return updated;
      });

      // Update replies if this message was a reply to the current user
      if (notification.replyToUser === user._id) {
        setReplies((prev) => [notification, ...prev].slice(0, 50));
      }
    });

    socketRef.current.on('notification:new', (newNotification) => {
      const isSender = newNotification.sender && 
        (typeof newNotification.sender === 'object' 
          ? newNotification.sender._id === user._id 
          : newNotification.sender === user._id);

      // Add to notifications list, marked as read for the sender
      setNotifications((prev) => {
        if (prev.some(n => n._id === newNotification._id)) return prev;
        return [{ ...newNotification, isRead: isSender ? true : false }, ...prev];
      });

      if (isSender) {
        return; // Don't show toast or increment unread for the sender
      }

      setUnreadNotificationsCount((prev) => prev + 1);

      // Trigger custom toast notification
      let toastBg = 'var(--color-black)';
      let toastTextColor = 'var(--color-white)';
      let toastBorder = '2px solid var(--color-black)';
      let emoji = '📢';

      if (newNotification.type === 'sensitivity') {
        toastBg = '#991b1b';
        toastTextColor = '#fff';
        toastBorder = '2px solid #7f1d1d';
        emoji = '🚨';
      } else if (newNotification.type === 'board_news') {
        toastBg = 'var(--accent-color)';
        toastTextColor = '#fff';
        toastBorder = '2px solid var(--accent-color)';
        emoji = '📰';
      }

      toast.custom((t) => (
        <div
          className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
          style={{
            background: toastBg,
            color: toastTextColor,
            border: toastBorder,
            padding: '16px 24px',
            borderRadius: '0',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            maxWidth: '400px',
            pointerEvents: 'auto',
            zIndex: 99999,
          }}
          onClick={() => toast.dismiss(t.id)}
        >
          <span style={{ fontSize: '20px' }}>{emoji}</span>
          <div>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', marginBottom: '2px', opacity: 0.9 }}>
              {newNotification.type === 'sensitivity' ? 'Critical Alert' : newNotification.type === 'board_news' ? 'Board News' : 'Announcement'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{newNotification.title}</div>
            <div style={{ fontWeight: 500, fontSize: '12px', opacity: 0.8, display: '-webkit-box', WebKitLineClamp: 2, WebKitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {newNotification.message}
            </div>
          </div>
        </div>
      ), { duration: 6000 });
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
    if (activeRoom && isOpen) {
      markRoomAsRead(activeRoom.roomKey);
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
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadNotificationsCount(0);

      await notificationAPI.markAllRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      
      await notificationAPI.delete(id);
      toast.success('Notification deleted successfully');
      
      // Refresh count
      setNotifications((prev) => {
        const unread = prev.filter((n) => !n.isRead).length;
        setUnreadNotificationsCount(unread);
        return prev;
      });
    } catch (err) {
      console.error(`Failed to delete notification ${id}:`, err);
      toast.error('Failed to delete notification');
      fetchNotifications();
    }
  };

  const markRoomAsRead = async (roomKey) => {
    try {
      // Clear client state unread count immediately for zero-latency response
      setRooms((prev) =>
        prev.map((r) => (r.roomKey === roomKey ? { ...r, unreadCount: 0 } : r))
      );
      
      // Update on server
      await chatAPI.markAsRead(roomKey);
    } catch (err) {
      console.error(`Failed to mark room ${roomKey} as read:`, err);
    }
  };

  // Join a room roomKey (e.g. `tag:exams` or `category:news`)
  const joinRoom = (roomKey) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:joinRoom', { room: roomKey });
      console.log(`Joined socket room: ${roomKey}`);
    }
  };

  // Leave a room roomKey
  const leaveRoom = (roomKey) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:leaveRoom', { room: roomKey });
      console.log(`Left socket room: ${roomKey}`);
    }
  };

  // Helper to open a chat room from anywhere
  const openRoom = (roomType, name) => {
    const roomKey = roomType === 'tag' ? `tag:${name.toLowerCase()}` : `category:${name.toLowerCase()}`;
    
    // Add/Update room in list if it's a tag room and not yet tracked
    setRooms((prev) => {
      const exists = prev.some((r) => r.roomKey === roomKey);
      if (!exists) {
        return [
          ...prev,
          {
            type: roomType,
            name: name.toLowerCase(),
            roomKey,
            unreadCount: 0,
            lastMessage: null,
          },
        ];
      }
      return prev;
    });

    setActiveRoom({
      type: roomType,
      name: name.toLowerCase(),
      roomKey,
    });
    setIsOpen(true);
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
        deleteNotification,
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
