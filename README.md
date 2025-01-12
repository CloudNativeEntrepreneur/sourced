[![Build Status](https://travis-ci.org/mateodelnorte/sourced.svg?branch=master)](https://travis-ci.org/mateodelnorte/sourced)
[![codecov](https://codecov.io/gh/cloudnativeentrepreneur/sourced/branch/master/graph/badge.svg?token=QXt8Vlir6A)](https://codecov.io/gh/cloudnativeentrepreneur/sourced)

sourced
=======

Tiny framework for building models with the [event sourcing](http://cqrs.nu/Faq/event-sourcing) pattern (events and snapshots) that works in Node.js and the browser. Now written in Typescript and published in ESM and CJS.

Unlike Active Record where entity state is persisted on a one-model-per row database format, event sourcing stores all the 
changes (events) to the entity, rather than just its current state. The current state is derived by loading all events, or a 
latest snapshot plus subsequent events, and replaying them against the entity. 

One large benefit of event sourcing: your data *_is_* your audit trail. Zero discrepancies. 

For example usage, see the [examples](./examples) and [__tests__](./__tests__).

Sourced makes no assumptions about how you _store_ your events and snapshots. The library is small and tight with only the required functionality to define entities and their logic, enqueue and emit events, and track event state to later be persisted. To actually persist, use one of the following libraries or implement your own: 

- [mateodelnorte/sourced-repo-mongo](https://github.com/mateodelnorte/sourced-repo-mongo)
- [wolfejw86/sourced-repo-dynamodb](https://github.com/wolfejw86/sourced-repo-dynamodb) (Typescript)

Partially Implemented (only get, commit - no getAll, commitAll - ok for many use cases - PRs welcome!)
- [CloudNativeEntrepreneur/sourced-repo-typeorm](https://github.com/CloudNativeEntrepreneur/sourced-repo-typeorm) - works with PostgreSQL and CockroachDB - written in Typscript
- [CloudNativeEntrepreneur/sourced-repo-svelte-local-storage-store](https://github.com/CloudNativeEntrepreneur/sourced-repo-svelte-local-storage-store) - Typescript - for use in Browsers with Svelte
- [dermidgen/sourced-repo-couchdb](https://github.com/dermidgen/sourced-repo-couchdb)


# Example 

```javascript
const Entity = require('sourced').Entity;

class Market extends Entity {
  constructor(snapshot, events) {
    super()
    this.orders = [];
    this.price = 0;

    this.rehydrate(snapshot, events)
  }

  init(param) {
    this.id = param.id;
    this.digest('init', param);
    this.emit('initialized', param, this);
  }

  createOrder(param) {
    this.orders.push(param);
    var total = 0;
    this.orders.forEach(function (order) {
      total += order.price;
    });
    this.price = total / this.orders.length;
    this.digest('createOrder', param);
    this.emit('done', param, this);
  };
}
```

# Reference

## Classes

<dl>
<dt><a href="#Entity">Entity</a></dt>
<dd><p>{Function} Entity</p>
</dd>
<dt><a href="#EntityError">EntityError</a></dt>
<dd><p>{Function} EntityError</p>
</dd>
</dl>

<a name="Entity"></a>

## Entity
{Function} Entity

**Kind**: global class
**Requires**: <code>module:eventemitter3</code>, <code>module:debug</code>, <code>module:lodash.clonedeep</code>
**License**: MIT

* [Entity](#Entity)
    * [new Entity([snapshot], [events])](#new_Entity_new)
    * _instance_
        * [.emit()](#Entity+emit)
        * [.enqueue()](#Entity+enqueue)
        * [.digest(method, data)](#Entity+digest)
        * [.merge(snapshot)](#Entity+merge)
        * [.mergeProperty(name, value)](#Entity+mergeProperty)
        * [.replay(events)](#Entity+replay)
        * [.snapshot()](#Entity+snapshot) ⇒ <code>Object</code>
        * [.trimSnapshot(snapshot)](#Entity+trimSnapshot)
    * _static_
        * [.digestMethod(type, fn)](#Entity.digestMethod)
        * [.mergeProperty(type, name, fn)](#Entity.mergeProperty)

<a name="new_Entity_new"></a>

### new Entity([snapshot], [events])
Creates an event-sourced Entity.


| Param | Type | Description |
| --- | --- | --- |
| [snapshot] | <code>Object</code> | A previously saved snapshot of an entity. |
| [events] | <code>Array</code> | An array of events to apply on instantiation. |

<a name="Entity+emit"></a>

### entity.emit()
Wrapper around the EventEmitter.emit method that adds a condition so events
are not fired during replay.

**Kind**: instance method of <code>[Entity](#Entity)</code>
<a name="Entity+enqueue"></a>

### entity.enqueue()
Add events to the queue of events to emit. If called during replay, this
method does nothing.

**Kind**: instance method of <code>[Entity](#Entity)</code>
<a name="Entity+digest"></a>

### entity.digest(method, data)
Digest a command with given data.This is called whenever you want to record
a command into the events for the entity. If called during replay, this
method does nothing.

**Kind**: instance method of <code>[Entity](#Entity)</code>

| Param | Type | Description |
| --- | --- | --- |
| method | <code>String</code> | the name of the method/command you want to digest. |
| data | <code>Object</code> | the data that should be passed to the replay. |

<a name="Entity+merge"></a>

### entity.merge(snapshot)
Merge a snapshot onto the entity.

For every property passed in the snapshot, the value is deep-cloned and then
merged into the instance through mergeProperty. See mergeProperty for details.

**Kind**: instance method of <code>[Entity](#Entity)</code>
**See**: Entity.prototype.mergeProperty

| Param | Type | Description |
| --- | --- | --- |
| snapshot | <code>Object</code> | snapshot object. |

<a name="Entity+mergeProperty"></a>

### entity.mergeProperty(name, value)
Merge a property onto the instance.

Given a name and a value, mergeProperty checks first attempt to find the
property in the mergeProperties map using the constructor name as key. If it
is found and it is a function, the function is called. If it is NOT found
we check if the property is an object. If so, we merge. If not, we simply
assign the passed value to the instance.

**Kind**: instance method of <code>[Entity](#Entity)</code>
**See**

- mergeProperties
- Entity.mergeProperty


| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | the name of the property being merged. |
| value | <code>Object</code> | the value of the property being merged. |

<a name="Entity+replay"></a>

### entity.replay(events)
Replay an array of events onto the instance.

The goal here is to allow application of events without emitting, enqueueing
nor digesting the replayed events. This is done by setting this.replaying to
true which emit, enqueue and digest check for.

If the method in the event being replayed exists in the instance, we call
the mathod with the data in the event and set the version of the instance to
the version of the event. If the method is not found, we attempt to parse the
constructor to give a more descriptive error.

**Kind**: instance method of <code>[Entity](#Entity)</code>

| Param | Type | Description |
| --- | --- | --- |
| events | <code>Array</code> | an array of events to be replayed. |

<a name="Entity+state"></a>

### entity.state() ⇒ <code>Object</code>
Return a clone of current state of the entity instance without event sourcing properties. Does not modify anything.

**Kind**: instance method of <code>[Entity](#Entity)</code>

<a name="Entity+snapshot"></a>

### entity.snapshot() ⇒ <code>Object</code>
Create a snapshot of the current state of the entity instance.

Here the instance's snapshotVersion property is set to the current version,
then the instance is deep-cloned and the clone is trimmed of the internal
sourced attributes using trimSnapshot and returned.

**Kind**: instance method of <code>[Entity](#Entity)</code>
<a name="Entity+trimSnapshot"></a>

### entity.trimSnapshot(snapshot)
Remove the internal sourced properties from the passed snapshot.

Snapshots are to contain only entity data properties. This trims all other
properties from the snapshot.

**Kind**: instance method of <code>[Entity](#Entity)</code>
**See**: Entity.prototype.snapshot

| Param | Type | Description |
| --- | --- | --- |
| snapshot | <code>Object</code> | the snapshot to be trimmed. |

<a name="Entity.digestMethod"></a>

### Entity.digestMethod(type, fn)
Helper function to automatically create a method that calls digest on the
param provided. Use it to add methods that automatically call digest.

**Kind**: static method of <code>[Entity](#Entity)</code>

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Object</code> | the entity class to which the method will be added. |
| fn | <code>function</code> | the actual function to be added. |

**Example**
```js
Entity.digestMethod(Car, function clearSettings (param) {

    const self = this;

    this.settings.get(param.name).forEach((name, config) => {

      config.sources.forEach((source) => {

        source.remove();

      });

    });

    return this.settings;

   });
```
<a name="Entity.mergeProperty"></a>

### Entity.mergeProperty(type, name, fn)
Convenience function to store references to functions that should be run
when mergin a particular property.

**Kind**: static method of <code>[Entity](#Entity)</code>
**See**: mergeProperties

| Param | Type | Description |
| --- | --- | --- |
| type | <code>Object</code> | the entity class to which the property->fn belongs to. |
| name | <code>String</code> | the name of the property that holds the fn. |
| fn | <code>function</code> | the function to execute when merging the property. |

**Example**
```js
function Wheel (status) {
   this.status = status;
 }

 Wheel.prototype.go = function () {
   this.status = 'going';
 }

 function Car () {
   this.id = null;
   this.wheel = new Wheel(); // for instantiating our default wheel, when we first 'new' up a Car

   Entity.apply(this, arguments);
 }

 util.inherits(Car, Entity);

 Entity.mergeProperty(Car, 'interests', function (obj) {
   this.wheel = new Wheel(); // for instantiating our wheel from saved values in a database
 });
```
<a name="eventsToEmit"></a>

## eventsToEmit : <code>Array</code>
[Description]

**Kind**: global variable
**Todo**

- [ ] discuss the use of this so it can be documented better.

<a name="newEvents"></a>

## newEvents : <code>Array</code>
[Description]

**Kind**: global variable
**Todo**

- [ ] discuss the use of this so it can be documented better.

<a name="replaying"></a>

## replaying : <code>Boolean</code>
Boolean to prevent emit, enqueue and digest from running during replay.

**Kind**: global variable
<a name="snapshotVersion"></a>

## snapshotVersion : <code>Number</code>
Holds the version of the latest snapshot for the entity.

**Kind**: global variable
<a name="timestamp"></a>

## timestamp : <code>Number</code>
Holds the event's timestamp in the entity.

**Kind**: global variable
<a name="version"></a>

## version : <code>Number</code>
Holds the current version of the entity.

**Kind**: global variable
<a name="mergeProperties"></a>

## mergeProperties
mergeProperties holds a map of entity types to properties.

**Kind**: global variable
**See**

- Entity.mergeProperty
- Entity.prototype.mergeProperty

<a name="EntityError"></a>

## EntityError
{Function} EntityError

**Kind**: global class
<a name="new_EntityError_new"></a>

### new EntityError(msg, [constr])
Extending native Error.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| msg | <code>String</code> |  | The error message. |
| [constr] | <code>Object</code> | <code>this</code> | The constructor or instance. |

# In the browser

Sourced works just the same in the browser as in Node.js, though you'll want to use it with a browser based repo, such as [sourced-repo-svelte-local-storage-store](https://github.com/CloudNativeEntrepreneur/sourced-repo-svelte-local-storage-store).

You can see an example event sourced SvelteKit application here: [CloudNativeEntrepreneur/sveltekit-eventsourced-funnel](https://github.com/CloudNativeEntrepreneur/sveltekit-eventsourced-funnel)

# Upgrading from V2 to v3

To upgrade from v2, to v3, update your imports of `SourcedEntity` to `Entity`.

Before:
```
import { SourcedEntity as Entity } from 'sourced'

class YourAggregate extends Entity {
```

Now:
```
import { Entity } from 'sourced'

class YourAggregate extends Entity {
// ...
```

If you are using classical prototypical inheritance, then you were using the `Entity` export - this was actually a proxy constructor that allowed the classical syntax to work with ES6 classes. This is now named `EntityProxy`.

Before:
```
const Entity = require('sourced').Entity
```

Now:
```
const Entity = require('sourced').EntityProxy
```

See examples directory for an examply of using the `EntityProxy` - run it with `npm ci && npm run build && node examples/auth/example.js`

# Upgrading 

## sourced v4
- Typescript rewrite - thanks to work on this at https://github.com/PDMLab/sourced-ts by @alexander.zeitler and @stephanknull, pulled in by @patrickleet
- BREAKING CHANGE: now publishes ESM and CJS modules at /dist/esm and /dist/cjs

## sourced v3
- Browser support by using `eventemitter3.EventEmitter` instead of Node `events.EventEmitter` by @patrickleet
- BREAKING CHANGE: `Entity` is now `EntityProxy`. `SourcedEntity` is now `Entity`

## sourced v2
- updated to ES6 syntax by @patrickleet
- `SourcedEntity` an ES6 implementation of `Entity` added.
- `Entity` is now just a proxy to the new `SourcedEntity` ES6 class. 
- Deprecation notice: `SourcedEntity` will become `Entity` in the next major version, and `Entity`, which is now a proxy, left for backwards compatibility 

## sourced v1
- original lib by @mateodelnorte - battle tested in financial systems that tranact billions of dollars.
