/**
 *
 * @param {string} rawCookies
 * @returns {{[name: string]: string | undefined}} parsed cookies
 */
function cookieParser(rawCookies) {
  if (!rawCookies || typeof rawCookies !== 'string') {
    throw new Error('잘못된 쿠키 형식');
  }

  const parsedCookies = rawCookies.split('; ').reduce((cookies, rawCookie) => {
    const [name, value] = rawCookie.split('=');

    if (!value) throw new Error('잘못된 쿠키 형식');

    return Object.assign(cookies, { [name]: value });
  }, {});

  return parsedCookies;
}

module.exports = cookieParser;
