const jwt = require('jsonwebtoken');
const { unauthorized } = require('@hapi/boom');

const authorize = async (req, res, next) => {
  const { accessToken } = req.cookies;

  try {
    if (!accessToken)
      throw unauthorized('쿠키에 엑세스 토큰이 포함되어 있지 않습니다.');

    let payload;

    try {
      payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
      throw unauthorized('엑세스 토큰이 유효하지 않습니다.');
    }

    if (
      typeof payload === 'string' ||
      typeof payload.userId !== 'number' ||
      !payload.exp
    )
      throw unauthorized('엑세스 토큰의 내용이 유효하지 않습니다.');

    res.locals.userId = payload.userId;
    res.locals.accessTokenExp = payload.exp * 1000 - Date.now();

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authorize;
