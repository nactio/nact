# NAct
A multithreaded actor system for node.js. 

[![Build Status](https://travis-ci.org/ncthbrt/nact.svg?branch=master)](https://travis-ci.org/ncthbrt/nact)
[![Coverage Status](https://coveralls.io/repos/github/ncthbrt/nact/badge.svg?branch=master)](https://coveralls.io/github/ncthbrt/nact?branch=master)
[![Dependencies](https://david-dm.org/ncthbrt/nact.svg?branch=master)](https://david-dm.org/ncthbrt/nact)

[![js-semistandard-style](https://cdn.rawgit.com/flet/semistandard/master/badge.svg)](https://github.com/Flet/semistandard)

> Note:
>
> This project is still in the early phases. Any and all feedback,
> comments and suggestions are welcome. Please open an issue if you
> find anything unclear or misleading in the documentation. 
> 
> PRs and ideas for performance improvements, enabling clustering/scaleout and persistence
> will also be hugely appreciated.
>
> The api surface is still in a state of flux. While this note is in place, it probably isn't 
> advisable to build on NAct. The API should stabilise quite shortly, but it has been challenging 
> creating an API which is both flexible and familiar to javascript users.   

## Introduction

In the late 80s, Erisson needed a language in which to program the next generation of telephone exchanges. The language needed to be distributed by design, highly available, and fault tolerant. A team consisting initially of Joe Armstrong, Mike Williams and Robert Virding came up with an elegant solution: [Erlang](erlang.org). 

Erlang was inpsired by a mathematical formalism of distributed systems called the [actor model](http://www.brianstorti.com/the-actor-model/). The actor model describes distributed systems as a set of indepently running processes called actors. Actors communicate through message passing and can create, destroy and supervise the lifecycle of child actors. Whenever an actor is sent a message, it is added to its mailbox queue. An actor can retrieve a single message from the front of its mailbox at a time, and in response, perform some side effect, or send messages to other actors. If an actor behaves badly, the integrity of the system is preserved as actors are partitioned from one another.

A concrete example one could use is Whatsapp (which was known at some point to have been using Erlang on its servers). While their codebase is closed, a naive implemenation of their group chat feature could be as follows:

A connection between a single user's mobile app and the servers is represented as an actor. This actor can receive two types of messages: A `send` message from the user which contains the message contents and a group or user id to which the message is addressed. The other message is a `receive` message, which contains the sender and group id and message contents. The `receive` message is forwarded to the mobile client, while the `send` message is passed to an actor representing the user or group to which the message is addressed. The actor stores the references to all actors involved in the group conversation and whenever it receives a `send` message, it maps it to a message of type `receive` and sends it to all group member actors. 

The relative simplicity (even though it of course misses out some important production details) of this system is exactly the sort of use case Erlang was created for. The trouble is that Erlang, while excellent for some use cases, isn't in my opinion a general purpose enough language, which has had an impact on its ecosystem and libaries. 

NAct is an implementation of the Actor Model for Node.js. It is inspired by the approaches taken by [Akka](getakka.net) (available on the JVM and the CLR) and Erlang. The initial release is focused on providing a good experience on a single node, though later releases will focus on enabling clustering and scaleout. 

## Getting Started

> Note:
> 
> Each example is hosted on glitch. 
> To see source code, click on buttons like the one below.
> This particular button demonstrates the greeter example below

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/https://nact-gettingstarted-greeter.glitch.me)

NAct has only been tested to work on Node 8 and above. You can install NAct in your project by invoking the following:

```bash
    npm install --save nact
```

Once installed, you need to import the start function, which starts and 
then returns the actor sytem.

```js
const { start } = require('nact');
const system = start();
```

Once you have a reference to the system, it is now possible to create our
first actor. To create an actor you have to `spawn` it.  As is traditional,
let us create an actor which says hello when a message is sent to it. Since 
this actor doesn't require any state, we can use the simpler `spawnFixed` function. 

```js
const greeterActor = spawnFixed(system, (msg) => console.log(`Hello ${msg.name}`), 'greeter');
```
The first argument to `spawnFixed` is the parent, which is in this case the actor system. The hierarchy section will go into more detail about this.

The second argument to `spawnFixed` is a function which is invoked when a message is received. It is important to note that this function cannot reference anything outside the scope of the function. This is because the actor is running in a separate thread and thus can't share memory with the main process. 

The third argument to `spawnFixed` is the name of the actor,
which in this case is `'greeter'`. The name field is optional, and 
if ommitted, the actor is automatically assigned a name by the system.

To communicate with the greeter, we need to `tell` it who we are:

```js
greeterActor.tell({ name: 'Erlich Bachman' });
```

This should print `Hello Erlich Bachman` to the console. 

To complete this example, we need to shutdown our system. We can do this
by calling `system.stop();`

## State

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/https://nact-gettingstarted-counter.glitch.me)

Most actors aren't very useful without state. But  `spawnFixed` makes it near impossible to create stateful actors. The solution is to use the `spawn` function instead. `spawn` has nearly the same function signature as `spawnFixed` however the fundamental difference is that `spawn` takes 
in a function which has no arguments and returns another function.

The returned function is used to handle next message and should itself return a function which is used for the message after that (and so on). When no function is returned, the actor is stopped as no further processing may occur.

This may sound quite confusing, but could be likened to an asynchronous `reduce`.  A simple example to demonstrate the use of `spawn` is a counter actor. The counter should be able to hold the current count and up receipt of a message add the value to the count and then log it.

We want to be able to do the following:

```js
counterActor.tell(1); // logs 1
counterActor.tell(-1); // logs 0
counterActor.tell(1); // logs 1
```
Assuming we've already created our system, we could implement the counter as follows:

```js
let counterActor = spawn(
  system,
  () => {
    const counter = (count) => (msg) => {
       const nextCount = count+msg;
       console.log(nextCount);
       return counter(nextCount);
    };
    return counter(0);
  },
  'counter'
);
```
Here we pass in a function and then inside the scope of this function,
define a [higher order function](https://en.wikipedia.org/wiki/Higher-order_function) which takes in the current count and then returns a function which is able to handle the actual message. This function when invoked, prints out hte latest count and then returns itself with an updated count.

Again you can play around with this concept if you click the glitch button at the top of this section.

## Communication between actors

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/https://nact-gettingstarted-multi.glitch.me)

We've been looking at examples with single actors, but actors are a part of a _system_. And systems are very sad things if they are made up of just one element. Let us use another traditional test activity PingPong, to demonstrate how actors can communcation with one another. 

In the example below, the ping and pong actors log the message they've received and then tell the sender their name. To start off this perfect
match, we tell the pingActor the pong actor's name and use `tell's` second parameter to specify the sender as being the pongActor (all actors have a name and path property).

> Note:
>
> In `pingActor`, we use an arrow function. Thus to issue commands from inside the actor, we need to accept a second argument: the actor context.
>
> In the `pongActor`, we are using function form, and while it too can accept the context as a second argument, `this` is also set to the context.


```js
let pingActor = spawnFixed(system, (msg, ctx)=>{ console.log(msg); ctx.tell(ctx.sender, ctx.name); }, 'ping'); 

let pongActor = spawnFixed(system, function(msg){ console.log(msg); this.tell(this.sender, this.name); }, 'pong'); 

pingActor.tell(pongActor.name(), pongActor);
```

In the sample, the system is terminated after 5 seconds to give glitch a break.


## Asking instead of telling

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/https://nact-gettingstarted-ask.glitch.me)

We've only been passing messages to actors inside the system, but what if we want to pass messages _out_? 

`ask()` is the primary means of interacting with actors from outside the actor system (actors have no such problem as they can simply `tell` one another) 

Ask behaves very similarly to tell, except that it has a second parameter (a timeout in milliseconds. Ask creates a virtual actor for the request and when this virtual actor receives a message, the promise is resolved. 

> Note:
> It is best practise to specify a timeout in a production system to ensure 
> that promises do not remain unresolved indefitely.

Inside the real actor, we have access to a number of global variables and functions, two of which are `tell()` and `sender`. The `tell()` inside the actor behaves very similarly to `actor.tell()` outside it, with the important difference that the first argument to the `tell()` function inside the actor is the recipient. `sender` is just that, the entity that dispatched the message. Putting the two toghether we can resolve the ask with a `tell(sender, <MESSAGE_HERE>)`

The glitch example in this section builds upon the counter example, but instead of simply printing the result, returns the updated count to the sender.


## Actor Hierachy and Lifecycle 

One of the more important features of an actor system is its hierachy. Actors can have child actors. The lifecycle of a child actor is tied to that of its parent. If a parent actor is shutdown or terminates, all children in the tree are shut down. This hierachy, combined with [supervision](./#supervision), allows for robust error handling and recovery. 

You can spawn children for a given actor outside the actor function by invoking spawn/spawnFixed on the actor object. Inside the actor function, the context object allowing spawning as follows:

```js
let actor = spawnFixed (
  system, 
  function(msg){ spawn(this.self, ()=>function f(msg){ console.log('I\m a child actor'); return f; }, 'child'); }
);
```

To stop an actor, you can call stop on the actor object e.g. `actor.stop()`. If you want to immediately terminate the actor, you can call `actor.terminate()`. These two methods are quite ungraceful, and often a better alternative is to shutdown the actor from the inside. If you spawned the actor using spawnFixed, you can stop the actor function after receiving a message, by returning `false`. If you instead created the actor using the spawn command, stopping the actor is as simple as not returning the next handler function.

Using spawn:
```js
let actor = spawn(
  system, 
  // No next function is returned, hence the actor shuts down.
  () => function(msg,ctx){ console.log('I\'m shutting down now'); }
);
```

Using spawnFixed:
```js
let actor = spawnFixed(
  system,
  function(msg){ console.log('I\m shutting down now'); return false; }
);
```

An actor by default is also terminated when it throws an exception, unless an action is taken by a supervisor.

To check whether an actor is stopped, you can call `isStopped()` on the actor object. You can obtain a Map of an actor's children by calling children() on the actor object or `ctx.children` from inside the actor function.
Likewise, to get the parent of an actor you can call `parent()` on the actor object or `parent` on the context object.

Children can be stopped from inside the actor by calling `child.stop()`

## Supervision 

NAct empowers parent actors to monitor their children. This is strictly on an opt in basis.
If a child crashes and a parent has opted into receiving death messages, the message handler 
of the parent actor will be called with the following payload.

```js
return { type: 'CHILD_FAILED', child, exception, failure_context }
```

This message gives the actor an opportunity to recover from the failure. They could for example call `child.restart()`
