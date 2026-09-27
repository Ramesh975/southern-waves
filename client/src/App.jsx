import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, resolveValue } from 'react-hot-toast';
import LiquidGlassToast from './components/LiquidGlassToast/LiquidGlassToast';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import ChatPage from './pages/ChatPage';
import MessageApp from './components/MessageApp/MessageApp';

// Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import OnboardingWizardModal from './components/OnboardingWizardModal';

// Public Pages
import HomePage from './pages/HomePage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import GenericCategoryPage from './pages/GenericCategoryPage';
import PicturesSpeakPage from './pages/PicturesSpeakPage';
import SearchPage from './pages/SearchPage';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NewsTagPage from './pages/NewsTagPage';
import NewsMenuPage from './pages/NewsMenuPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import AuthorProfilePage from './pages/AuthorProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsPage from './pages/SettingsPage';
import KnowYourPastPage from './pages/KnowYourPastPage';
import StoriesPage from './pages/StoriesPage';
import UniversityRowPage from './pages/UniversityRowPage';
import NotificationsPage from './pages/NotificationsPage';
import AboutPage from './pages/AboutPage';
import ExploreHistoryPage from './pages/ExploreHistoryPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminArticles from './pages/admin/AdminArticles';
import AdminArticleDetail from './pages/admin/AdminArticleDetail';
import ArticleEditor from './pages/admin/ArticleEditor';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminSubmissionDetail from './pages/admin/AdminSubmissionDetail';
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

const NotFoundPage = () => (
  <main style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
    <p style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 700, color: 'var(--color-red)', lineHeight: 1 }}>404</p>
    <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Page Not Found</p>
    <a href="/" className="btn-submit" style={{ textDecoration: 'none', display: 'inline-block' }}>← Back to Home</a>
  </main>
);


const AppInner = () => {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const { user, isBlocked, refreshUser } = useAuth();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const isCategoryRoute = [
    '/news',
    '/editorial',
    '/features',
    '/university-row',
    '/know-your-past',
    '/tea-shop',
    '/pictures-speak',
  ].includes(pathname) || pathname.startsWith('/tag');
  const isOverlayRoute = pathname.startsWith('/admin') || pathname === '/chat';

  // Check if first-time user needs onboarding or URL explicitly has ?onboarding=true
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('onboarding') === 'true') {
      setOnboardingOpen(true);
    } else if (user && user.hasCompletedOnboarding === false && !pathname.startsWith('/admin')) {
      setOnboardingOpen(true);
    }
  }, [user, location.search, pathname]);

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
        <div className="nm-ambient-blur-left" />
        <div className="nm-ambient-blur-right" />
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
          <Route path="/university-row" element={<NewsMenuPage defaultCategory="university-row" />} />
          <Route path="/know-your-past" element={<KnowYourPastPage />} />
          <Route path="/explore-history" element={<ExploreHistoryPage />} />
          <Route path="/tea-shop" element={<NewsMenuPage defaultCategory="tea-shop" />} />
          <Route path="/tea-shop/:slug" element={<ArticleDetailPage />} />
          <Route path="/pictures-speak" element={<PicturesSpeakPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/author/:identifier" element={<AuthorProfilePage />} />
          <Route path="/author" element={<AuthorProfilePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tag/:tag" element={<NewsTagPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Saved Articles & Author Studio Route */}
          <Route element={<ProtectedRoute allowedRoles={['student', 'moderator', 'editor', 'admin']} />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/saved-articles" element={<SavedArticlesPage />} />
            <Route path="/my-uploads" element={<AuthorProfilePage />} />
            <Route path="/author-studio" element={<AuthorProfilePage />} />
            <Route path="/author/me" element={<AuthorProfilePage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin (no main navbar, handled inside AdminLayout) */}
          <Route element={<ProtectedRoute allowedRoles={['editor', 'admin', 'moderator']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="article/:id" element={<AdminArticleDetail />} />
              <Route path="new-article" element={<ArticleEditor />} />
              <Route path="edit-article/:id" element={<ArticleEditor />} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="submission/:id" element={<AdminSubmissionDetail />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="filters" element={<AdminFilterManager />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="system" element={<AdminSystemCenter />} />
              
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="users" element={<AdminUsers />} />
                <Route path="notifications" element={<AdminNotifications />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {location.pathname === '/' && <Footer />}
      </div>

      {showBlockedOverlay && (
        <BlockedAccountScreen user={user} onAppealSubmitted={refreshUser} />
      )}
      {!isOverlayRoute && <MessageApp />}

      {/* First-Time User Onboarding & Interactive Tutorial Modal */}
      <OnboardingWizardModal 
        isOpen={onboardingOpen} 
        onClose={() => {
          setOnboardingOpen(false);
          const searchParams = new URLSearchParams(location.search);
          if (searchParams.get('onboarding')) {
            searchParams.delete('onboarding');
            navigate({ pathname: location.pathname, search: searchParams.toString() }, { replace: true });
          }
        }}
        onComplete={() => {
          setOnboardingOpen(false);
          const searchParams = new URLSearchParams(location.search);
          if (searchParams.get('onboarding')) {
            searchParams.delete('onboarding');
            navigate({ pathname: location.pathname, search: searchParams.toString() }, { replace: true });
          }
        }}
      />
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
              gutter={12}
              containerStyle={{
                top: 20,
                right: 20,
                zIndex: 999999,
              }}
              toastOptions={{
                duration: 3800,
              }}
            >
              {(t) => {
                if (t.type === 'custom') {
                  return resolveValue(t.message, t);
                }
                return <LiquidGlassToast toast={t} />;
              }}
            </Toaster>
            <AppInner />
          </Router>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
