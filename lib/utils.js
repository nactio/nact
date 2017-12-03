class AfterValue {
  constructor (value) {
    Object.assign(this, value);
  }

  or (amount) {
    const { or, and, ...value } = this;
    return new After(amount, value, false);
  }

  and (amount) {
    const { or, and, ...value } = this;
    return new After(amount, value, true);
  }
}

class After {
  constructor (amount, chain = {}, addPreviousDuration) {
    this._amount = amount;
    this._chain = chain;
    this._previousDuration = (addPreviousDuration && this._chain.duration) ? this._chain.duration : 0;
    Object.freeze(this);
  }

  get hours () {
    return new AfterValue({ ...this._chain, duration: (this._amount * 60 * 60 * 1000 + this._previousDuration) | 0 });
  }

  get hour () {
    return this.hours;
  }

  get minutes () {
    return new AfterValue({ ...this._chain, duration: (this._amount * 60 * 1000 + this._previousDuration) | 0 });
  }

  get minute () {
    return this.minutes;
  }

  get seconds () {
    return new AfterValue({ ...this._chain, duration: (this._amount * 1000 + this._previousDuration) | 0 });
  }

  get second () {
    return this.seconds;
  }

  get milliseconds () {
    return new AfterValue({ ...this._chain, duration: (this._amount + this._previousDuration) | 0 });
  }

  get millisecond () {
    return this.milliseconds;
  }

  get messages () {
    return new AfterValue({ ...this._chain, messageInterval: this._amount });
  }

  get message () {
    return this.messages;
  }
}

const after = (amount) => new After(amount);
const every = (amount) => new After(amount);

module.exports = {
  after,
  every
};
