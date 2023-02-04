const jwt = require('jsonwebtoken');

/**
 *
 * @param {string} token
 * @returns {jwt.JwtPayload}
 */
function verifyToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);

  if (
    typeof payload === 'string' ||
    typeof payload.userId !== 'number' ||
    !payload.exp
  ) {
    throw new Error('토큰의 페이로드가 유효하지 않음');
  }

  return payload;
}

module.exports = verifyToken;
