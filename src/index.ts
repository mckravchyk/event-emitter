import { deleteAll } from './lib/map';
import { generateId } from './lib/string';

export type EventName = string | number | symbol;

// any is more flexible than unknown in untyped mode
export type ListenerParameters = any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

// It's not Record<EventName, Parameters> because then the index signature would be broader than the
// generic input, making it impossible to pass interfaces that lack a string | number | symbol
// signature.
export type Events<
  Keys extends EventName = EventName,
  Parameters extends ListenerParameters = ListenerParameters
> = {
  [Key in Keys]: Parameters
}

// eslint-disable-next-line max-len
export interface EmitterEvent<
  // For the same reason as in `Events`, `keyof E` is passed to the Events generic rather than
  // EventName, so the index signature depends on the generic.
  E extends Events<keyof E, ListenerParameters> = Events,
  Name extends keyof E = keyof E
> {
  name: Name
  source: EventEmitter<E>
}

// eslint-disable-next-line max-len
export type Listener<E extends Events<keyof E, ListenerParameters> = Events, Name extends keyof E = keyof E> = (
  this: EventEmitter<E>,
  event: EmitterEvent<E, Name>,
  ...params: E[Name]
) => void;

type ListenerId = `lst_${string}`;

type ListenerProperties = {
  id_: ListenerId
  type_: 'on' | 'once'
  callback_: Listener
};

export type unsubscribeFn = () => void;

export class EventEmitter<E extends Events<keyof E, ListenerParameters> = Events> { // eslint-disable-line max-len
  private listeners_: Map<EventName, Map<ListenerId, ListenerProperties>> = new Map();

  private globalListeners_: Map<ListenerId, ListenerProperties> = new Map();

  public emit<T extends keyof E>(eventName: T, ...parameters: E[T]): void {
    const event: EmitterEvent = {
      name: eventName,
      source: this as EventEmitter,
    };

    if (this.globalListeners_.size > 0) {
      this.callListeners_(this.globalListeners_, event as EmitterEvent, parameters);
    }

    const listeners = this.listeners_.get(eventName);

    if (typeof listeners !== 'undefined' && listeners.size > 0) {
      this.callListeners_(listeners, event as EmitterEvent, parameters);
    }
  }

  public once<T extends keyof E>(
    eventName: T,
    listener: Listener<E, T>,
  ): unsubscribeFn {
    // onces are not supported in global callbacks - can't picture a use case
    return this.addListener_('once', listener as Listener, eventName);
  }

  /* eslint-disable no-dupe-class-members, lines-between-class-members */
  public on<T extends keyof E>(eventName: T, listener: Listener<E, T>): unsubscribeFn;
  public on(listener: Listener<E, keyof E>): unsubscribeFn;
  public on<T extends keyof E>(
    listenerOrEventName?: Listener<E, keyof E> | T,
    listener?: Listener<E, T>,
  ): unsubscribeFn {
    if (typeof listenerOrEventName !== 'function') {
      return this.addListener_('on', listener as Listener, listenerOrEventName);
    }
    return this.addListener_('on', listenerOrEventName as Listener);
  }
  /* eslint-enable no-dupe-class-members, lines-between-class-members */

  /**
   * Removes all listeners which essentially resets it to the initial state - ready to be garbage
   * collected.
   */
  public removeAllListeners(): void {
    for (const listenerId of Array.from(this.listeners_.keys())) {
      deleteAll(this.listeners_.get(listenerId)!);
      this.listeners_.delete(listenerId);
    }

    deleteAll(this.globalListeners_);

    this.globalListeners_ = new Map();
    this.listeners_ = new Map();
  }

  private addListener_(type: 'on' | 'once', listener: Listener, eventName?: EventName): unsubscribeFn {
    const id: ListenerId = `lst_${generateId(21)}`;

    if (typeof eventName === 'undefined') {
      this.globalListeners_.set(id, { id_: id, type_: type, callback_: listener });
    }
    else {
      let listeners = this.listeners_.get(eventName);

      if (typeof listeners === 'undefined') {
        listeners = new Map();
        this.listeners_.set(eventName, listeners);
      }

      listeners.set(id, { id_: id, type_: type, callback_: listener });
    }

    return () => { this.removeListener_(id, eventName); };
  }

  private removeListener_(id: ListenerId, eventName?: EventName): void {
    const listeners = typeof eventName !== 'undefined' ? this.listeners_.get(eventName) : this.globalListeners_;

    if (typeof listeners !== 'undefined' && listeners.has(id)) {
      listeners.delete(id);
    }
  }

  private callListeners_(
    listeners: Map<ListenerId, ListenerProperties>,
    event: EmitterEvent,
    params: ListenerParameters,
  ): void {
    for (const listenerId of Array.from(listeners.keys())) {
      const listener = listeners.get(listenerId);

      // Expecting that it could have gotten removed by another listener (externally, not onces),
      // this is why keys are iterated and not values.
      if (!listener) {
        continue;
      }

      if (listener.type_ === 'once') {
        listeners.delete(listenerId);
      }

      listener.callback_.call(this as EventEmitter, event, ...params);
    }
  }
}
