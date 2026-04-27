// Wraps an async route handler so any thrown error reaches the error middleware
// via next(err) instead of becoming an unhandled promise rejection.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
