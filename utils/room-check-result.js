class RoomCheckResult {
  /**
   *
   * @param {number} code
   * @param {string | undefined} message
   */
  constructor(code, message) {
    this.code = code;
    if (message) this.message = message;

    console.log(`만들어진 객체: ${this}`);
  }
}

module.exports = RoomCheckResult;
