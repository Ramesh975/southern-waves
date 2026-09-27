import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, isAdmin, isEditor, isStudent, isModerator } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-spinner" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
