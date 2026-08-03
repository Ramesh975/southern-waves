/**
 * Returns the public display name for a user based on their privacy settings and viewer's role.
 *
 * @param {Object} user - The user / author object to display
 * @param {Object} currentUser - The currently logged-in user viewing the content
 * @returns {string} Display name string (e.g. "John Alex (@john_alex)" when enabled, or "@john_alex" when disabled)
 */
export const getDisplayName = (user, currentUser = null) => {
  if (!user) return 'Anonymous';

  const realName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const rawUsername = user.username || (user.email ? user.email.split('@')[0] : '');
  const handle = rawUsername ? (rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`) : '';

  const isViewerAdminOrMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

  // If viewer is Admin/Mod or if user enabled "Show Real Name Publicly"
  if (isViewerAdminOrMod || user.showRealNamePublicly) {
    if (realName && handle) return `${realName} (${handle})`;
    return realName || handle || 'Student';
  }

  // Default system-wide behavior: show Username (@username)
  if (handle) {
    return handle;
  }

  // Fallback
  return realName || 'Student';
};
