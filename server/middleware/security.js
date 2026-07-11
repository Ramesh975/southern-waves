const crypto = require('crypto');

const applySecurityHeaders = (req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });

  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

const assignRequestId = (req, res, next) => {
  const requestId = req.get('X-Request-Id') || crypto.randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  next();
};

const enforceTrustedOrigin = (allowedOrigins) => {
  const allowedOriginSet = new Set(allowedOrigins);
  const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  return (req, res, next) => {
    if (!unsafeMethods.has(req.method)) return next();

    const origin = req.get('Origin');
    if (!origin || allowedOriginSet.has(origin)) return next();

    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed',
      requestId: req.requestId,
    });
  };
};

module.exports = { applySecurityHeaders, assignRequestId, enforceTrustedOrigin };
