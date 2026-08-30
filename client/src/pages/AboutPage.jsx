import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  FiFileText, FiEdit3, FiTv, FiBookOpen, 
  FiCoffee, FiCamera, FiUsers, FiAward, 
  FiTarget, FiMessageSquare, FiArrowRight 
} from 'react-icons/fi';

const AboutPage = () => {
  const { theme, themeEngine } = useTheme();
  
  const isLight = theme === 'light';
  const isBlack = theme === 'black';
  const isExpressive = themeEngine === 'expressive';

  // Dynamic colors
  const baseBg = isLight ? '#fbf9f5' : (isBlack ? '#000000' : '#151515');
  const cardBg = isLight ? '#ffffff' : (isBlack ? '#0a0b10' : '#1c1d24');
  const textColor = isLight ? '#0d0d0d' : '#ffffff';
  const textSecondary = isLight ? '#4a5568' : '#a0aec0';
  const borderColor = isLight ? '#e2e8f0' : (isBlack ? '#1a1b24' : '#2d3748');

  // Dynamic shapes based on Theme Engine
  const radiusLg = isExpressive ? '24px' : '12px';
  const radiusMd = isExpressive ? '16px' : '8px';
  const shadowStyle = isLight 
    ? (isExpressive ? 'var(--shadow-lg)' : '0 4px 12px rgba(0,0,0,0.05)')
    : (isBlack ? 'none' : '0 10px 30px rgba(0,0,0,0.3)');

  const sections = [
    {
      title: '📰 News',
      desc: 'Student initiatives, campus issues, and academic policies affecting the student body.',
      icon: <FiFileText size={20} style={{ color: 'var(--accent-color)' }} />
    },
    {
      title: '✍️ Editorial',
      desc: 'Multi-perspective analysis and sharp commentary of current and unspoken stories.',
      icon: <FiEdit3 size={20} style={{ color: 'var(--accent-color)' }} />
    },
    {
      title: '🎬 Features',
      desc: 'Human interest stories, college culture, book analyses, and film reviews.',
      icon: <FiTv size={20} style={{ color: 'var(--accent-color)' }} />
    },
    {
      title: '📖 Know Your Past',
      desc: 'Historical events, archived stories, and movements that shaped our campus communities.',
      icon: <FiBookOpen size={20} style={{ color: 'var(--accent-color)' }} />
    },
    {
      title: '☕ Tea Shop',
      desc: 'Official circulars, student discussions, gossip, and campus conversations.',
      icon: <FiCoffee size={20} style={{ color: 'var(--accent-color)' }} />
    },
    {
      title: '📷 Picture\'s Speak',
      desc: 'Visual journalism conveying raw society stories through photography.',
      icon: <FiCamera size={20} style={{ color: 'var(--accent-color)' }} />
    }
  ];

  const stats = [
    { value: '150+', label: 'Stories Published', icon: <FiFileText /> },
    { value: '20+', label: 'Colleges Engaged', icon: <FiUsers /> },
    { value: '10K+', label: 'Monthly Readers', icon: <FiTarget /> },
    { value: '30+', label: 'Student Contributors', icon: <FiAward /> }
  ];

  const coreValues = [
    {
      title: 'Truth & Integrity',
      desc: 'Ensuring honest, verified reporting without compromises or external influences.'
    },
    {
      title: 'Amplifying Voices',
      desc: 'Creating space for underrepresented perspectives and student concerns.'
    },
    {
      title: 'Creative Expression',
      desc: 'Fostering diverse storytelling styles, from written pieces to photo essays.'
    }
  ];

  return (
    <main style={{ 
      background: baseBg, 
      color: textColor, 
      minHeight: '100vh', 
      padding: '64px 0', 
      transition: 'background 0.3s ease, color 0.3s ease' 
    }}>
      <div className="container" style={{ maxWidth: 860, padding: '0 20px' }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: 54 }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display, "Outfit", sans-serif)', 
            fontSize: 'calc(2.5rem + 1vw)', 
            fontWeight: 800, 
            letterSpacing: '-0.04em',
            marginBottom: 16 
          }}>
            About <span style={{ color: 'var(--accent-color)' }}>Southern Waves</span>
          </h1>
          <p style={{ 
            fontFamily: 'var(--font-serif, "Playfair Display", serif)', 
            fontSize: 20, 
            fontStyle: 'italic', 
            lineHeight: 1.7, 
            color: isLight ? '#475569' : '#cbd5e1',
            maxWidth: 680,
            margin: '0 auto 24px'
          }}>
            Enlightening young minds across different walks of life.
          </p>
          <div style={{ 
            width: 80, 
            height: 4, 
            background: 'var(--accent-color)', 
            borderRadius: 2, 
            margin: '0 auto' 
          }} />
        </section>

        {/* Introduction Section */}
        <section style={{ marginBottom: 56 }}>
          <div style={{
            background: cardBg,
            borderRadius: radiusLg,
            padding: 32,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowStyle,
            lineHeight: 1.8,
            fontSize: 16
          }}>
            <p style={{ marginBottom: 20 }}>
              <strong>Southern Waves</strong> is an independent, student-run campus journalism and media platform. We are dedicated to providing students with high-quality news coverage, thought-provoking editorials, creative photo essays, and academic insights.
            </p>
            <p style={{ marginBottom: 0 }}>
              Our mission is to establish a bridge across collegiate borders, uniting student writers, thinkers, and photographers under a shared dedication to truth, culture, and progress. We believe that campus media plays a crucial role in giving voice to students and holding institutions accountable.
            </p>
          </div>
        </section>

        {/* Stats Row */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
            gap: 16 
          }}>
            {stats.map((s, idx) => (
              <div key={idx} style={{
                background: cardBg,
                borderRadius: radiusMd,
                border: `1px solid ${borderColor}`,
                boxShadow: shadowStyle,
                padding: '24px 16px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  color: 'var(--accent-color)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginBottom: 10,
                  fontSize: 20 
                }}>
                  {s.icon}
                </div>
                <h3 style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontSize: 28, 
                  fontWeight: 800, 
                  margin: '0 0 4px 0' 
                }}>
                  {s.value}
                </h3>
                <p style={{ 
                  fontSize: 13, 
                  color: textSecondary, 
                  margin: 0,
                  fontWeight: 600
                }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Sections Grid */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 24, 
            fontWeight: 800, 
            marginBottom: 28,
            textAlign: 'center'
          }}>
            Our Editorial Sections
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: 20 
          }}>
            {sections.map((sec, idx) => (
              <div key={idx} style={{
                background: cardBg,
                borderRadius: radiusMd,
                border: `1px solid ${borderColor}`,
                boxShadow: shadowStyle,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {sec.icon}
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                    {sec.title.split(' ').slice(1).join(' ')}
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
                  {sec.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Values Section */}
        <section style={{ marginBottom: 64 }}>
          <div style={{
            background: cardBg,
            borderRadius: radiusLg,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowStyle,
            padding: 32
          }}>
            <h2 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: 22, 
              fontWeight: 800, 
              marginBottom: 24,
              textAlign: 'center'
            }}>
              Our Core Principles
            </h2>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 24 
            }}>
              {coreValues.map((v, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 6,
                  borderBottom: idx < coreValues.length - 1 ? `1px solid ${borderColor}` : 'none',
                  paddingBottom: idx < coreValues.length - 1 ? 16 : 0
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--accent-color)' }}>
                    {idx + 1}. {v.title}
                  </h3>
                  <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ 
          textAlign: 'center', 
          background: isLight ? 'rgba(0, 85, 164, 0.04)' : 'rgba(255, 255, 255, 0.02)',
          borderRadius: radiusLg,
          padding: '40px 24px',
          border: `1px dashed ${isLight ? 'var(--accent-color)' : borderColor}`
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 22, 
            fontWeight: 800, 
            marginBottom: 12 
          }}>
            Want to contribute to Southern Waves?
          </h2>
          <p style={{ 
            fontSize: 15, 
            color: textSecondary, 
            maxWidth: 500, 
            margin: '0 auto 24px',
            lineHeight: 1.6
          }}>
            Whether you are a writer, editor, visual artist, or web programmer, your perspective is valuable to our community.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link 
              to="/settings?tab=contribute"
              className="btn btn-primary"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: radiusMd,
                fontWeight: 700,
                background: 'var(--accent-color)',
                color: '#ffffff',
                boxShadow: isLight ? '0 4px 14px rgba(0, 85, 164, 0.25)' : 'none'
              }}
            >
              Apply to Write <FiArrowRight />
            </Link>
            <Link 
              to="/chat"
              className="btn"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: radiusMd,
                fontWeight: 700,
                border: `1px solid ${borderColor}`,
                background: cardBg,
                color: textColor
              }}
            >
              <FiMessageSquare /> Join the Chat
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
};

export default AboutPage;
