import React, { useState, useEffect, useRef } from 'react';
import { chatAPI, filterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiX, FiSend, FiSearch, FiEdit2, FiCopy, FiSmile, FiTag, FiRadio } from 'react-icons/fi';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const GlobalChatModal = ({ onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [activeTag, setActiveTag] = useState(''); // When a tag is selected to filter
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [loading, setLoading] = useState(true);
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
  
  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Reactions popup
  const [showReactionMenu, setShowReactionMenu] = useState(null); // messageId

  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  // Load messages
  useEffect(() => {
    fetchMessages(activeTag);

    // Socket.io Connection
    socketRef.current = io(SOCKET_URL, { withCredentials: true });

    socketRef.current.on('chat:message', (message) => {
      // If we are filtering by a tag, only append if the message has that tag
      setMessages((prev) => {
        if (activeTag && !message.tags?.includes(activeTag.toLowerCase())) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
    });

    socketRef.current.on('chat:messageEdited', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
      );
    });

    socketRef.current.on('chat:messageReacted', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
      );
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeTag]);

  const fetchMessages = async (tag) => {
    setLoading(true);
    try {
      const params = {};
      if (tag) params.tag = tag;
      const res = await chatAPI.getMessages(params);
      setMessages(res.data.data);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load global chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveTag(searchTag.trim());
  };

  const clearSearch = () => {
    setSearchTag('');
    setActiveTag('');
  };

  const extractTags = (text) => {
    const regex = /#[\w-]+/g;
    const matches = text.match(regex);
    return matches ? matches.map((t) => t.slice(1).toLowerCase()) : [];
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    if (globalChatLock && !isAdmin) {
      return toast.error('Chat is temporarily locked.');
    }

    try {
      const tags = extractTags(newMessage);
      // Ensure the active tag is included if they are chatting inside a specific tag context
      if (activeTag && !tags.includes(activeTag.toLowerCase())) {
        tags.push(activeTag.toLowerCase());
      }

      await chatAPI.sendMessage({
        text: newMessage.trim(),
        category: 'global',
        tags,
        isBroadcast,
      });
      setNewMessage('');
      setIsBroadcast(false);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingId) return;

    try {
      const tags = extractTags(editText);
      await chatAPI.editMessage(editingId, { text: editText.trim(), tags });
      setEditingId(null);
      setEditText('');
      toast.success('Message updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit message');
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await chatAPI.reactToMessage(messageId, emoji);
      setShowReactionMenu(null);
    } catch (err) {
      toast.error('Failed to react');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const canEdit = (msg) => {
    if (!user || msg.user._id !== user._id) return false;
    const fifteenMins = 15 * 60 * 1000;
    const timeElapsed = Date.now() - new Date(msg.createdAt).getTime();
    return timeElapsed <= fifteenMins;
  };

  const renderReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return null;
    const reactionCounts = {};
    reactions.forEach((r) => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });

    return (
      <div className="chat-reactions-display">
        {Object.entries(reactionCounts).map(([emoji, count]) => (
          <span key={emoji} className="chat-reaction-badge">
            {emoji} {count}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="global-chat-overlay" onClick={onClose}>
      <div className="global-chat-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="global-chat-header">
          <div className="global-chat-header-title">
            <FiRadio size={20} />
            <h2>Global Chat</h2>
          </div>
          <button className="global-chat-close" onClick={onClose}><FiX size={24} /></button>
        </div>

        {/* Toolbar: Search tags */}
        <div className="global-chat-toolbar">
          <form onSubmit={handleSearch} className="global-chat-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search or filter by tag..."
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
            />
            {activeTag && (
              <button type="button" onClick={clearSearch} className="clear-search-btn">
                <FiX />
              </button>
            )}
          </form>
          {activeTag && (
            <div className="active-tag-badge">
              <FiTag size={12} /> {activeTag}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="global-chat-messages">
          {loading ? (
            <div className="loading-spinner" style={{ margin: 'auto' }} />
          ) : messages.length === 0 ? (
            <div className="empty-chat">No messages found. Start the conversation!</div>
          ) : (
            messages.map((msg) => {
              const isMe = user && msg.user?._id === user._id;
              const isBeingEdited = editingId === msg._id;

              return (
                <div key={msg._id} className={`chat-message ${isMe ? 'me' : ''} ${msg.isBroadcast ? 'broadcast' : ''}`}>
                  {!isMe && (
                    <img
                      src={msg.user?.avatar ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${msg.user.avatar}` : 'https://placehold.co/32'}
                      alt={msg.user?.name}
                      className="chat-avatar"
                    />
                  )}
                  <div className="chat-bubble-container">
                    <div className="chat-meta">
                      <span className="chat-name">{msg.user?.name}</span>
                      <span className="chat-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.isBroadcast && <span className="broadcast-badge">BROADCAST</span>}
                    </div>

                    {isBeingEdited ? (
                      <div className="chat-edit-box">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                        />
                        <div className="chat-edit-actions">
                          <button onClick={() => setEditingId(null)}>Cancel</button>
                          <button onClick={handleSaveEdit} className="save-btn">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="chat-bubble">
                        {msg.text}
                        {msg.isEdited && <span className="edited-mark">(edited)</span>}
                      </div>
                    )}

                    {renderReactions(msg.reactions)}

                    {/* Action Buttons (Copy, Edit, React) */}
                    <div className="chat-actions">
                      <button onClick={() => setShowReactionMenu(msg._id === showReactionMenu ? null : msg._id)} title="React">
                        <FiSmile size={14} />
                      </button>
                      <button onClick={() => handleCopy(msg.text)} title="Copy">
                        <FiCopy size={14} />
                      </button>
                      {canEdit(msg) && !isBeingEdited && (
                        <button onClick={() => {
                          setEditingId(msg._id);
                          setEditText(msg.text);
                        }} title="Edit (15 min window)">
                          <FiEdit2 size={14} />
                        </button>
                      )}

                      {/* Emoji Picker Popup */}
                      {showReactionMenu === msg._id && (
                        <div className="chat-reaction-menu">
                          {EMOJIS.map((em) => (
                            <button key={em} onClick={() => handleReaction(msg._id, em)}>{em}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Area */}
        <div className="global-chat-input-area">
          {!user ? (
            <div className="login-prompt">Please log in to participate in the global chat.</div>
          ) : globalChatLock && !isAdmin ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '13px',
              color: '#ef4444',
              background: '#fef2f2',
              border: '2px solid var(--color-black)',
              boxShadow: '3px 3px 0 var(--color-black)'
            }}>
              🔒 Chat has been temporarily disabled globally by the administrator.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="global-chat-form">
              <div className="input-row">
                <input
                  type="text"
                  placeholder="Type a message... Use #tag to tag."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="chat-text-input"
                />
                <button type="submit" disabled={!newMessage.trim()} className="send-btn">
                  <FiSend size={18} />
                </button>
              </div>
              <div className="options-row">
                <label className="broadcast-toggle">
                  <input
                    type="checkbox"
                    checked={isBroadcast}
                    onChange={(e) => setIsBroadcast(e.target.checked)}
                  />
                  <span>Broadcast this message</span>
                </label>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default GlobalChatModal;
