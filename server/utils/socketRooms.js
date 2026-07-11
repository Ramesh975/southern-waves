const CHAT_CATEGORIES = new Set([
  'news',
  'editorial',
  'features',
  'kyp',
  'know-your-past',
  'tea-shop',
  'pictures-speak',
]);

const TAG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,49}$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const isAllowedChatRoom = (room) => {
  if (typeof room !== 'string') return false;

  const [type, name, ...rest] = room.split(':');
  if (rest.length > 0 || !name) return false;

  if (type === 'category') return CHAT_CATEGORIES.has(name);
  if (type === 'tag') return TAG_PATTERN.test(name);

  return false;
};

const isValidArticleId = (articleId) => typeof articleId === 'string' && OBJECT_ID_PATTERN.test(articleId);

module.exports = { CHAT_CATEGORIES, isAllowedChatRoom, isValidArticleId };
