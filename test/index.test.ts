import { EventEmitter, type EventName, type unsubscribeFn } from 'src';

describe('EventEmitter', () => {
  it('notifies a listener', () => {
    const emitter = new EventEmitter();

    let firedCount = 0;
    let name: EventName = '';

    const unsubscribe = emitter.on('testEvent', (e) => {
      firedCount += 1;
      name = e.name;
    });

    emitter.emit('testEvent');
    emitter.emit('testEvent');
    unsubscribe();
    emitter.emit('testEvent');

    expect(firedCount).toBe(2);
    expect(name).toBe('testEvent');
  });

  it('notifies multiple listeners on the same event', () => {
    type Events = {
      testEvent: [null, { value: number }];
    }

    const emitter = new EventEmitter<Events>();

    const values: string[] = [];

    const unsubscribe1 = emitter.on('testEvent', (e, _n, data) => { values.push(`${data.value}-1`); });
    const unsubscribe2 = emitter.on('testEvent', (e, _n, data) => { values.push(`${data.value}-2`); });

    emitter.emit('testEvent', null, { value: 1 });
    emitter.emit('testEvent', null, { value: 2 });
    unsubscribe1();
    emitter.emit('testEvent', null, { value: 3 });
    unsubscribe2();
    emitter.emit('testEvent', null, { value: 4 });

    expect(values).toEqual([
      '1-1', '1-2',
      '2-1', '2-2',
      '3-2',
    ]);
  });

  it('notifies a global listener', () => {
    interface Events {
      testEventA: [{ value: number }]
      testEventB: [{ value: number }]
    }

    const emitter = new EventEmitter<Events>();

    const values: string[] = [];

    const unsubscribe1 = emitter.on((e, data) => { values.push(`${data.value}-1`); });
    const unsubscribe2 = emitter.on((e, data) => { values.push(`${data.value}-2`); });

    emitter.emit('testEventA', { value: 1 });
    emitter.emit('testEventB', { value: 2 });
    unsubscribe1();
    emitter.emit('testEventA', { value: 3 });
    unsubscribe2();
    emitter.emit('testEventA', { value: 4 });

    expect(values).toEqual([
      '1-1', '1-2',
      '2-1', '2-2',
      '3-2',
    ]);
  });

  it('notifies multiple listeners on multiple events, processes global listeners first', () => {
    type Events = {
      testEventA: [value: number]
      testEventB: [value: number]
    }

    const emitter = new EventEmitter<Events>();

    const values: string[] = [];

    const unsubscribe1 = emitter.on('testEventA', (e, v) => { values.push(`${v}-1`); });
    const unsubscribe2 = emitter.on('testEventA', (e, v) => { values.push(`${v}-2`); });
    const unsubscribe3 = emitter.on('testEventB', (e, v) => { values.push(`${v}-3`); });
    const unsubscribe4 = emitter.on('testEventB', (e, v) => { values.push(`${v}-4`); });

    const unsubscribe5 = emitter.on((e, v) => { values.push(`${v}-g`); });

    emitter.emit('testEventA', 1);
    emitter.emit('testEventA', 2);
    emitter.emit('testEventB', 3);
    unsubscribe1();
    emitter.emit('testEventA', 4);
    emitter.emit('testEventB', 5);
    emitter.emit('testEventB', 6);
    unsubscribe2();
    unsubscribe3();
    emitter.emit('testEventA', 7);
    emitter.emit('testEventB', 8);
    unsubscribe4();
    emitter.emit('testEventB', 9);
    unsubscribe5();
    emitter.emit('testEventB', 10);

    expect(values).toEqual([
      '1-g', '1-1', '1-2',
      '2-g', '2-1', '2-2',
      '3-g', '3-3', '3-4',

      '4-g', '4-2',
      '5-g', '5-3', '5-4',
      '6-g', '6-3', '6-4',
      '7-g',
      '8-g', '8-4',
      '9-g',
    ]);
  });

  it('notifies a listener once', () => {
    const emitter = new EventEmitter();

    const values: string[] = [];

    const unsubscribe1 = emitter.once('testEvent', (e, data) => { values.push(`${data.v}-1`); });
    emitter.once('testEvent', (e, data) => { values.push(`${data.v}-2`); });
    emitter.once('testEvent', (e, data) => { values.push(`${data.v}-3`); });

    unsubscribe1();
    emitter.emit('testEvent', { v: 1 });
    emitter.emit('testEvent', { v: 2 });
    emitter.emit('testEvent', { v: 3 });

    expect(values).toEqual(['1-2', '1-3']);
  });

  it('registers one time listeners in a one time listener', () => {
    const emitter = new EventEmitter();

    const values: string[] = [];

    emitter.once('testEvent', (e, data) => {
      values.push(`${data.v}-1`);
      emitter.once('testEvent', (e2, data2) => { values.push(`${data2.v}-2`); });
    });

    emitter.emit('testEvent', { v: 1 });
    emitter.emit('testEvent', { v: 2 });
    emitter.emit('testEvent', { v: 3 });

    expect(values).toEqual(['1-1', '2-2']);
  });

  it('removes all listeners', () => {
    const emitter = new EventEmitter();

    let i = 0;
    let k = 0;

    emitter.on('test', () => { i += 1; });
    emitter.on('test', () => { i += 2; });

    emitter.emit('test');
    emitter.removeAllListeners();
    emitter.emit('test');

    // Also ensure that the emitter still works
    emitter.on('test', () => { k += 1; });
    emitter.on('test', () => { k += 2; });

    emitter.emit('test');
    emitter.removeAllListeners();

    expect(i).toBe(3);
    expect(k).toBe(3);
  });

  it('exposes its reference to the listener via the this keyword and an event parameter', () => {
    const emitter = new EventEmitter();

    let thisReference: EventEmitter | null = null;
    let eSourceReference: EventEmitter | null = null;

    emitter.once('testEvent', function (e) { // eslint-disable-line func-names
      thisReference = this; // eslint-disable-line @typescript-eslint/no-this-alias
      eSourceReference = e.source;
    });

    emitter.emit('testEvent');

    expect(thisReference).toBe(emitter);
    expect(eSourceReference).toBe(emitter);
  });

  it('does not notify a listener that has been added on the same event', () => {
    const emitter = new EventEmitter();

    const eventName = 'test';
    let i = 0;

    let unsubscribe2: unsubscribeFn | null = null;

    const unsubscribe1 = emitter.on(eventName, () => {
      i += 1;

      unsubscribe2 = emitter.on(eventName, () => {
        i += 1;
      });
    });

    emitter.emit(eventName);

    unsubscribe1();

    // Check that the subscription has been added properly while at it
    emitter.emit(eventName);

    if (typeof unsubscribe2 === 'function') {
      (unsubscribe2 as unsubscribeFn)();
    }

    // Expecting first subscription on first event and second subscription on the second event
    expect(i).toBe(2);
  });

  it('does not notify a listener that has been removed on the same event', () => {
    const emitter = new EventEmitter();

    const eventName = 'test';
    let i = 0;
    let unsubscribe2: unsubscribeFn | null = null;

    const unsubscribe1 = emitter.on(eventName, () => {
      i += 1;

      if (typeof unsubscribe2 === 'function') {
        unsubscribe2();
      }
    });

    unsubscribe2 = emitter.on(eventName, () => { i += 1; });
    emitter.emit(eventName);
    unsubscribe1();

    expect(i).toBe(1);
  });

  it('makes a distinction between the number and its numeric string counterpart in event names', () => {
    const emitter = new EventEmitter();

    const values: number[] = [];

    const unsubscribe1 = emitter.on('1', () => { values.push(0); });
    const unsubscribe2 = emitter.on(1, () => { values.push(1); });

    emitter.emit('1');
    emitter.emit(1);

    unsubscribe1();
    unsubscribe2();

    expect(values).toEqual([0, 1]);
  });

  it('allows symbols as event names', () => {
    const emitter = new EventEmitter();

    const sym = Symbol('test');

    let fired = false;

    const unsubscribe1 = emitter.on(sym, () => { fired = true; });
    emitter.emit(sym);
    unsubscribe1();
    expect(fired).toBe(true);
  });
});
