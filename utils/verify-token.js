/**
 *
 * @param {string} token
 * @returns {Promise<number>} statusCode
 */
function verifyToken(token) {
  return axios
    .get('https://main.davinci-code.online/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(({ status }) => status);
}

module.exports = verifyToken;
