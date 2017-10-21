![nact Logo](https://raw.githubusercontent.com/ncthbrt/nact/master/assets/logo.svg?sanitize=true)

An idiomatic actor system for Node.js 

<!-- Badges -->
[![Travis branch](https://img.shields.io/travis/ncthbrt/nact/master.svg?style=flat-square)]()
[![Coveralls](https://img.shields.io/coveralls/ncthbrt/nact.svg?style=flat-square)]() [![Dependencies](https://david-dm.org/ncthbrt/nact.svg?branch=master&style=flat-square)](https://david-dm.org/ncthbrt/nact) 

[![npm](https://img.shields.io/npm/v/nact.svg?style=flat-square)](https://www.npmjs.com/package/nact) 
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-blue.svg?style=flat-square)](https://github.com/Flet/semistandard) 

> Note:
>
> Any and all feedback, comments and suggestions are welcome. Please open an issue if you
> find anything unclear or misleading in the documentation. 

# Sponsored by 
[![Root Logo](https://raw.githubusercontent.com/ncthbrt/nact/master/root-logo.svg?sanitize=true)](https://root.co.za)

# Introduction
Nact is an implementation of the Actor Model for Node.js. It is inspired by the approaches taken by [Akka](getakka.net) 
(available on the JVM and the CLR) and Erlang. Additionally it attempts to provide a familiar interface to users coming 
from Redux. One of the goals of the project is to provide a simple way to create and reason about µ-services and event 
driven architectures in Node.js.

The Actor Model describes a system made up of a set of entities called actors. An actor could be described as an 
independently running packet of state. Actors communicate solely by passing messages to one another. 
Actors can also create more actors. This explanation may sound overly simplified but it really isn't! 

Actors Systems have been used to construct hugely scalable, highly available and performant systems (such as WhatsApp, 
Twitter, and Flipkart), but that doesn't mean it is only for people or companies with big problems. Microservice 
architectures are extremely popular right now, but a common grievance is the difficultly in determining your system's 
bounded contexts, along with increased operational complexity. Nact (and more broadly Actor Systems in general) is 
designed to solve these problems.

Creating a new type of actor is a very lightweight operation in contrast to creating a whole new web api and deployment,
and due to the magic of [location transparency](https://doc.akka.io/docs/akka/2.5.4/java/general/remoting.html) and that
actors share no state, it would be trivial to move this actor to a new server when a server starts to show strain. As 
actors are usually more strongly encapsulated than a procedural architecture, it also means that the spaghetti you might 
see is far less likely to happen. These benefits (as you'll see) don't even come with more cognitive overhead. 
In short, Actor Systems are an excellent alternative to a purely RESTful µ-services architecture.

# The basics

## Setup and first actor

Nact has only been tested to work on Node 8 and above. You can install nact in your project by invoking the following:

```bash
    npm install --save nact
```

Once installed, you need to import the start function, which starts and 
then returns the actor system.

```js
const { start } = require('nact');
const system = start();
```

Once you have a reference to the system, it is now possible to create our
first actor. To create an actor you have to `spawn` it.  As is traditional,
let us create an actor which says hello when a message is sent to it. Since 
this actor doesn't require any state, we can use the simpler `spawnStateless` function. 

```js
const greeter = spawnStateless(system, (msg, ctx) => console.log(`Hello ${msg.name}`), 'greeter');
```

The first argument to `spawnStateless` is the parent, which is in this case the actor system. 
The hierarchy section will go into more detail about this.

The second argument to `spawnStateless` is a function which is invoked when a message is received. It is important to 
note that this function cannot reference anything outside the scope of the function. This is because the actor is 
running in a separate thread and thus can't share memory with the main process. 

The third argument to `spawnStateless` is the name of the actor, which in this case is `'greeter'`. The name field is 
optional, and if omitted, the actor is automatically assigned a name by the system.

To communicate with the greeter, we need to `dispatch` a message to it informing it who we are:

```js
greeter.dispatch({ name: 'Erlich Bachman' });
```

This should print `Hello Erlich Bachman` to the console. 

To complete this example, we need to shutdown our system. We can do this
by calling `system.stop();`

## Stateful Actors

One of the major advantages of an actor system is that it offers a safe way of creating stateful services. A stateful
actor is created using the ```spawn`` function.

In this example, the state is initialized to an empty object. Each time a message is received by the actor, the current
state is passed in as the first argument to the actor.  Whenever the actor encounters a name it hasn't encountered yet,
it returns a copy of previous state with the name added. If it has already encountered the name it simply returns the 
unchanged current state. The return value is used as the next state.

```js
const statefulGreeter = spawn(system, (state = {}, msg, ctx) => {
  const hasPreviouslyGreetedMe = state[msg.name] !== undefined;
  if(hasPreviouslyGreetedMe) {
    console.log(`Hello again ${msg.name}.`);  
    return state;
  } else {
    console.log(`Good to meet you, ${msg.name}. I am the stateful-greeter service!`);
    return { ...state, [msg.name]: true };
  }
}, 'stateful-greeter');
```

## Querying

Actor systems need to interact with the outside world

## Hierarchy

Actors can create child actors of their own, and accordingly every actor has a parent. Up till now we've been creating 
actors which are children of the actor system (which is a pseudo actor). However in a real system, this would be 
considered an anti pattern, for much the same reasons as placing all your code in a single file is an anti-pattern. 
By exploiting the actor hierarchy, you can enforce a separation of concerns and encapsulate system functionality, while
providing a coherent means of dealing with failure.

In this example

## Actor Context

Stateful and Stateful Actors take in a the context parameter

## Persistent actor