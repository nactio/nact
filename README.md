![nact Logo](https://raw.githubusercontent.com/ncthbrt/nact/master/assets/logo.svg?sanitize=true)

**nact ⇒ node.js + actors**\
*your services have never been so µ*


<!-- Badges -->
[![Travis branch](https://img.shields.io/travis/ncthbrt/nact/master.svg?style=flat-square)]()
[![Coveralls](https://img.shields.io/coveralls/ncthbrt/nact.svg?style=flat-square)]() [![Dependencies](https://david-dm.org/ncthbrt/nact.svg?branch=master&style=flat-square)](https://david-dm.org/ncthbrt/nact) 

[![npm](https://img.shields.io/npm/v/nact.svg?style=flat-square)](https://www.npmjs.com/package/nact) 
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-blue.svg?style=flat-square)](https://github.com/Flet/semistandard) 
[![we are reactive](https://img.shields.io/badge/we_are-reactive-blue.svg?style=flat-square)](https://www.reactivemanifesto.org/)

> Note:
>
> Any and all feedback, comments and suggestions are welcome. Please open an issue if you
> find anything unclear or misleading in the documentation. 

# Sponsored by 
[![Root Logo](https://raw.githubusercontent.com/ncthbrt/nact/master/root-logo.svg?sanitize=true)](https://root.co.za)

# Table of Contents
  * [Introduction](#introduction)
  * [Core Concepts](#the-basics)
    * [Getting Started](#getting-started)
    * [Stateful Actors](#stateful-actors)
    * [Actor Communication](#actor-communication)
    * [Querying](#querying)
    * [Hierarchy](#hierarchy)
  * [Persistence](#persistence)
  * [API](#api)
    * [System Reference](#system-reference)
    * [Actor Reference](#actor-reference)
    * [Internal Context](#internal-context)

# Introduction
Nact is an implementation of the actor model for Node.js. It is inspired by the approaches taken by [Akka](getakka.net)
and [Erlang](https://erlang.com). Additionally it attempts to provide a familiar interface to users coming from Redux. 
The goal of the project is to provide a simple way to create and reason about µ-services and asynchronous event driven 
architectures in Node.js.

The actor model describes a system made up of a set of entities called actors. An actor could be described as an 
independently running packet of state. Actors communicate solely by passing messages to one another. 
Actors can also create more actors. This explanation may sound overly simplified but it really isn't! 

Actor systems have been used to drive hugely scalable, highly available systems (such as WhatsApp and
Twitter), but that doesn't mean it is exclusively for companies with big problems and even bigger pockets. 

Microservice architectures are extremely popular right now, but a common grievance is the difficultly in determining your system's 
bounded contexts, along with increased operational complexity. Nact is designed to solve these problems:

  * Creating a new type of actor is a very lightweight operation in contrast to creating a whole new web api and 
    deployment, and due to the magic of [location transparency](https://doc.akka.io/docs/akka/2.5.4/java/general/remoting.html) 
    and that actors share no state, it would be trivial to move this actor to a new server when a server starts to show 
    strain (i.e. no premature optimization)
  * As actors are usually more strongly encapsulated than a procedural architecture, it means that the spaghetti you 
    might see in a monolithic system is far less likely to happen in the first place. 
    
These benefits make actor systems a compelling alternative to a purely RESTful µ-services architecture.

# The basics

## Getting Started
[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/nact-stateless-greeter)

> Tip: The remix buttons like the one above, allow you to try out the samples in this guide and make changes to them. 
> Playing around with the code is probably the  

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
const greeter = spawnStateless(
  system, // parent
  (msg, ctx) => console.log(`Hello ${msg.name}`), // function
  'greeter' // name
);
```

The first argument to `spawnStateless` is the parent, which is in this case the actor system. 
The hierarchy section will go into more detail about this.

The second argument to `spawnStateless` is a function which is invoked when a message is received.

The third argument to `spawnStateless` is the name of the actor, which in this case is `'greeter'`. The name field is 
optional, and if omitted, the actor is automatically assigned a name by the system.

To communicate with the greeter, we need to `dispatch` a message to it informing it who we are:

```js
greeter.dispatch({ name: 'Erlich Bachman' });
```

This should print `Hello Erlich Bachman` to the console. 

To complete this example, we need to shutdown our system. We can do this
by calling `system.stop()`

## Stateful Actors
[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/nact-stateful-greeter)

One of the major advantages of an actor system is that it offers a safe way of creating stateful services. A stateful
actor is created using the `spawn` function.

In this example, the state is initialized to an empty object. Each time a message is received by the actor, the current
state is passed in as the first argument to the actor.  Whenever the actor encounters a name it hasn't encountered yet,
it returns a copy of previous state with the name added. If it has already encountered the name it simply returns the 
unchanged current state. The return value is used as the next state.

```js
const statefulGreeter = spawn(
  system, 
  (state = {}, msg, ctx) => {
    const hasPreviouslyGreetedMe = state[msg.name] !== undefined;
    if(hasPreviouslyGreetedMe) {
      console.log(`Hello again ${msg.name}.`);  
      return state;
    } else {
      console.log(
        `Good to meet you, ${msg.name}.\nI am the stateful-greeter service!`
      );
      return { ...state, [msg.name]: true };
    }
  },
  'stateful-greeter'
);
```

If no state is returned or the state returned is `undefined` or `null`, stateful actors automatically shut down.

## Actor Communication
[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/nact-ping-pong)

An actor alone is a somewhat useless construct; actors need to work together. Actors can send messages to one another by
using the dispatch method found on the context object. 

In this example, the actors Ping and Pong are playing a perfect ping-pong match. 
To start the match, we dispatch a message to Ping as Pong. 

> Note: Ping is behaving in an asynchronous manner, however it won't handle the next message until the previous 
> execution has fully resolved.

```js
const delay = (time) => new Promise((res) => setTimeout(res, time));

const ping = spawnStateless(system, async (msg, ctx) =>  {
  console.log(msg);
  // ping: Pong is a little slow. So I'm giving myself a little handicap :P
  await delay(500);
  ctx.dispatch(ctx.sender, ctx.name);
}, 'ping');

const pong = spawnStateless(system, (msg, ctx) =>  {
  console.log(msg);
  ctx.dispatch(ctx.sender, ctx.name);
}, 'pong');

ping.dispatch('begin', pong);
```
This produces the following console output:

``` 
begin
ping
pong
ping
pong
ping
etc...
```

## Querying

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/nact-contacts-1)


Actor systems don't live in a vacuum, they need to be available to the outside world.
Commonly actor systems are fronted by REST APIs or RPC frameworks. REST and RPC style access patterns are blocking: 
a request comes in, it is processed, and finally returned to the sender using the original connection. To help bridge 
nact's non blocking nature, references to actors have a `query` function. Query returns a promise.

Similar to `dispatch`, `query` pushes a message on to an actor's mailbox, but differs in that it also creates a virtual 
actor. When this virtual actor receives a message, the promise returned by the query resolves. 

In addition to the message, `query` also takes in a timeout value measured in milliseconds. If a query takes longer than 
this time to resolve, it times out and the promise is rejected. A time bounded query is very important in a production 
system; it ensures that a failing subsystem does not cause cascading faults as queries queue up and stress available 
system resources.

In this example, we'll create a simple single user in-memory address book system. To make it more realistic, we'll host
it as an express app. You'll need to install `express`, `body-parser`, `uuid` and of course `nact` using npm to get 
going.

> Note: We'll expand on this example in later sections.

What are the basic requirements of a basic address book API? It should be able to:
 - Create a new contact 
 - Fetch all contacts
 - Fetch a specific contact
 - Update an existing contact
 - Delete a contact

To implement this functionality, we'll need to create the following endpoints:
  - POST `/api/contacts` - Create a new contact 
  - GET `/api/contacts` - Fetch all contacts
  - GET `/api/contacts` - Fetch a specific contact
  - PATCH `/api/contacts/:contact_id` - Update an existing contact
  - DELETE `/api/contacts/:contact_id` - Delete a contact

Here are the stubs for setting up the server and endpoints:

```js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.get('/api/contacts', (req,res) => { /* Fetch all contacts */ });
app.get('/api/contacts/:contact_id', (req,res) => { /* Fetch a specific contact */ });
app.post('/api/contacts', (req,res) => { /* Create a new contact */ });
app.patch('/api/contacts/:contact_id', (req,res) => { /* Update an existing contact */ });
app.delete('api/contacts/:contact_id', (req,res) => { /* Delete a contact */ });

app.listen(process.env.PORT || 3000, function () {
  console.log('Address book listening on port 3000!');
});
```

Because actor are message driven, let us define the message types used between the express api and actor system:

```js
 const ContactProtocolTypes = {
   GET_CONTACTS: 'GET_CONTACTS',
   GET_CONTACT: 'GET_CONTACT',
   UPDATE_CONTACT: 'UPDATE_CONTACT',
   REMOVE_CONTACT: 'REMOVE_CONTACT',
   CREATE_CONTACT: 'CREATE_CONTACT',
   // Operation sucessful
   SUCCESS: 'SUCCESS',
   // And finally if the contact is not found
   NOT_FOUND: 'NOT_FOUND'
 };
```
Our contacts actor will need to handle each message type:

```js
const uuid = require('uuid/v4');

const contactsService = spawn(
  system,
  (state = { contacts:{} }, msg, ctx) => {    
    if(msg.type === GET_CONTACTS) {
        // Return all the contacts as an array
        ctx.dispatch(ctx.sender, { payload: Object.values(state.contacts), type: SUCCESS });
    } else if (msg.type === CREATE_CONTACT) {
        const newContact = { id: uuid(), ...msg.payload };
        const nextState = { contacts: { ...state.contacts, [newContact.id]: newContact } };
        ctx.dispatch(ctx.sender, { type: SUCCESS, payload: newContact });
        return nextState;
    } else {
        // All these message types require an existing contact
        // So check if the contact exists
        const contact = state.contacts[msg.contactId];
        if (contact) {            
            switch(msg.type) {
              case GET_CONTACT: {
                ctx.dispatch(ctx.sender, { payload: contact, type: SUCCESS });
                break;
              }
              case REMOVE_CONTACT: {
                // Create a new state with the contact value to undefined
                const nextState = { ...state.contacts, [contact.id]: undefined };
                ctx.dispatch(ctx.sender, { type: SUCCESS, payload: contact });
                return nextState;                 
              }
              case UPDATE_CONTACT:  {
                // Create a new state with the previous fields of the contact merged with the updated ones
                const updatedContact = {...contact, ...msg.payload };
                const nextState = { ...state.contacts, [contact.id]: updatedContact };
                ctx.dispatch(ctx.sender, { type: SUCCESS, payload: updatedContact });
                return nextState;                 
              }
            }
        } else {
          // If it does not, dispatch a not found message to the sender
          ctx.dispatch(ctx.sender, { type: NOT_FOUND, contactId: msg.contactId });
        }
    }      
    // Return the current state if unchanged.
    return state;
  },
  'contacts'
);
```

Now to wire up the contact service to the API controllers, we have create a query for each endpoint. For example here 
is how to wire up the fetch a specific contact endpoint (the others are very similar):

```js
app.get('/api/contacts/:contact_id', async (req,res) => { 
  const contactId = req.params.contact_id;
  const msg = { type: GET_CONTACT, contactId };
  try {
    const result = await contactService.query(msg, 250); // Set a 250ms timeout
    switch(result.type) {
      case SUCCESS: res.json(result.payload); break;
      case NOT_FOUND: res.sendStatus(404); break;
      default:
        // This shouldn't ever happen, but means that something is really wrong in the application
        console.error(JSON.stringify(result));
        res.sendStatus(500);
        break;
    }
  } catch (e) {
    // 504 is the gateway timeout response code. Nact only throws on queries to a valid actor reference if the timeout 
    // expires.
    res.sendStatus(504);
  }
});
```
Now this is a bit of boilerplate for each endpoint, but could be refactored so as to extract the error handling into a 
separate function. This would allow us to define the endpoints as follows:
```js

app.get('/api/contacts', (req,res) => performQuery({ type: GET_CONTACTS }, res));

app.get('/api/contacts/:contact_id', (req,res) => 
  performQuery({ type: GET_CONTACT, contactId: req.params.contact_id }, res)
);

app.post('/api/contacts', (req,res) => performQuery({ type: CREATE_CONTACT, payload: req.body }, res));

app.patch('/api/contacts/:contact_id', (req,res) => 
  performQuery({ type: UPDATE_CONTACT, contactId: req.params.contact_id, payload: req.body }, res)
);

app.delete('api/contacts/:contact_id', (req,res) => 
  performQuery({ type: REMOVE_CONTACT, contactId: req.params.contact_id }, res)
);
```

This should leave you with a working but very basic contacts service. 

## Hierarchy

The application we made in the [Querying](#querying) section isn't very useful. For one it only supports a single user's 
contacts and two it 

Actors can create child actors of their own, and accordingly every actor has a parent. Up till now we've been creating 
actors which are children of the actor system (which is a pseudo actor). However in a real system, this would be 
considered an anti pattern, for much the same reasons as placing all your code in a single file is an anti-pattern. 
By exploiting the actor hierarchy, you can enforce a separation of concerns and encapsulate system functionality, while
providing a coherent means of dealing with failure.

<img height="500px" alt="Example of an Actor System Hierarchy" src="https://raw.githubusercontent.com/ncthbrt/nact/master/assets/hierarchy-diagram.svg?sanitize=true"/>

# Persistence

The contacts service we've been working on STILL isn't very useful. While we've extended the service to support multiple
users, it has the unfortunate limitation that it loses the contacts each time the machine restarts. To remedy these 
types of situations, nact extends stateful

# API

## System Reference
## Actor Reference
## Internal Context
