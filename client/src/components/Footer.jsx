import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiArrowUp, 
  FiCompass, 
  FiBookOpen, 
  FiMessageSquare, 
  FiMail, 
  FiBookmark, 
  FiUser, 
  FiSearch,
  FiCamera,
  FiClock,
  FiFeather
} from 'react-icons/fi';

const CATEGORIES = [
  { label: 'News', path: '/news' },
  { label: 'Editorial', path: '/editorial' },
  { label: 'Features', path: '/features' },
  { label: 'Tea Shop', path: '/tea-shop' },
  { label: "Picture's Speak", path: '/pictures-speak' },
  { label: 'Know Your Past', path: '/know-your-past' },
];

const EXPLORE_LINKS = [
  { label: 'About Southern Waves', path: '/about', icon: FiCompass },
  { label: 'Explore History Timeline', path: '/explore-history', icon: FiClock },
  { label: 'Search Archives', path: '/search', icon: FiSearch },
  { label: 'Saved Articles', path: '/saved-articles', icon: FiBookmark },
  { label: 'Author Studio', path: '/author-studio', icon: FiUser },
];

const COMMUNITY_LINKS = [
  { label: 'Tea Shop Campus Voices', path: '/tea-shop', icon: FiFeather },
  { label: 'Visual Photo Essays', path: '/pictures-speak', icon: FiCamera },
  { label: 'Campus Discussion Hub', path: '/chat', icon: FiMessageSquare },
];

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToNewsletter = (e) => {
    e.preventDefault();
    const newsletterEl = document.querySelector('.newsletter-band') || document.querySelector('.newsletter-form');
    if (newsletterEl) {
      newsletterEl.scrollIntoView({ behavior: 'smooth' });
      const inputEl = newsletterEl.querySelector('input[type="email"]');
      if (inputEl) inputEl.focus();
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          
          {/* Brand Column */}
          <div className="footer-brand">
            <Link to="/" style={{ textDecoration: 'none' }} onClick={scrollToTop}>
              <div className="footer-logo">Southern Waves</div>
            </Link>
            <p className="footer-desc">
              A student medium to share information, elevate untold campus stories, and enlighten young minds across Tamil Nadu. Empowering student voices and independent journalism.
            </p>
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--color-gray-400)', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span>Independent Student Press</span>
            </div>
          </div>

          {/* Categories Column */}
          <div>
            <p className="footer-heading">Categories</p>
            <div className="footer-links">
              {CATEGORIES.map((cat) => (
                <Link key={cat.path} to={cat.path} className="footer-link">
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Navigate / Explore Column */}
          <div>
            <p className="footer-heading">Explore</p>
            <div className="footer-links">
              {EXPLORE_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={12} style={{ opacity: 0.7 }} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Community & Newsletter Column */}
          <div>
            <p className="footer-heading">Community</p>
            <div className="footer-links">
              {COMMUNITY_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={12} style={{ opacity: 0.7 }} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <a 
                href="#newsletter" 
                onClick={scrollToNewsletter} 
                className="footer-link" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              >
                <FiMail size={12} style={{ opacity: 0.7 }} />
                <span>Subscribe Newsletter</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Southern Waves. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Made with passion by student journalists across Tamil Nadu.</span>
            <button
              type="button"
              onClick={scrollToTop}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-gray-400)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-400)'}
            >
              <FiArrowUp size={13} />
              <span>Back to Top</span>
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

