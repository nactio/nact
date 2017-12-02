class After {
  constructor (amount) {
    this._amount = amount;
    Object.freeze(this);
  }

  get hours () {
    return { duration: (this._amount * 60 * 60 * 1000) | 0 };
  }

  get hour () {
    return this.hours;
  }

  get minutes () {
    return { duration: (this._amount * 60 * 1000) | 0 };
  }

  get minute () {
    return this.minutes;
  }

  get seconds () {
    return { duration: (this._amount * 1000) | 0 };
  }

  get second () {
    return this.seconds;
  }

  get milliseconds () {
    return { duration: this._amount | 0 };
  }
  get millisecond () {
    return this.milliseconds;
  }
}

const after = (amount) => new After(amount);

module.exports = {
  after
};
