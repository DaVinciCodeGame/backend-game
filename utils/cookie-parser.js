/**
 *
 * @param {string} rawCookies
 * @returns {{[name: string]: string}} parsed cookies
 */
function cookieParser(rawCookies) {
  if (!rawCookies || typeof rawCookies !== 'string') {
    return undefined;
  }

  const parsedCookies = rawCookies.split('; ').reduce((cookies, rawCookie) => {
    const [name, value] = rawCookie.split('=');

    return Object.assign(cookies, { [name]: value });
  }, {});

  return parsedCookies;
}

module.exports = cookieParser;
