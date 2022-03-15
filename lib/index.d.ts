declare module 'nact' {
  // Time
  export type Milliseconds = number;

  export const hour: Milliseconds;

  export const hours: Milliseconds;

  export const message: Milliseconds;

  export const messages: Milliseconds;

  export const millisecond: Milliseconds;

  export const milliseconds: Milliseconds;

  export const minute: Milliseconds;

  export const minutes: Milliseconds;

  export const second: Milliseconds;

  export const seconds: Milliseconds;


  // References
  export abstract class Ref<T> { }

  export type ActorSystemRef = Ref<never>;
  export class Nobody extends Ref<any> { constructor(); }

  // Actor Path
  export abstract class ActorPath {
    parts: [string, ...string[]];
    system: string;
    toString(): string;
  }

  // Actor Facing Logger
  export interface Logger {
    trace(message: string): void;

    debug(message: string): void;

    info(message: string): void;

    warn(message: string): void;

    critical(message: string): void;

    error(message: string): void;

    event(name: string, eventProperties: any): void;
    exception(exception: Error): void;

    metric(name: string, values: any): void;
  }

  export type ActorName = string;
  export type ActorSystemName = string;

  // Contexts
  export type ActorContext<Msg, ParentRef extends Ref<any>> = {
    parent: ParentRef,
    path: ActorPath,
    self: Ref<Msg>,
    name: ActorName,
    children: Map<ActorName, Ref<unknown>>,
    log: Logger
  };

  export type PersistentActorContext<Msg, ParentRef extends Ref<any>> =
    ActorContext<Msg, ParentRef> & { persist: (msg: Msg) => Promise<void> };

  export type ActorContextWithMailbox<Msg, ParentRef extends Ref<any>> = ActorContext<Msg, ParentRef> & { mailbox: Msg[] };

  export type SupervisionContext<Msg, ParentRef extends Ref<any>> = ActorContextWithMailbox<Msg, ParentRef> & {
    stop: Symbol,
    stopAll: Symbol,
    stopChild: Symbol,
    stopAllChildren: Symbol,
    escalate: Symbol,
    resume: Symbol,
    reset: Symbol,
    resetAll: Symbol,
    resetChild: Symbol,
    resetAllChildren: Symbol,
    mailbox: Msg[]
  };


  // Actor Functions
  export type ActorFunc<State, Msg, ParentRef extends Ref<any>> = (state: State, msg: Msg, ctx: ActorContext<Msg, ParentRef>) =>
    State | Promise<State>;


  export type StatelessActorFunc<Msg, ParentRef extends Ref<any>> = (msg: Msg, ctx: ActorContext<Msg, ParentRef>) =>
    void | Promise<void>;

  export type PersistentActorFunc<State, Msg, ParentRef extends Ref<any>> = (state: State, msg: Msg, ctx: ActorContext<Msg, ParentRef>) =>
    State | Promise<State>;

  export type SupervisionActorFunc<Msg, ParentRef extends Ref<any>, ChildRef extends Ref<any>> = (msg: Msg | undefined, err: Error | undefined, ctx: SupervisionContext<Msg, ParentRef>, child: ChildRef | undefined) => Symbol | Promise<Symbol>;

  export type PersistentQueryFunc<State, Msg> = (state: State, msg: Msg) => State | Promise<State>;


  // Actor configuration
  export type ActorProps<State, Msg, ParentRef extends Ref<any>> = {
    shutdownAfter?: Milliseconds,
    onCrash?: SupervisionActorFunc<Msg, ParentRef, Ref<any>>,
    initialState?: State,
    initialStateFunc?: (ctx: ActorContext<Msg, ParentRef>) => State,
    afterStop?: (state: State, ctx: ActorContextWithMailbox<Msg, ParentRef>) => void | Promise<void>
  };

  export type StatelessActorProps<Msg, ParentRef extends Ref<any>> = Omit<ActorProps<any, Msg, ParentRef>, 'initialState' | 'initialStateFunc' | 'afterStop'>;


  export type NumberOfMessages = number;
  export type Json = unknown;

  export type PersistentActorProps<State, Msg, ParentRef extends Ref<any>> = ActorProps<State, Msg, ParentRef> & {
    snapshotEvery?: NumberOfMessages,
    snapshotEncoder?: (state: State) => Json,
    snapshotDecoder?: (state: Json) => State
    encoder?: (msg: Msg) => Json,
    decoder?: (msg: Json) => Msg
  };

  export type PersistentQueryProps<State, Msg> = {
    snapshotKey?: string,
    snapshotEvery?: NumberOfMessages,
    cacheDuration?: Milliseconds,
    snapshotEncoder?: (state: State) => Json,
    snapshotDecoder?: (state: Json) => State,
    encoder?: (msg: Msg) => Json,
    decoder?: (msg: Json) => Msg,
    initialState?: State
  };


  // Type helpers
  type InferMsgFromFunc<T extends ActorFunc<any, any, any>> = T extends ActorFunc<any, infer Msg, any> ? Msg : never;
  type InferStateFromFunc<T extends ActorFunc<any, any, any>> = T extends ActorFunc<infer State, any, any> ? State : never;

  type InferMsgFromPersistentFunc<T extends PersistentActorFunc<any, any, any>> = T extends PersistentActorFunc<any, infer Msg, any> ? Msg : never;
  type InferStateFromPersistentFunc<T extends PersistentActorFunc<any, any, any>> = T extends PersistentActorFunc<infer State, any, any> ? State : never;

  type InferMsgFromStatelessFunc<T extends StatelessActorFunc<any, any>> = T extends StatelessActorFunc<infer Msg, any> ? Msg : never;

  type InferMsgFromPersistentQuery<T extends PersistentQueryFunc<any, any>> = T extends PersistentQueryFunc<any, infer Msg> ? Msg : never;
  type InferStateFromPersistentQuery<T extends PersistentQueryFunc<any, any>> = T extends PersistentQueryFunc<infer State, any> ? State : never;

  // Main actor functions
  export function spawn<ParentRef extends Ref<any>, Func extends ActorFunc<any, any, ParentRef>>(
    parent: ParentRef,
    f: Func,
    name?: string,
    properties?: ActorProps<InferStateFromFunc<Func>, InferMsgFromFunc<Func>, ParentRef>
  ): Ref<InferMsgFromFunc<Func>>;

  export function spawnPersistent<ParentRef extends Ref<any>, Func extends PersistentActorFunc<any, any, ParentRef>>(
    parent: ParentRef,
    f: Func,
    key: string,
    name?: string,
    properties?: PersistentActorProps<InferStateFromPersistentFunc<Func>, InferMsgFromPersistentFunc<Func>, ParentRef>
  ): Ref<InferMsgFromPersistentFunc<Func>>;

  export function spawnStateless<ParentRef extends Ref<any>, Func extends StatelessActorFunc<any, ParentRef>>(
    parent: ParentRef,
    f: Func,
    name?: any,
    properties?: StatelessActorProps<InferMsgFromStatelessFunc<Func>, ParentRef>
  ): Ref<InferMsgFromStatelessFunc<Func>>;


  export function stop(actor: Ref<any>): void;

  /** Note: Sender when using dispatch has been intentionally omitted from the typescript bindings.
   *        Sender simply cannot be strongly typed. A safer alternative is to include the sender
   *        as part of the message protocol. For example:
   *        ```
   *            dispatch(pizzaActor, { sender: deliveryActor, order: ['ONE_LARGE_PEPPERONI']  });
   *        ```
   */
  export function dispatch<T>(actor: Ref<T>, msg: T): void;


  export type QueryMsgFactory<Req, Res> = (tempRef: Ref<Res>) => Req;
  export type InferResponseFromMsgFactory<T extends QueryMsgFactory<any, any>> = T extends QueryMsgFactory<any, infer Res> ? Res : never;
  export function query<Msg, MsgCreator extends QueryMsgFactory<Msg, any>>(actor: Ref<Msg>, queryFactory: MsgCreator, timeout: Milliseconds): Promise<InferResponseFromMsgFactory<MsgCreator>>;


  export function persistentQuery<Func extends PersistentQueryFunc<any, any>>(
    parent: Ref<any>,
    f: Func,
    key: string,
    properties?: PersistentQueryProps<InferStateFromPersistentQuery<Func>, InferMsgFromPersistentQuery<Func>>
  ): () => Promise<InferStateFromPersistentFunc<Func>>;

  export abstract class ActorSystem { }

  export type Plugin = (system: ActorSystem) => void;

  export function start(fst?: Plugin | ActorSystemName, ...args: Plugin[]): ActorSystemRef;

  // Logging
  export type LogLevel =
    | 0 // OFF
    | 1 // TRACE
    | 2 // DEBUG
    | 3 // INFO
    | 4 // WARN
    | 5 // ERROR
    | 6 // CRITICAL
    ;

  export type LogTrace = {
    type: 'trace',
    level: LogLevel,
    actor: Ref<unknown>,
    message: string,
    createdAt: Date
  };

  export type LogEvent = {
    type: 'event',
    name: string;
    properties: Json,
    actor: Ref<unknown>,
    createdAt: Date
  };

  export type LogMetric = {
    type: 'metric',
    name: string;
    values: Json,
    actor: Ref<unknown>,
    createdAt: Date
  };

  export type LogException = {
    type: 'exception',
    exception: Error | undefined,
    actor: Ref<unknown>;
    createdAt: Date;
  }

  export type LogMsg =
    | LogTrace
    | LogEvent
    | LogMetric
    | LogException;


  export type LoggingEngine = (systemRef: Ref<never>) => Ref<LogMsg>;

  export function logNothing(): LoggingEngine;

  export type ConsoleLoggerProperties = {
    consoleProxy?: Console,
    formatter?: (msg: LogMsg) => string,
    name?: string // actor name under system actor
  };

  export function logToConsole(properties?: ConsoleLoggerProperties): LoggingEngine;

  export function configureLogging(engine: LoggingEngine): Plugin;

  // Persistence
  export type PersistedSnapshot = {
    data: Json,
    sequenceNumber: number,
    key: string,
    createdAt: Milliseconds
  };

  export type PersistedEvent = {
    data: Json,
    sequenceNumber: number,
    key: string,
    createdAt: Milliseconds,
    isDeleted: boolean,
    tags: string[] // sorted alphabetically
  };



  export type EventStream = PromiseLike<Event[]> & {
    /**
      * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
      * @param callbackfn A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.
      * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
      */
    reduce<U>(callbackfn: (previousValue: U, currentValue: PersistedEvent, currentIndex: number) => U, initialValue: U): Promise<U>;
  };

  export interface PersistenceEngine {
    events(persistenceKey: string, offset: number, limit: number, tags: string[]): EventStream;

    latestSnapshot(persistenceKey: string): Promise<PersistedSnapshot>;

    takeSnapshot(persistedSnapshot: PersistedSnapshot): Promise<void>;

    persist(persistedEvent: PersistedEvent): Promise<void>;
  }

  export function configurePersistence(engine: PersistenceEngine): Plugin;

}

// declare module 'nact/monad' {
//   export abstract class Effect<> { };
//   export function* start(program: funct): void;
// }
