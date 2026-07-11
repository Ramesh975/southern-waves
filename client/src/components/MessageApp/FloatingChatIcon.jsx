import React from 'react';
import { useChat } from '../../context/ChatContext';
import { FiMessageSquare } from 'react-icons/fi';
import MessageApp from './MessageApp';

const FloatingChatIcon = () => {
  const { totalUnread, isOpen, setIsOpen } = useChat();

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className="floating-chat-icon-container">
        <button 
          className="floating-chat-icon-btn" 
          onClick={handleToggleChat}
          aria-label="Toggle chat channel board"
          title="Open discussion board"
        >
          <FiMessageSquare size={24} />
          {totalUnread > 0 && (
            <span className="floating-chat-badge">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* Slide-in Message App Drawer */}
      <MessageApp />
    </>
  );
};

export default FloatingChatIcon;
