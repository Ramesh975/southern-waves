import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMic, FiFeather, FiRadio } from 'react-icons/fi';

const BOARD_MESSAGES = [
  { type: 'tag', text: '#StudentLife', color: 'var(--nm-accent)' },
  { type: 'speech', text: '"The future belongs to those who speak up."', color: '#fff' },
  { type: 'tag', text: '#CampusVoices', color: 'var(--nm-accent)' },
  { type: 'speech', text: '"Our stories define tomorrow\'s history."', color: '#a5f3fc' },
  { type: 'tag', text: '#KnowYourPast', color: '#fbbf24' },
  { type: 'speech', text: '"Every mind has a tale worth telling."', color: '#fff' },
  { type: 'tag', text: '#Teashop', color: '#86efac' },
  { type: 'tag', text: '#Mind', color: '#8b5cf6' },
  { type: 'speech', text: '"Ground where conversations become legacy."', color: '#c4b5fd' },
];

const QUICK_LINKS = [
  { id: 'home', label: 'Mind', icon: FiFeather, color: '#8b5cf6' },
  { id: 'spoken', label: 'Spoken', icon: FiMic, color: 'var(--nm-accent)' },
  { id: 'ground', label: 'Ground', icon: FiRadio, color: '#a78bfa' },
];

const TraditionalBoard = ({ onTabSwitch }) => {
  const navigate = useNavigate();
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isErasing, setIsErasing] = useState(false);
  const [cursor, setCursor] = useState(true);
  const timeoutRef = useRef(null);
  const charIndexRef = useRef(0);

  const currentMsg = BOARD_MESSAGES[msgIndex];

  const tick = useCallback(() => {
    if (isErasing) {
      if (displayed.length > 0) {
        setDisplayed(prev => prev.slice(0, -1));
        timeoutRef.current = setTimeout(tick, 28);
      } else {
        setIsErasing(false);
        setIsTyping(true);
        setMsgIndex(i => (i + 1) % BOARD_MESSAGES.length);
        charIndexRef.current = 0;
      }
    } else if (isTyping) {
      const target = BOARD_MESSAGES[msgIndex]?.text || '';
      if (charIndexRef.current < target.length) {
        setDisplayed(target.slice(0, charIndexRef.current + 1));
        charIndexRef.current += 1;
        const delay = target[charIndexRef.current - 1] === ' ' ? 60 : 38;
        timeoutRef.current = setTimeout(tick, delay);
      } else {
        // Done typing, pause then erase
        setIsTyping(false);
        timeoutRef.current = setTimeout(() => setIsErasing(true), 2800);
      }
    }
  }, [isTyping, isErasing, displayed, msgIndex]);

  useEffect(() => {
    timeoutRef.current = setTimeout(tick, 120);
    return () => clearTimeout(timeoutRef.current);
  }, [tick]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(interval);
  }, []);

  const handleQuickNav = (tabId) => {
    if (onTabSwitch) {
      onTabSwitch(tabId);
    }
  };

  return (
    <div className="ts-board-wrap">
      {/* Chalk board */}
      <div className="ts-board">
        {/* Chalkboard texture grain */}
        <div className="ts-board-grain" />

        {/* Header */}
        <div className="ts-board-header">
          <span className="ts-board-label">CIRCULAR</span>
          <div className="ts-board-dots">
            <span /><span /><span />
          </div>
        </div>

        {/* Typing area */}
        <div className="ts-board-typing-area">
          <span
            className="ts-board-typed-text"
            style={{ color: currentMsg?.color || '#fff' }}
          >
            {displayed}
            <span className={`ts-board-cursor${cursor ? ' visible' : ''}`}>|</span>
          </span>

          {/* Chalk dust effect */}
          {isErasing && <div className="ts-board-dust" />}
        </div>

        {/* Board ledge */}
        <div className="ts-board-ledge">
          <div className="ts-board-chalk" />
          <div className="ts-board-chalk" />
          <div className="ts-board-chalk thin" />
        </div>
      </div>

      {/* Quick nav row */}
      <div className="ts-board-nav-row">
        <span className="ts-board-nav-label">Jump to</span>
        <div className="ts-board-nav-pills">
          {QUICK_LINKS.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                className="ts-board-nav-pill"
                style={{ '--pill-color': link.color }}
                onClick={() => handleQuickNav(link.id)}
              >
                <Icon size={13} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TraditionalBoard;
