// middleware/errorHandler.js
// Global error handler

const errorHandler = (err, req, res, next) => {
  // Axios errors carry the response on err.response; extract status + body
  const axiosStatus  = err.response?.status;
  const axiosMessage = err.response?.data?.message || err.response?.data;

  const statusCode = err.statusCode || axiosStatus || 500;
  const message    = (typeof axiosMessage === 'string' ? axiosMessage : null)
                  || err.message
                  || 'Internal server error';

  console.error(`[ERROR] ${statusCode} — ${message}`);
  if (axiosStatus) {
    console.error(`[GHL Response] status=${axiosStatus}`, JSON.stringify(err.response?.data));
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
