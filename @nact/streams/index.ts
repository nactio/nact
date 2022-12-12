import { dispatch, Dispatchable, LocalActorRef, LocalActorSystemRef, spawn, start, stop } from "@nact/core";

type FIXME = any

const HANDSHAKE: HANDSHAKE = 0;
type HANDSHAKE = 0;

const RECEIVE: RECEIVE = 1;
type RECEIVE = 1;

type NEXT = 2;
const NEXT = 2;

const CLOSE: CLOSE = 3;
type CLOSE = 3;

type ConsumerProtocol<Msg> =
  | [HANDSHAKE, Dispatchable<ProducerProtocol<Msg>>]
  | [RECEIVE, Msg] // Payload
  | [CLOSE, Error | undefined]
  ;

type ProducerProtocol<Msg> =
  | [HANDSHAKE, ConsumerProtocol<Msg>]
  | [NEXT] // Request for more data
  | [CLOSE, any | undefined]
  ;

type Producer<Msg> = Dispatchable<ProducerProtocol<Msg>>;
type Consumer<Msg> = Dispatchable<ConsumerProtocol<Msg>>;

export function open(port: FIXME, actor: FIXME) {
  const openPort = port(actor);
  dispatch(openPort, [HANDSHAKE, actor]);
}

export function next(port: Producer<any>) {
  dispatch(port, [NEXT]);
}

export function close(port: Producer<any>, error?: Error | undefined) {
  dispatch(port, [CLOSE, error]);
}

export function fromIterable<G extends Generator<any>>(iterator: G) {
  return function <ParentRef extends Consumer<any>>(parent: ParentRef) {
    return spawn(parent as FIXME, (target, msg, ctx) => {
      switch (msg[0]) {
        case HANDSHAKE:
          dispatch(msg[1], [HANDSHAKE, ctx.self]);
          return msg[1];
        case CLOSE:
          dispatch(target, [CLOSE]);
          stop(ctx.self);
          break;
        case NEXT:
          try {
            const next = iterator.next();
            if (next.done) {
              dispatch(ctx.self, [CLOSE]);
            } else {
              dispatch(target, [RECEIVE, next.value]);
            }
          } catch (e) {
            dispatch(target, [CLOSE, e]);
          }
          break;
      }
      return target;
    });
  };
}

export function fromWebSocket(socket: WebSocket) {
  return function <ParentRef extends LocalActorRef<any> | LocalActorSystemRef>(parent: ParentRef): Producer<any> {
    const actor = spawn(parent, async (subscriber, [type, payload], ctx) => {
      switch (type) {
        case HANDSHAKE:
          socket.addEventListener('close', () => {
            dispatch(payload, [CLOSE]);
          })
          socket.addEventListener('message', (evt) => {
            dispatch(payload, [RECEIVE, evt.data]);
          });
          socket.addEventListener('error', (evt) => {
            dispatch(subscriber, [CLOSE, evt]);
          });
          dispatch(subscriber, [HANDSHAKE, ctx.self]);
          return payload;
        case CLOSE:
          socket.close();
          stop(ctx.self);
        case RECEIVE:
          socket.send(payload);
          dispatch(subscriber, [subscriber, NEXT]);
          break;
        case NEXT: //ignored. This port does not support pull semantics
          break;
      }
      return payload;
    });

    return actor;
  }
}

export function fromAsyncIterable<G extends AsyncGenerator<any>>(iterator: G) {
  return function <ParentRef extends LocalActorRef<any> | LocalActorSystemRef>(parent: ParentRef) {
    return spawn(parent, async (target, [type, payload], ctx) => {
      switch (type) {
        case HANDSHAKE:
          dispatch(payload, [HANDSHAKE, ctx.self]);
          return payload;
        case CLOSE:
          dispatch(target, [CLOSE]);
          stop(ctx.self);
          break;
        case NEXT:
          try {
            const next = await iterator.next();
            if (next.done) {
              dispatch(ctx.self, [CLOSE]);
            } else {
              dispatch(target, [RECEIVE, next.value]);
            }
          } catch (e) {
            dispatch(target, [CLOSE, e]);
          }
          break;
      }
      return target;
    });
  };
}

const system = start();

function exampleConsumer<ParentRef extends LocalActorRef<any> | LocalActorSystemRef>(parent: ParentRef) {
  return spawn(parent, async (port, [type, payload], _ctx) => {
    switch (type) {
      case HANDSHAKE:
        next(payload);
        return payload;
      case CLOSE:
        break;
      case RECEIVE:
        try {
          console.log(payload);
          next(port)
        } catch (e) {
          close(port, e as undefined | Error);
          throw e;
        }
        break;
    }
    return port;
  });
}

const actor = exampleConsumer(system);

const port = fromIterable((function* () { yield* [1, 2, 3]; })());

open(port, actor);
