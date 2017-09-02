# NAct
A multithreaded actor system for node.js. 

[![Build Status](https://travis-ci.org/ncthbrt/nact.svg?branch=master)](https://travis-ci.org/ncthbrt/nact)

## Introduction

In the late 80s, Erisson needed a language in which to program the next generation of telephone exchanges. The language needed to be distributed by design, highly available, and fault tolerant. A team consisting initially of Joe Armstrong, Mike Williams and Robert Virding came up with an elegant solution: [Erlang](erlang.org). 

Erlang was inpsired by a mathematical formalism of distributed systems called the [actor model](http://www.brianstorti.com/the-actor-model/). The actor model describes distributed systems as a set of indepently running processes called actors. Actors communicate through message passing and can create, destroy and supervise the lifecycle of child actors. Whenever an actor is sent a message, it is added to its mailbox queue. An actor can retrieve a single message from the front of its mailbox at a time, and in response, perform some side effect, or send messages to other actors. If an actor behaves badly, the integrity of the system is preserved as actors are partitioned from one another.

A concrete example one could use is Whatsapp (which was known at some point to have been using Erlang on its servers). While their codebase is closed, a naive implemenation of their group chat feature could be as follows:

A connection between a single user's mobile app and the servers is represented as an actor. This actor can receive two types of messages: A `send` message from the user which contains the message contents and a group or user id to which the message is addressed. The other message is a `receive` message, which contains the sender and group id and message contents. The `receive` message is forwarded to the mobile client, while the `send` message is passed to an actor representing the user or group to which the message is addressed. The actor stores the references to all actors involved in the group conversation and whenever it receives a `send` message, it maps it to a message of type `receive` and sends it to all group member actors. 

The relative simplicity (even though it of course misses out some important production details) of this system is exactly the sort of use case Erlang was created for. The trouble is that Erlang, while excellent for some use cases, isn't in my opinion a general purpose enough language, which has had an impact on its ecosystem and libaries. 

NAct is an implementation of the Actor Model in Node.js. It is inspired by the approaches taken by [Akka](getakka.net) (available on the JVM and the CLR) and Erlang. The initial release is focused on providing a good experience on a single node, though later releases will focus on enabling scaleout.

NAct achieves fault tolerance and parallelism  through the use of [Node Webworker Threads](https://github.com/audreyt/node-webworker-threads). Webworker Threads allow full utilisation of a server's CPU while isolating workers from their peers. A design decision of WebWorker threads is that it disallows `require()` from within actors and so a unique aspect of NAct is its effect system, which will be explained in depth later in this README.

## Getting Started

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/https://nact-getting-started.glitch.me)