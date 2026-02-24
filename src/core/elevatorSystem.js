function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ElevatorSystem {
  constructor({ totalFloors = 4, waitMs = 5000, moveMs = 700, autoProcess = true } = {}) {
    this.totalFloors = totalFloors;
    this.waitMs = waitMs;
    this.moveMs = moveMs;
    this.autoProcess = autoProcess;

    this.currentFloor = 1;
    this.direction = 'idle';
    this.state = 'idle';
    this.doorOpen = false;
    this.queue = [];
    this.activeRequest = null;
    this.requestId = 0;
    this.isProcessing = false;

    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      currentFloor: this.currentFloor,
      direction: this.direction,
      state: this.state,
      doorOpen: this.doorOpen,
      queue: [...this.queue],
      activeRequest: this.activeRequest,
    };
  }

  notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  setElevatorState(state) {
    this.state = state;
    this.notify();
  }

  isValidFloor(floorNumber) {
    return Number.isInteger(floorNumber) && floorNumber >= 1 && floorNumber <= this.totalFloors;
  }

  hasDuplicateRequest(targetFloor, direction) {
    return this.queue.some(
      (request) => request.targetFloor === targetFloor && request.direction === direction && request.status === 'queued',
    );
  }

  enqueueFloorCall(floorNumber, direction) {
    if (!this.isValidFloor(floorNumber)) {
      return false;
    }

    if (this.hasDuplicateRequest(floorNumber, direction)) {
      return false;
    }

    this.queue.push({
      id: ++this.requestId,
      sourceFloor: floorNumber,
      targetFloor: floorNumber,
      direction,
      type: 'floor',
      createdAt: Date.now(),
      status: 'queued',
    });

    this.notify();
    if (this.autoProcess) {
      this.processQueue();
    }
    return true;
  }

  enqueueCabinSelection(targetFloor) {
    if (!this.isValidFloor(targetFloor)) {
      return false;
    }

    if (targetFloor === this.currentFloor && this.state === 'waiting') {
      return false;
    }

    if (this.hasDuplicateRequest(targetFloor, 'internal')) {
      return false;
    }

    this.queue.push({
      id: ++this.requestId,
      sourceFloor: this.currentFloor,
      targetFloor,
      direction: 'internal',
      type: 'cabin',
      createdAt: Date.now(),
      status: 'queued',
    });

    this.notify();
    if (this.autoProcess) {
      this.processQueue();
    }
    return true;
  }

  async moveOneFloor(stepDirection) {
    this.currentFloor += stepDirection;
    this.direction = stepDirection > 0 ? 'up' : 'down';
    this.setElevatorState('moving');
    await delay(this.moveMs);
  }

  async moveToFloor(targetFloor) {
    while (this.currentFloor !== targetFloor) {
      const stepDirection = targetFloor > this.currentFloor ? 1 : -1;
      await this.moveOneFloor(stepDirection);
    }
  }

  async processNextRequest() {
    const request = this.queue.shift();
    if (!request) {
      return false;
    }

    this.activeRequest = request;
    request.status = 'processing';
    this.notify();

    await this.moveToFloor(request.targetFloor);

    this.doorOpen = true;
    this.setElevatorState('waiting');
    await delay(this.waitMs);
    this.doorOpen = false;

    request.status = 'done';
    this.activeRequest = null;
    this.notify();
    return true;
  }

  async returnToFirstFloorIfIdle() {
    if (this.queue.length > 0 || this.currentFloor === 1) {
      return;
    }

    await this.moveToFloor(1);
    this.direction = 'idle';
    this.setElevatorState('idle');
  }

  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      await this.processNextRequest();
    }

    this.direction = 'idle';
    this.setElevatorState('idle');
    await this.returnToFirstFloorIfIdle();
    this.isProcessing = false;
  }

  async waitUntilIdle({ pollMs = 5, timeoutMs = 4000 } = {}) {
    const start = Date.now();

    while (this.isProcessing || this.queue.length > 0) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timed out waiting for elevator to become idle');
      }
      await delay(pollMs);
    }
  }
}
