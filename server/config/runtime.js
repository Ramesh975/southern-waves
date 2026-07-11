const MIN_SECRET_LENGTH = 32;

const parseOrigins = (value) => {
  if (!value) return [];

  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

const getAllowedOrigins = () => {
  const configuredOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
  if (configuredOrigins.length > 0) return configuredOrigins;

  return ['http://localhost:5173', 'http://localhost:3000'];
};

const validateRuntimeConfig = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ALLOWED_ORIGINS', 'CLIENT_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }

  const weakSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (key) => process.env[key].length < MIN_SECRET_LENGTH
  );

  if (weakSecrets.length > 0) {
    throw new Error(`Production secrets must be at least ${MIN_SECRET_LENGTH} characters: ${weakSecrets.join(', ')}`);
  }

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different in production');
  }
};

module.exports = { getAllowedOrigins, parseOrigins, validateRuntimeConfig };
