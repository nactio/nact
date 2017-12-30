const { List, Map } = require('immutable');
const emptyMap = Map();

const tryFind = (path = [], tree = emptyMap) => {
  let [head, ...tail] = path;
  let item = tree.get(head);

  return item && tail.length > 0
    ? tryFind(tail, item.get(1))
    : [item.get(0), item.get(1)];
};

const appendOrUpdate = (path = [], newItem, tree = emptyMap) => {
  const keyPath = path.reduce((lst, curr, index) =>
    index < path.length
    ? [...lst, 1, curr]
    : lst
  , []);
  return tree.updateIn(keyPath, item => List([ newItem, (item && item.get(1)) || Map({}) ]));
};

const create = (root) =>
  List([root, Map({})]);

module.exports = {tryFind, appendOrUpdate, create};
