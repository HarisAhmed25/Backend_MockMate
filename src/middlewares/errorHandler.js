module.exports = (err, req, res, next) => {
  console.error('Error handler:', err);
  
  // If response already sent, don't try to send again
  if (res.headersSent) {
    return;
  }

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  return res.status(status).json({ message });
};
