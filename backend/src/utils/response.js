/**
 * Standardized API Response Utilities
 * Follows SGMS Rule 3:
 * Success: { success: true, data: ..., message?: "..." }
 * Failure: { success: false, message: "..." }
 */

const ok = (res, data = null, message = null, statusCode = 200) => {
  const payload = { success: true };
  if (data !== undefined && data !== null) {
    payload.data = data;
  }
  if (message) {
    payload.message = message;
  }
  return res.status(statusCode).json(payload);
};

const fail = (res, statusCode = 400, message = 'An error occurred') => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = {
  ok,
  fail
};
