const IO = Symbol('io');
const ASYNC_IO = Symbol('async_io');

const io = (f, ...args) => ({ action: IO, f, args });
const asyncIO = (f, ...args) => ({ action: IO, f, args, async: true });

module.exports = {
  io,
  asyncIO,
  IO,
  ASYNC_IO
};
