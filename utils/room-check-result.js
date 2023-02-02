class RoomCheckResult {
  /**
   *
   * @param {number} code
   * @param {string | undefined} message
   */
  constructor(code, message) {
    this.code = code;
    if (message) this.message = message;
  }
}

module.exports = RoomCheckResult;
