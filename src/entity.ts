/* jslint node: true */

import debug from "debug";
import EventEmitter from "eventemitter3";
import cloneDeep from "lodash.clonedeep";

const log = debug("sourced");

/**
 * Extending native Error.
 *
 * @class {Function} EntityError
 * @param {String} msg The error message.
 */
class EntityError extends Error {
  constructor(...args) {
    super(...args);
    log("Entity Error: ", this);
    Error.captureStackTrace(this, EntityError);
  }
}

/**
 * mergeProperties holds a map of entity types to properties.
 *
 * @see Entity.mergeProperty
 * @see Entity.prototype.mergeProperty
 * @static
 */
const mergeProperties = new Map();

/**
 * Creates an event-sourced Entity.
 *
 * @class {Function} Entity
 * @param {Object} [snapshot] A previously saved snapshot of an Entity.
 * @param {Array} [events] An array of events to apply on instantiation.
 * @requires eventemitter3
 * @requires debug
 * @requires lodash.clonedeep
 * @license MIT
 */

export class Entity extends EventEmitter {
  eventsToEmit: any[];
  newEvents: any[];
  replaying: boolean;
  snapshotVersion: number;
  timestamp: number;
  version: number;
  constructor() {
    super();

    /**
     * [Description]
     * @member {Array} eventsToEmit
     * @todo discuss the use of this so it can be documented better.
     */
    this.eventsToEmit = [];

    /**
     * [Description]
     * @member {Array} newEvents
     * @todo discuss the use of this so it can be documented better.
     */
    this.newEvents = [];

    /**
     * Boolean to prevent emit, enqueue and digest from running during replay.
     * @member {Boolean} replaying
     */
    this.replaying = false;

    /**
     * Holds the version of the latest snapshot for the Entity.
     * @member {Number} snapshotVersion
     */
    this.snapshotVersion = 0;

    /**
     * Holds the event's timestamp in the Entity.
     * @member {Number} timestamp
     */
    this.timestamp = Date.now();

    /**
     * Holds the current version of the Entity.
     * @member {Number} version
     */
    this.version = 0;
  }

  /**
   * Rehydrates by merging a snapshot, and replaying events on top.
   */
  rehydrate(snapshot: any, events: any[]) {
    log("rehydrating", this);
    /**
     * If a snapshot is provided, merge it.
     */
    if (snapshot) {
      this.merge(snapshot);
    }

    /**
     * If events are also provided, replay them
     */
    if (events) {
      this.replay(events);
    }
  }

  /**
   * Wrapper around the EventEmitter.emit method that adds a condition so events
   * are not fired during replay.
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    if (!this.replaying) {
      super.emit(event, ...args);
    }
    return true;
  }

  /**
   * Add events to the queue of events to emit. If called during replay, this
   * method does nothing.
   */
  enqueue(...args: any[]) {
    if (!this.replaying) {
      this.eventsToEmit.push(args);
    }
  }

  /**
   * Digest a command with given data.This is called whenever you want to record
   * a command into the events for the Entity. If called during replay, this
   * method does nothing.
   *
   * @param  {String} method  the name of the method/command you want to digest.
   * @param  {Object} data    the data that should be passed to the replay.
   */
  digest(method: string, data: any) {
    if (!this.replaying) {
      this.timestamp = Date.now();
      this.version = this.version + 1;
      log(`digesting event ${method} w/ data`, { method, data });
      this.newEvents.push({
        method: method,
        data: data,
        timestamp: this.timestamp,
        version: this.version,
      });
    }
  }

  /**
   * Merge a snapshot onto the Entity.
   *
   * For every property passed in the snapshot, the value is deep-cloned and then
   * merged into the instance through mergeProperty. See mergeProperty for details.
   *
   * @param  {Object} snapshot  snapshot object.
   * @see Entity.mergeProperty
   */
  merge(snapshot: any) {
    log("merging snapshot", { snapshot });
    for (const property in snapshot) {
      const val = cloneDeep(snapshot[property]);
      this.mergeProperty(property, val);
    }
    return this;
  }

  /**
   * Merge a property onto the instance.
   *
   * Given a name and a value, mergeProperty checks first attempt to find the
   * property in the mergeProperties map using the constructor name as key. If it
   * is found and it is a function, the function is called. If it is NOT found
   * we check if the property is an object. If so, we merge. If not, we simply
   * assign the passed value to the instance.
   *
   * @param  {String} name   the name of the property being merged.
   * @param  {Object} value  the value of the property being merged.
   * @see mergeProperties
   * @see Entity.mergeProperty
   */
  mergeProperty(name: string, value: any) {
    if (
      mergeProperties.size &&
      mergeProperties.has(Object.getPrototypeOf(this).constructor.name) &&
      mergeProperties
        .get(Object.getPrototypeOf(this).constructor.name)
        .has(name) &&
      typeof mergeProperties
        .get(Object.getPrototypeOf(this).constructor.name)
        .get(name) === "function"
    ) {
      return mergeProperties
        .get(Object.getPrototypeOf(this).constructor.name)
        .get(name)
        .call(this, value);
    } else if (typeof value === "object" && typeof this[name] === "object") {
      Object.assign(this, {
        [name]: value,
      });
    } else {
      this[name] = value;
    }
  }

