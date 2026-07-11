import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import ChatPage from './pages/ChatPage';
import MessageApp from './components/MessageApp/MessageApp';

// Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import HomePage from './pages/HomePage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import GenericCategoryPage from './pages/GenericCategoryPage';
import PicturesSpeakPage from './pages/PicturesSpeakPage';
import SearchPage from './pages/SearchPage';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NewsTagPage from './pages/NewsTagPage';
import NewsMenuPage from './pages/NewsMenuPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import MyUploadsPage from './pages/MyUploadsPage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsPage from './pages/SettingsPage';
import KnowYourPastPage from './pages/KnowYourPastPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminArticles from './pages/admin/AdminArticles';
import ArticleEditor from './pages/admin/ArticleEditor';
import AdminComments from './pages/admin/AdminComments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminModerationPage from './pages/admin/AdminModerationPage';
import AdminFilterManager from './pages/admin/AdminFilterManager';
import AdminSecurity from './pages/admin/AdminSecurity';

import AdminSystemCenter from './pages/admin/AdminSystemCenter';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import BlockedAccountScreen from './components/BlockedAccountScreen';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// Scroll-to-top button
const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      className={`scroll-top${visible ? ' visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
    >
      ↑
    </button>
  );
};

// About page (simple)
const AboutPage = () => (
  <main style={{ padding: '48px 0' }}>
    <div className="container" style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, textTransform: 'uppercase', marginBottom: 24 }}>About Us</h1>
      <div className="rule-thick" style={{ marginBottom: 32 }} />
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24, color: 'var(--color-gray-800)' }}>
        Southern Waves is a student-run media platform dedicated to enlightening young minds across different walks of life.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--color-gray-700)', marginBottom: 16 }}>
        We are a medium for students to share information, voice their concerns, and celebrate their culture. From breaking campus news and sharp editorials to book reviews, historical explorations, and photographic essays — Southern Waves covers it all.
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--color-gray-700)', marginBottom: 16 }}>
        Our mission is to bring students from different walks of life to travel on the same path — united by knowledge, curiosity, and the courage to speak truth.
      </p>
      <div style={{ marginTop: 40, padding: 24, background: 'var(--color-black)', color: 'var(--color-white)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-red)', marginBottom: 8 }}>Our Sections</p>
        {[
          ['📰 News', 'Student initiatives, campus problems, and student laws'],
          ['✍️ Editorial', 'Multi-perspective analysis of current and unspoken stories'],
          ['🎬 Features', 'Human interest stories, book and film reviews'],
          ['📖 Know Your Past', 'Historical events that shaped student movements'],
          ['☕ Tea Shop', 'Official circulars, student voices, and university happenings'],
          ["📷 Picture's Speak", 'Photography conveying society\'s untold stories'],
        ].map(([title, desc]) => (
          <div key={title} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{title}</p>
            <p style={{ fontSize: 13, color: 'var(--color-gray-400)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </main>
);

const NotFoundPage = () => (
  <main style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
    <p style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 700, color: 'var(--color-red)', lineHeight: 1 }}>404</p>
    <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Page Not Found</p>
    <a href="/" className="btn-submit" style={{ textDecoration: 'none', display: 'inline-block' }}>← Back to Home</a>
  </main>
);


const AppInner = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isBlocked, refreshUser } = useAuth();
  const isCategoryRoute = [
    '/news',
    '/editorial',
    '/features',
    '/know-your-past',
    '/tea-shop',
    '/pictures-speak',
  ].includes(pathname) || pathname.startsWith('/tag');
  const isOverlayRoute = pathname.startsWith('/admin') || pathname === '/chat';

  // Show blocked screen as overlay if user is logged in, blocked, and trying to access admin panel
  const isRestrictedPath = pathname.startsWith('/admin');
  const showBlockedOverlay = isBlocked && user && isRestrictedPath;

  return (
    <>
      {isBlocked && user && (
        <div style={{
          background: 'linear-gradient(90deg, #7f1d1d 0%, #b91c1c 100%)',
          color: '#fee2e2',
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          zIndex: 10000,
          position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <span>⚠️</span>
          <span>Account Restricted: You are currently in read-only mode due to community guidelines violation.</span>
          <button 
            onClick={() => navigate('/settings?tab=status')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: '12px',
              transition: 'background 0.2s'
            }}
          >
            View Details & Appeal
          </button>
        </div>
      )}

      <div 
        className={showBlockedOverlay ? 'restricted-view-container' : ''}
        style={showBlockedOverlay ? { pointerEvents: 'none', userSelect: 'none' } : {}}
      >
        {!isOverlayRoute && (
          <Navbar />
        )}
        <ScrollToTop />
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:slug" element={<ArticleDetailPage />} />
          <Route path="/news" element={<NewsMenuPage defaultCategory="news" />} />
          <Route path="/editorial" element={<NewsMenuPage defaultCategory="editorial" />} />
          <Route path="/features" element={<NewsMenuPage defaultCategory="features" />} />
          <Route path="/know-your-past" element={<KnowYourPastPage />} />
          <Route path="/tea-shop" element={<NewsMenuPage defaultCategory="tea-shop" />} />
          <Route path="/pictures-speak" element={<PicturesSpeakPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tag/:tag" element={<NewsTagPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Saved Articles & Onboarding Route */}
          <Route element={<ProtectedRoute allowedRoles={['student', 'moderator', 'editor', 'admin']} />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/saved-articles" element={<SavedArticlesPage />} />
            <Route path="/my-uploads" element={<MyUploadsPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin (no main navbar, handled inside AdminLayout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            
            <Route element={<ProtectedRoute allowedRoles={['editor', 'admin']} />}>
              <Route path="articles" element={<AdminArticles />} />
              <Route path="new-article" element={<ArticleEditor />} />
              <Route path="edit-article/:id" element={<ArticleEditor />} />
              <Route path="submissions" element={<AdminSubmissions />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['editor', 'admin', 'moderator']} />}>
              <Route path="comments" element={<AdminComments />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="filters" element={<AdminFilterManager />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="system" element={<AdminSystemCenter />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="users" element={<AdminUsers />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {!isOverlayRoute && <Footer />}
      </div>

      {showBlockedOverlay && (
        <BlockedAccountScreen user={user} onAppealSubmitted={refreshUser} />
      )}
      {!isOverlayRoute && <MessageApp />}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '2px solid #0d0d0d',
                  borderRadius: 0,
                },
              }}
            />
            <AppInner />
          </Router>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
