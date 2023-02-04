class CustomError extends Error {
  /**
   *
   * @param {string} message
   * @param {number} code
   */
  constructor(message, code) {
    super(message);

    this.code = code;
  }
}

module.exports = CustomError;
