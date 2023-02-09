const jwt = require('jsonwebtoken');
const { unauthorized } = require('@hapi/boom');
const axios = require('axios');

const authorize = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;

  try {
    try {
      if (typeof accessToken !== 'string') throw new Error();

      const accessTokenPayload = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      if (typeof accessTokenPayload === 'string') throw new Error();

      const { userId, exp } = accessTokenPayload;

      if (typeof userId !== 'number' || !exp) throw new Error();

      next();
    } catch {
      if (typeof refreshToken !== 'string')
        throw unauthorized('요청에 포함된 토큰이 유효하지 않습니다.');

      let userId;

      try {
        const refreshTokenPayload = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );

        if (typeof refreshTokenPayload === 'string') throw new Error();
      } catch {
        throw unauthorized('요청에 포함된 토큰이 유효하지 않습니다.');
      }

      const { data: user } = await axios.get(
        `${process.env.MAIN_SERVER_URL}/p/users/${userId}`
      );

      if (!user) throw unauthorized('요청에 포함된 토큰이 유효하지 않습니다.');

      if (user.refreshToken !== refreshToken)
        throw unauthorized('요청에 포함된 토큰이 유효하지 않습니다.');

      const newAccessToken = jwt.sign(
        { userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
      );

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.davinci-code.online',
        maxAge: 60 * 60 * 1000,
      });

      next();
    }
  } catch (err) {
    next(err);
  }
};

module.exports = authorize;
