import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TopBar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="topbar">
      <div className="container topbar-inner">
        <div className="topbar-date">
          📅 {format(new Date(), 'eeee, MMMM dd, yyyy')}
        </div>
        <div className="topbar-auth">
          {user ? (
            <>
              <span className="topbar-user">Welcome, <strong>{user.name}</strong></span>
              <span className="topbar-separator">|</span>
              <button className="topbar-btn" onClick={logout}>Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="topbar-link">Student Login</Link>
              <span className="topbar-separator">|</span>
              <Link to="/register" className="topbar-link">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
