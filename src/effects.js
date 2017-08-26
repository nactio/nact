import { LocalPath } from './paths';
import Actor from './actor';
import Effect from './effect';

export const tell =
    new Effect((actor, recipient, message, sender) => {        
        sender = sender || actor.path;        
        const concreteRecipient = LocalPath.actorFromReference(recipient, actor.system);
        if(!concreteRecipient.isStopped){                        
            concreteRecipient.tell(message,sender);
        }        
    });

export const stop =
    new Effect((actor) => actor.stop());

export const spawn =
    new Effect((actor, f, name) => actor.spawn(f,name), true);

export const spawnSimple =
    new Effect((actor, f, name) => actor.spawnSimple(f,name), true);