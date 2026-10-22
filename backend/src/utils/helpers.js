// Small helper functions used in many files.

// Lets us use async/await in routes without try/catch everywhere.
exports.asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Empty text becomes NULL for the database.
exports.clean = (v) => (v === '' || v === undefined ? null : v);

// Create an error that carries an HTTP status code.
exports.httpError = (status, message) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

// Make sure an id from the URL is a positive whole number.
exports.toId = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    const e = new Error('Invalid id');
    e.status = 400;
    throw e;
  }
  return n;
};