  /**
   * Replay an array of events onto the instance.
   *
   * The goal here is to allow application of events without emitting, enqueueing
   * nor digesting the replayed events. This is done by setting this.replaying to
   * true which emit, enqueue and digest check for.
   *
   * If the method in the event being replayed exists in the instance, we call
   * the mathod with the data in the event and set the version of the instance to
   * the version of the event. If the method is not found, we attempt to parse the
   * constructor to give a more descriptive error.
   *
   * @param  {Array} events  an array of events to be replayed.
   */
  replay(events) {
    this.replaying = true;

    log("replaying events", { events });

    events.forEach((event) => {
      if (this[event.method]) {
        this[event.method](event.data);
        this.version = event.version;
      } else {
        const classNameRegexes = [
          /function\s+(\w+)\s?\(/,
          /class\s+(\w+)\s+extends?/,
        ];
        const match = classNameRegexes.find((regex) =>
          regex.test(this.constructor.toString())
        );
        const className = match.exec(this.constructor!.toString())[1];
        const errorMessage = `method '${
          event.method
        }' does not exist on model '${className.trim()}'`;
        throw new EntityError(errorMessage);
      }
    });

    this.replaying = false;
  }

  /**
   * Returns a clone of the entity's current state without the event sourcing properties
   *
   * Here the instance's snapshotVersion property is set to the current version,
   * then the instance is deep-cloned and the clone is trimmed of the internal
   * sourced attributes using trimSnapshot and returned.
   *
   * @returns  {Object}
   */
  state(): Omit<
    this,
    "eventsToEmit" | "newEvents" | "replaying" | "_events" | "_maxListeners"
  > {
    const state = cloneDeep(this);
    return this.trimSnapshot(state);
  }

  /**
   * Create a snapshot of the current state of the entity instance.
   *
   * Here the instance's snapshotVersion property is set to the current version,
   * then the instance is deep-cloned and the clone is trimmed of the internal
   * sourced attributes using trimSnapshot and returned.
   *
   * @returns  {Object}
   */
  snapshot(): Omit<
    this,
    "eventsToEmit" | "newEvents" | "replaying" | "_events" | "_maxListeners"
  > {
    this.snapshotVersion = this.version;
    const snap = cloneDeep(this);
    return this.trimSnapshot(snap);
  }

  /**
   * Remove the internal sourced properties from the passed snapshot.
   *
   * Snapshots are to contain only entity data properties. This trims all other
   * properties from the snapshot.
   *
   * @param  {Object} snapshot  the snapshot to be trimmed.
   * @see Entity.prototype.snapshot
   */
  trimSnapshot(
    snapshot
  ): Omit<
    this,
    "eventsToEmit" | "newEvents" | "replaying" | "_events" | "_maxListeners"
  > {
    delete snapshot.eventsToEmit;
    delete snapshot.newEvents;
    delete snapshot.replaying;
    delete snapshot._events;
    delete snapshot._maxListeners;
    return snapshot;
  }

  /**
   * Helper function to automatically create a method that calls digest on the
   * param provided. Use it to add methods that automatically call digest.
   *
   * @param  {Object} type  the entity class to which the method will be added.
   * @param  {Function} fn  the actual function to be added.
   * @example
   *
   *    Entity.digestMethod(Car, function clearSettings (param) {
   *
   *     const self = this;
   *
   *     this.settings.get(param.name).forEach((name, config) => {
   *
   *       config.sources.forEach((source) => {
   *
   *         source.remove();
   *
   *       });
   *
   *     });
   *
   *     return this.settings;
   *
   *    });
   *
   */
  static digestMethod(type: any, fn: any) {
    if (!fn.name)
      throw new EntityError(
        "Anonmyous functions are not allowed in digest method definitions. Please provide a function name"
      );
    type.prototype[fn.name] = function (...args: any[]) {
      const digestArgs = Array.prototype.slice.call(args);
      digestArgs.unshift(fn.name);
      Entity.prototype.digest.apply(this, digestArgs);

      const methodArgs = Array.prototype.slice.call(args);
      return fn.apply(this, methodArgs);
    };
  }

  /**
   * Convenience function to store references to functions that should be run
   * when merging a particular property.
   *
   * @param  {Object} type  the entity class to which the property->fn belongs to.
   * @param  {String} name  the name of the property that holds the fn.
   * @param  {Function} fn  the function to execute when merging the property.
   * @see mergeProperties
   * @example
   *  function Wheel (status) {
   *    this.status = status;
   *  }
   *
   *  Wheel.prototype.go = function () {
   *    this.status = 'going';
   *  }
   *
   *  function Car () {
   *    this.id = null;
   *    this.wheel = new Wheel(); // for instantiating our default wheel, when we first 'new' up a Car
   *
   *    Entity.apply(this, arguments);
   *  }
   *
   *  util.inherits(Car, Entity);
   *
   *  Entity.mergeProperty(Car, 'wheels', function (obj) {
   *    this.wheel = new Wheel(); // for instantiating our wheel from saved values in a database
   *  });
   */
  static mergeProperty(type, name, fn) {
    if (!mergeProperties.has(type.name))
      mergeProperties.set(type.name, new Map());
    mergeProperties.get(type.name).set(name, fn);
  }
}
