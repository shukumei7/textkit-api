function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body too large',
      code: 'PAYLOAD_TOO_LARGE',
      details: 'Maximum request size is 50KB',
    });
  }

  if (err.status === 400 || err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
    });
  }

  res.status(err.status || 500).json({
    error: err.expose ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = { errorHandler };
