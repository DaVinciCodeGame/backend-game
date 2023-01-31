const jwt = require('jsonwebtoken');
const { badRequest } = require('@hapi/boom');

const authorize = async (req, res, next) => {
  const { accessToken } = req.cookies;

  try {
    if (!accessToken)
      throw badRequest('인증 정보가 유효하지 않습니다.', '쿠키 없음');

    let payload;

    try {
      payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
      throw badRequest('인증 정보가 유효하지 않습니다.', '유효하지 않은 토큰');
    }

    if (
      typeof payload === 'string' ||
      typeof payload.userId !== 'number' ||
      !payload.exp
    )
      throw badRequest(
        '인증 정보가 유효하지 않습니다.',
        '내용이 유효하지 않음'
      );

    res.locals.userId = payload.userId;
    res.locals.accessTokenExp = payload.exp * 1000 - Date.now();

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authorize;
