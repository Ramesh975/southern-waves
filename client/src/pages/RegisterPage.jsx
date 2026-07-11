import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    university: '',
    academicMajor: '',
    yearOfStudy: 'Freshman',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → go home
  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return toast.error('First and Last name are required');
    }
    if (!form.university.trim()) {
      return toast.error('University/College is required');
    }
    if (!form.phone.trim()) {
      return toast.error('Phone number is required');
    }
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setSubmitting(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        university: form.university.trim(),
        academicMajor: form.academicMajor,
        yearOfStudy: form.yearOfStudy,
        password: form.password
      });
      toast.success('Account created! Let\'s personalize your recommendations!');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '500px', width: '100%' }}>
        <p className="auth-logo">Southern Waves</p>
        <p className="auth-subtitle">Create your account and join the student movement</p>
        <form onSubmit={handleSubmit}>
          {/* First Name & Last Name */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-first-name">First Name</label>
              <input
                id="reg-first-name"
                type="text"
                className="form-input"
                placeholder="John"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-last-name">Last Name</label>
              <input
                id="reg-last-name"
                type="text"
                className="form-input"
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {/* Phone Number & University */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-phone">Phone Number</label>
              <input
                id="reg-phone"
                type="text"
                className="form-input"
                placeholder="9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1.2 }}>
              <label className="form-label" htmlFor="reg-university">University/College</label>
              <input
                id="reg-university"
                type="text"
                className="form-input"
                placeholder="Southern University"
                value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Academic Major & Year of Study */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-major">Academic Major</label>
              <select
                id="reg-major"
                className="form-input"
                value={form.academicMajor}
                onChange={(e) => setForm({ ...form, academicMajor: e.target.value })}
                required
                style={{ height: '46px', background: 'var(--color-white)', color: 'var(--color-black)' }}
              >
                <option value="">Select Major</option>
                <option value="Computer Science">Computer Science & IT</option>
                <option value="Engineering">Engineering & Tech</option>
                <option value="Business">Business & Management</option>
                <option value="Social Sciences">Social Sciences & Journalism</option>
                <option value="Sciences">Sciences & Mathematics</option>
                <option value="Literature">Literature & Linguistics</option>
                <option value="Medicine">Medicine & Healthcare</option>
                <option value="Arts">Arts & Design</option>
                <option value="Other">Other / General</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-year">Year of Study</label>
              <select
                id="reg-year"
                className="form-input"
                value={form.yearOfStudy}
                onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
                required
                style={{ height: '46px', background: 'var(--color-white)', color: 'var(--color-black)' }}
              >
                <option value="Freshman">Freshman</option>
                <option value="Sophomore">Sophomore</option>
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="Min. 6 chars"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                className="form-input"
                placeholder="Confirm"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '8px' }}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
