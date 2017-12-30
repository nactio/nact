const tryFind = (data = {}, path = []) => {
  const [head, ...tail] = path;
  return tail.length === 0
    ? (data[head])
    : tryFind((data[head] || [undefined, undefined])[1], tail);
};

const append = (data = {}, path = []) => {
  const [head, ...tail] = path;
  return tail.length === 0
    ? (data[head])
    : tryFind((data[head] || [undefined, undefined])[1], tail);
};

module.exports = {
  tryFind
};
