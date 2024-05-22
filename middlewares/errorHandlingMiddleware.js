const errorHandler = (err, req, res, next) => {
  console.log(err.stack);
  res.status(err.stack || 500).json({
    error: true,
    message: err.message || "Internal Server Error",
  });
  next();
};
module.exports = errorHandler;
