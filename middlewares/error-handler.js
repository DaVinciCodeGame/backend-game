const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.isBoom) console.error(err.data);

  if (err.isBoom)
    res.status(err.output.statusCode).json({ errorMessage: err.message });
  else if (err.isJoi) res.status(400).json({ errorMessage: err.message });
  else res.status(500).json({ errorMessage: '알 수 없는 오류' });
};

module.exports = errorHandler;
