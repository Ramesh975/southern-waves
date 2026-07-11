import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach JWT to every request as fallback (for testing/compatibility)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor to handle expired access tokens via refresh token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => API(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await API.post('/auth/refresh');
        isRefreshing = false;
        processQueue(null);
        return API(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  logout: () => API.post('/auth/logout'),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/me', data),
  saveArticle: (id) => API.post(`/auth/me/saved/${id}`),
  unsaveArticle: (id) => API.delete(`/auth/me/saved/${id}`),
  getAllUsers: () => API.get('/auth/users'),
  updateUserRole: (id, role) => API.put(`/auth/users/${id}/role`, { role }),
  // Moderation
  blockUser: (id, data) => API.put(`/auth/users/${id}/block`, data),
  unblockUser: (id) => API.put(`/auth/users/${id}/unblock`),
  submitAppeal: (message) => API.post('/auth/appeal', { message }),
  getAppeals: () => API.get('/auth/appeals'),
  rejectAppeal: (id, response) => API.put(`/auth/users/${id}/reject-appeal`, { response }),
};

// --- Articles ---
export const articleAPI = {
  getAll: (params) => API.get('/articles', { params }),
  getMostRead: (params) => API.get('/articles/most-read', { params }),
  getMostLiked: (params) => API.get('/articles/most-liked', { params }),
  getBySlug: (slug) => API.get(`/articles/${slug}`),
  getTrending: (params) => API.get('/articles/trending', { params }),
  getTrendingTags: (params) => API.get('/articles/tags/trending', { params }),
  getRecommendations: (params) => API.get('/articles/recommendations', { params }),
  create: (data) => API.post('/articles', data),
  update: (id, data) => API.put(`/articles/${id}`, data),
  delete: (id) => API.delete(`/articles/${id}`),
  share: (id) => API.post(`/articles/${id}/share`),
  like: (id) => API.post(`/articles/${id}/like`),
  dislike: (id) => API.post(`/articles/${id}/dislike`),
};

// --- Comments ---
export const commentAPI = {
  getForArticle: (articleId) => API.get(`/articles/${articleId}/comments`),
  add: (articleId, data) => API.post(`/articles/${articleId}/comments`, data),
  approve: (id) => API.put(`/comments/${id}/approve`),
  delete: (id) => API.delete(`/comments/${id}`),
  getPending: () => API.get('/comments/pending'),
  getMyComments: () => API.get('/comments/my-comments'),
};

// --- Chat ---
export const chatAPI = {
  getMessages: (params) => API.get('/chat', { params }),
  sendMessage: (data) => API.post('/chat', data),
  editMessage: (id, data) => API.put(`/chat/${id}`, data),
  reactToMessage: (id, emoji) => API.post(`/chat/${id}/react`, { emoji }),
  getUnreadCounts: () => API.get('/chat/unread'),
  markAsRead: (room) => API.post('/chat/read', { room }),
  getReplies: () => API.get('/chat/replies'),
  deleteMessage: (id) => API.delete(`/chat/${id}`),
};

// --- Notifications ---
export const notificationAPI = {
  getAll: () => API.get('/notifications'),
  create: (data) => API.post('/notifications', data),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
  delete: (id) => API.delete(`/notifications/${id}`),
};

// --- Filter / Moderation ---
export const filterAPI = {
  getWords: (params) => API.get('/filters', { params }),
  getDefaults: () => API.get('/filters/defaults'),
  addWord: (data) => API.post('/filters', data),
  updateWord: (id, data) => API.put(`/filters/${id}`, data),
  deleteWord: (id) => API.delete(`/filters/${id}`),
  getFlagged: () => API.get('/filters/flagged'),
  getPending: () => API.get('/filters/pending'),
  approveArticle: (id, data) => API.put(`/filters/articles/${id}/approve`, data),
  lockArticle: (id, lock) => API.put(`/filters/articles/${id}/lock`, { lock }),
  banArticle: (id, ban) => API.put(`/filters/articles/${id}/ban`, { ban }),
  dismissArticle: (id) => API.delete(`/filters/articles/${id}`),
  getBlockedTags: () => API.get('/filters/tags'),
  addBlockedTag: (tag) => API.post('/filters/tags', { tag }),
  deleteBlockedTag: (id) => API.delete(`/filters/tags/${id}`),
  getSettings: () => API.get('/filters/settings'),
  updateSettings: (data) => API.put('/filters/settings', data),
  toggleArticleSecurity: (id, data) => API.put(`/filters/articles/${id}/security`, data),
};

// --- Custom Uploads & Stats ---
export const uploadsAPI = {
  getStats: () => API.get('/articles/my-uploads/stats'),
};

export default API;
