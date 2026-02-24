import { describe, expect, it } from 'vitest';
import { ElevatorSystem } from '../../src/core/elevatorSystem.js';

describe('ElevatorSystem', () => {
  it('processes floor requests in FIFO order', async () => {
    const system = new ElevatorSystem({ waitMs: 1, moveMs: 1, autoProcess: false });

    system.enqueueFloorCall(3, 'up');
    system.enqueueFloorCall(2, 'down');

    await system.processNextRequest();
    const firstServicedFloor = system.currentFloor;
    await system.processNextRequest();
    const secondServicedFloor = system.currentFloor;

    expect([firstServicedFloor, secondServicedFloor]).toEqual([3, 2]);
  });

  it('returns to first floor when queue is empty', async () => {
    const system = new ElevatorSystem({ waitMs: 1, moveMs: 1, autoProcess: false });

    system.enqueueFloorCall(4, 'down');
    await system.processQueue();

    expect(system.currentFloor).toBe(1);
    expect(system.state).toBe('idle');
  });
});
