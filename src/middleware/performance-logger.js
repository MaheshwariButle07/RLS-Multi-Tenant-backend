/**
 * Simple middleware to log server response latency
 */
function performanceLogger(req, res, next) {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration.toFixed(2)}ms`);
  });

  next();
}

module.exports = performanceLogger;
