import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(() => {
    return localStorage.getItem('sw_orig_admin') || null;
  });

  useEffect(() => {
    authAPI.getMe()
      .then((res) => {
        setUser(res.data.data);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('sw_token');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem('sw_token');
      localStorage.removeItem('sw_orig_admin');
      setImpersonating(null);
    };
    const handleStatusChange = (e) => {
      const data = e.detail;
      setUser((prevUser) => {
        if (!prevUser || prevUser._id !== data.userId) return prevUser;
        return {
          ...prevUser,
          isBlocked: data.isBlocked,
          blockedReason: data.blockedReason,
          blockedUntil: data.blockedUntil,
          appealRequested: data.appealRequested,
          appealMessage: data.appealMessage,
        };
      });
      // Trigger toast message for block/unblock updates in real time
      if (data.isBlocked) {
        toast.error('Your account has been restricted.', { id: 'status-alert', duration: 4000 });
      } else {
        toast.success('Your account restrictions have been lifted.', { id: 'status-alert', duration: 4000 });
      }
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    window.addEventListener('auth:status-change', handleStatusChange);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.removeEventListener('auth:status-change', handleStatusChange);
    };
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data.token) {
      localStorage.setItem('sw_token', res.data.token);
    }
    setUser(res.data.user);
    return res.data;
  };

  const register = async (nameOrUserData, email, password) => {
    let payload;
    if (typeof nameOrUserData === 'object' && nameOrUserData !== null) {
      payload = nameOrUserData;
    } else {
      payload = { name: nameOrUserData, email, password };
    }
    const res = await authAPI.register(payload);
    if (res.data.token) {
      localStorage.setItem('sw_token', res.data.token);
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_orig_admin');
    setImpersonating(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.data);
      return res.data.data;
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await authAPI.changePassword({ currentPassword, newPassword });
    return res.data;
  };

  const deactivateAccount = async (password, reason) => {
    const res = await authAPI.deactivateAccount({ password, reason });
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_orig_admin');
    setUser(null);
    return res.data;
  };

  const switchAccount = async (targetUserId) => {
    const currentAdminId = user?._id;
    const res = await authAPI.switchAccount(targetUserId);
    if (res.data.token) {
      localStorage.setItem('sw_token', res.data.token);
    }
    if (currentAdminId) {
      localStorage.setItem('sw_orig_admin', currentAdminId);
      setImpersonating(currentAdminId);
    }
    setUser(res.data.user);
    toast.success(`Switched account to @${res.data.user.username}`);
    return res.data;
  };

  const revertToAdmin = async () => {
    const origId = impersonating || localStorage.getItem('sw_orig_admin');
    if (!origId) return;
    const res = await authAPI.revertAccount(origId);
    if (res.data.token) {
      localStorage.setItem('sw_token', res.data.token);
    }
    localStorage.removeItem('sw_orig_admin');
    setImpersonating(null);
    setUser(res.data.user);
    toast.success('Returned to Administrator account');
    return res.data;
  };

  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isAdmin;
  const isEditor = user?.role === 'editor' || isAdmin;
  const isStudent = user?.role === 'student';

  // Check if user is currently blocked (handles timed block client-side)
  const isBlocked = (() => {
    if (!user?.isBlocked) return false;
    if (user?.blockedUntil && new Date() > new Date(user.blockedUntil)) return false;
    return true;
  })();

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout,
      isAdmin, isModerator, isEditor, isStudent, isBlocked,
      refreshUser, changePassword, deactivateAccount,
      impersonating, switchAccount, revertToAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
