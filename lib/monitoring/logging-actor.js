// const {
//   LogEvent,
//   AbstractLoggingEngine,
//   logNothing
// } = require('./logging-engine');

// class ActorLoggingEngine extends AbstractLoggingEngine {
//   constructor (loggingActorRef) {
//     super();
//     this.loggingActorRef = loggingActorRef;
//     const { dispatch } = require('../functions');
//     this.dispatch = dispatch;
//   }

//   log (logEvent) {
//     this.dispatch(this.loggingActorRef, logEvent);
//   }
// }

// const spawnLoggingActor = (system, engine) => {
//   if (!engine) {
//     throw new Error('Expected a LoggingEngine.');
//   }

//   const { spawnStateless } = require('../actor');

//   return spawnStateless(
//     system,
//     (msg, ctx) => {
//       if (msg instanceof LogEvent) {
//         engine.log(msg);
//       }
//     },
//     'logger'
//   );
// };

// class MessageContextLoggingEngine extends AbstractLoggingEngine {
//   constructor (engine, actorPath) {
//     super();
//     this.engine = engine;
//     this.actorPath = actorPath;
//   }

//   log (logEvent) {
//     logEvent = new LogEvent(
//       logEvent.level,
//       logEvent.category,
//       this.actorPath.concat(': ', logEvent.message),
//       logEvent.properties,
//       logEvent.metrics
//     );
//     this.engine.log(logEvent);
//   }
// }

// module.exports = {
//   spawnLoggingActor,
//   MessageContextLoggingEngine,
//   ActorLoggingEngine
// };
