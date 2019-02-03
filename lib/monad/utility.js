const performEffect = (effects, instruction) => {
  // Convert effect to promise for now, requires less checks/branching, fine for now
  return Promise.resolve(effects[instruction.action](instruction));
};

const wrapFunction = (f, effects) => {
  return async (...args) => {
    const generator = f(...args);
    // Did this function return a generator?
    if (generator && generator.next && String(typeof (generator.next)) === 'function') {
      let value = generator.next();
      while (!value.done) {
        let result = await performEffect(effects, value.value);
        value = generator.next(result);
      }
      return value.value;
    }
  };
};

module.exports = {
  wrapFunction
};
