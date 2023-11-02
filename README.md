# event-emitter

A typed event emitter for Node.js and the browser with a simple to use unsubscribe mechanism.

```bash
npm install @mckravchyk/event-emitter --save
```

## Example

```ts
import { EventEmitter } from '@mckravchyk/event-emitter';

interface Events {
  resize: [width: number, height: number]
}

const emitter = new EventEmitter<Events>();

const off = emitter.on('resize', (e, width, height) => { console.log(`Resize ${width} x ${height}`); });

emitter.emit('resize', 100, 200);
emitter.emit('resize', 200, 100);

off(); // Remove the listener
```
