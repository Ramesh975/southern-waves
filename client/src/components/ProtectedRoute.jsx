import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, isAdmin, isEditor, isStudent, isModerator } = useAuth();

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  let hasAccess = false;
  if (allowedRoles.includes('admin') && isAdmin) hasAccess = true;
  else if (allowedRoles.includes('moderator') && isModerator) hasAccess = true;
  else if (allowedRoles.includes('editor') && isEditor) hasAccess = true;
  else if (allowedRoles.includes('student') && isStudent) hasAccess = true;

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
