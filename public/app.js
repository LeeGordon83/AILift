import { ElevatorSystem } from '../src/core/elevatorSystem.js';

const SIMULATION_FLOORS = 4;
const GAME_FLOORS = 10;
const SIMULATION_FLOOR_HEIGHT = 110;
const GAME_FLOOR_HEIGHT = 44;

function floorDisplayLabel(floorNumber) {
  if (floorNumber === 1) {
    return 'Ground';
  }
  return String(floorNumber - 1);
}

function createFloorControls(container, totalFloors, waitingByFloor, { interactiveCalls = true } = {}) {
  const rows = [];

  for (let floor = totalFloors; floor >= 1; floor -= 1) {
    const row = document.createElement('div');
    row.className = 'floor-row';

    const floorInfo = document.createElement('div');
    floorInfo.className = 'floor-info';

    const label = document.createElement('strong');
    label.textContent = floorDisplayLabel(floor);

    const waitingText = document.createElement('small');
    waitingText.className = 'waiting-display';
    waitingText.dataset.floor = String(floor);
    waitingText.textContent = '';

    const buttons = document.createElement('div');
    buttons.className = 'buttons';

    if (interactiveCalls && floor < totalFloors) {
      const upButton = document.createElement('button');
      upButton.type = 'button';
      upButton.dataset.floor = String(floor);
      upButton.dataset.direction = 'up';
      upButton.setAttribute('aria-label', `Call elevator up from ${floorDisplayLabel(floor)}`);
      upButton.textContent = 'Up';
      buttons.appendChild(upButton);
    }

    if (interactiveCalls && floor > 1) {
      const downButton = document.createElement('button');
      downButton.type = 'button';
      downButton.dataset.floor = String(floor);
      downButton.dataset.direction = 'down';
      downButton.setAttribute('aria-label', `Call elevator down from ${floorDisplayLabel(floor)}`);
      downButton.textContent = 'Down';
      buttons.appendChild(downButton);
    }

    floorInfo.append(label, waitingText);
    row.append(floorInfo, buttons);
    rows.push(row);
  }

  container.replaceChildren(...rows);
  updateWaitingDisplays(container, waitingByFloor);
}

function createCabinControls(container, totalFloors) {
  const buttons = [];
  const floorsTopToBottom = Array.from({ length: totalFloors }, (_, index) => totalFloors - index);

  for (const floor of floorsTopToBottom) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.targetFloor = String(floor);
    button.setAttribute('aria-label', `Go to ${floorDisplayLabel(floor)}`);
    button.textContent = floorDisplayLabel(floor);
    buttons.push(button);
  }

  container.replaceChildren(...buttons);
}

function getFloorHeight(totalFloors) {
  return totalFloors > SIMULATION_FLOORS ? GAME_FLOOR_HEIGHT : SIMULATION_FLOOR_HEIGHT;
}

function updateWaitingDisplays(floorControls, waitingByFloor) {
  floorControls.querySelectorAll('.waiting-display').forEach((element) => {
    const floor = Number(element.dataset.floor);
    const value = waitingByFloor?.get(floor);

    if (Array.isArray(value)) {
      if (value.length === 0) {
        element.textContent = '';
        return;
      }

      const preview = value
        .slice(0, 3)
        .map((group) => `${group.count} to ${floorDisplayLabel(group.destinationFloor)}`)
        .join(' | ');

      element.textContent = `👥 ${preview}`;
      return;
    }

    const count = Number(value || 0);
    element.textContent = count > 0 ? `👥 ${count} waiting` : '';
  });
}

function updateRequestLights(floorControls, cabinControls, snapshot) {
  floorControls.querySelectorAll('button[data-floor][data-direction]').forEach((button) => {
    button.classList.remove('is-active');
  });

  cabinControls.querySelectorAll('button[data-target-floor]').forEach((button) => {
    button.classList.remove('is-active');
  });

  const allRequests = [...snapshot.queue, snapshot.activeRequest].filter(Boolean);

  for (const request of allRequests) {
    if (request.type === 'floor') {
      const selector = `button[data-floor="${request.targetFloor}"][data-direction="${request.direction}"]`;
      const floorButton = floorControls.querySelector(selector);
      if (floorButton) {
        floorButton.classList.add('is-active');
      }
      continue;
    }

    const cabinButton = cabinControls.querySelector(`button[data-target-floor="${request.targetFloor}"]`);
    if (cabinButton) {
      cabinButton.classList.add('is-active');
    }
  }
}

function createGameState(totalFloors) {
  return {
    active: false,
    totalFloors,
    level: 1,
    score: 0,
    collected: 0,
    missed: 0,
    timeLeft: 90,
    waitingByFloor: new Map(Array.from({ length: totalFloors }, (_, index) => [index + 1, 0])),
    plannedStops: new Set(),
    spawnIntervalMs: 2200,
    speedFloorsPerSecond: 1.1,
    positionFloor: totalFloors,
    movementTimer: null,
    spawnTimer: null,
    gameTimer: null,
    eventLog: [],
  };
}

function totalWaiting(game) {
  let count = 0;
  game.waitingByFloor.forEach((value) => {
    count += value;
  });
  return count;
}

function totalInLift(game) {
  return game.plannedStops.size;
}

function formatLiftManifest(game) {
  if (!game.active) {
    return 'Current run: -';
  }

  if (game.plannedStops.size === 0) {
    return `Current run: ${floorDisplayLabel(Math.round(game.positionFloor))} ↓ Ground`;
  }

  const planned = [...game.plannedStops]
    .sort((a, b) => b - a)
    .map((floor) => floorDisplayLabel(floor))
    .join(', ');

  return `Current run: ${floorDisplayLabel(Math.round(game.positionFloor))} ↓ Ground | Stops: ${planned}`;
}

function pushGameEvent(game, message) {
  if (!message) {
    return;
  }

  game.eventLog.unshift(message);
  if (game.eventLog.length > 4) {
    game.eventLog.pop();
  }
}

function renderGameFeedback(game, feedbackEl) {
  if (!feedbackEl) {
    return;
  }

  if (!game.active) {
    feedbackEl.textContent = 'No events yet.';
    return;
  }

  if (game.eventLog.length === 0) {
    feedbackEl.textContent = 'Move the lift using cabin controls to start collecting passengers.';
    return;
  }

  feedbackEl.textContent = game.eventLog.join(' • ');
}

function updateGameStats(game, elements) {
  if (!elements.modeEl || !elements.levelEl || !elements.scoreEl || !elements.timeLeftEl) {
    return;
  }

  if (!game.active) {
    elements.modeEl.textContent = 'Simulation';
    elements.levelEl.textContent = '-';
    elements.scoreEl.textContent = '-';
    elements.timeLeftEl.textContent = '-';
    elements.waitingCountEl.textContent = '-';
    elements.inLiftCountEl.textContent = '-';
    if (elements.liftManifestEl) {
      elements.liftManifestEl.textContent = formatLiftManifest(game);
    }
    renderGameFeedback(game, elements.gameFeedbackEl);
    return;
  }

  elements.modeEl.textContent = 'Game';
  elements.levelEl.textContent = String(game.level);
  elements.scoreEl.textContent = String(game.score);
  elements.timeLeftEl.textContent = `${game.timeLeft}s`;
  elements.waitingCountEl.textContent = String(totalWaiting(game));
  elements.inLiftCountEl.textContent = String(totalInLift(game));
  if (elements.liftManifestEl) {
    elements.liftManifestEl.textContent = formatLiftManifest(game);
  }
  renderGameFeedback(game, elements.gameFeedbackEl);
}

function maybeLevelUp(game) {
  const targetLevel = Math.floor(game.collected / 8) + 1;
  if (targetLevel <= game.level) {
    return false;
  }

  game.level = targetLevel;
  game.spawnIntervalMs = Math.max(550, 2200 - (game.level - 1) * 170);
  game.speedFloorsPerSecond = Math.min(3.8, 1.1 + (game.level - 1) * 0.18);
  return true;
}

function spawnGroup(game) {
  if (!game.active) {
    return;
  }

  const sourceFloor = Math.floor(Math.random() * (game.totalFloors - 1)) + 2;
  const nextCount = Math.min(9, (game.waitingByFloor.get(sourceFloor) ?? 0) + (Math.floor(Math.random() * 3) + 1));
  game.waitingByFloor.set(sourceFloor, nextCount);
  pushGameEvent(game, `${floorDisplayLabel(sourceFloor)} now has ${nextCount} waiting`);
}

function setSpawnTimer(game, onTick) {
  if (game.spawnTimer) {
    clearInterval(game.spawnTimer);
  }

  game.spawnTimer = setInterval(() => {
    spawnGroup(game);
    onTick();
  }, game.spawnIntervalMs);
}

function clearGameTimers(game) {
  if (game.movementTimer) {
    clearTimeout(game.movementTimer);
    game.movementTimer = null;
  }
  if (game.spawnTimer) {
    clearInterval(game.spawnTimer);
    game.spawnTimer = null;
  }
  if (game.gameTimer) {
    clearInterval(game.gameTimer);
    game.gameTimer = null;
  }
}

function applyStopOutcome(game, floorNumber) {
  const waiting = game.waitingByFloor.get(floorNumber) ?? 0;
  const stopPlanned = game.plannedStops.has(floorNumber) || floorNumber === 1;

  if (floorNumber !== 1) {
    game.plannedStops.delete(floorNumber);
  }

  if (waiting === 0) {
    if (stopPlanned && floorNumber !== 1) {
      pushGameEvent(game, `Stopped at ${floorDisplayLabel(floorNumber)} but nobody was waiting`);
    }
    return;
  }

  if (!stopPlanned) {
    game.waitingByFloor.set(floorNumber, 0);
    game.missed += waiting;
    pushGameEvent(game, `Missed ${waiting} at ${floorDisplayLabel(floorNumber)}`);
    return;
  }

  game.waitingByFloor.set(floorNumber, 0);
  game.collected += waiting;
  game.score += waiting * 10;
  pushGameEvent(game, `Collected ${waiting} at ${floorDisplayLabel(floorNumber)} (+${waiting * 10})`);
}

function updatePlannedStopLights(cabinControls, game) {
  cabinControls.querySelectorAll('button[data-target-floor]').forEach((button) => {
    const floor = Number(button.dataset.targetFloor);
    button.classList.toggle('is-active', game.plannedStops.has(floor));
  });
}

function updatePlannedFloorHighlights(floorControls, game) {
  floorControls.querySelectorAll('.floor-row').forEach((row) => {
    const floorLabel = row.querySelector('.waiting-display')?.dataset?.floor;
    const floorNumber = Number(floorLabel);
    row.classList.toggle('is-targeted', game.active && game.plannedStops.has(floorNumber));
  });
}

function updateCarFromGame(elevatorCar, game, floorHeight, directionEl, stateEl, currentFloorEl) {
  const translateY = (game.positionFloor - 1) * floorHeight;
  elevatorCar.style.transform = `translateY(-${translateY}px)`;
  elevatorCar.style.transitionDuration = `${Math.max(140, Math.floor((1000 / game.speedFloorsPerSecond) * 0.85))}ms`;
  elevatorCar.classList.toggle('is-moving', game.active);

  if (directionEl) {
    directionEl.textContent = game.active ? 'down' : 'idle';
  }
  if (stateEl) {
    stateEl.textContent = game.active ? 'moving' : 'idle';
  }
  if (currentFloorEl) {
    currentFloorEl.textContent = floorDisplayLabel(Math.round(game.positionFloor));
  }
}

function scheduleNextGameStep(game, hooks) {
  if (!game.active) {
    return;
  }

  const stepMs = Math.max(180, Math.floor(1000 / game.speedFloorsPerSecond));
  game.movementTimer = setTimeout(() => {
    if (!game.active) {
      return;
    }

    const nextFloor = Math.max(1, Math.round(game.positionFloor) - 1);
    game.positionFloor = nextFloor;

    applyStopOutcome(game, nextFloor);
    const levelChanged = maybeLevelUp(game);
    if (levelChanged) {
      pushGameEvent(game, `Level up! Speed increased to level ${game.level}`);
      setSpawnTimer(game, hooks.onTick);
    }

    if (nextFloor === 1) {
      pushGameEvent(game, 'New run started from 10');
      game.positionFloor = game.totalFloors;
      game.plannedStops.clear();
    }

    hooks.onTick();
    scheduleNextGameStep(game, hooks);
  }, stepMs);
}

function resetFloorLayout(floorControls, totalFloors) {
  const floorHeight = getFloorHeight(totalFloors);
  floorControls.style.gridTemplateRows = `repeat(${totalFloors}, ${floorHeight}px)`;
  return floorHeight;
}

export function initApp(doc = document, options = {}) {
  const floorControls = doc.getElementById('floor-controls');
  const cabinControls = doc.getElementById('cabin-controls');
  const elevatorCar = doc.getElementById('elevator-car');
  const currentFloorEl = doc.getElementById('current-floor');
  const stateEl = doc.getElementById('state');
  const directionEl = doc.getElementById('direction');
  const queueCountEl = doc.getElementById('queue-count');
  const gameToggleButton = doc.getElementById('game-toggle');
  const modeEl = doc.getElementById('mode');
  const levelEl = doc.getElementById('level');
  const scoreEl = doc.getElementById('score');
  const timeLeftEl = doc.getElementById('time-left');
  const waitingCountEl = doc.getElementById('waiting-count');
  const inLiftCountEl = doc.getElementById('in-lift-count');
  const gameObjectiveEl = doc.getElementById('game-objective');
  const liftManifestEl = doc.getElementById('lift-manifest');
  const gameFeedbackEl = doc.getElementById('game-feedback');

  if (!floorControls || !cabinControls || !elevatorCar) {
    throw new Error('Missing required DOM elements to initialize app');
  }

  let floorHeight = SIMULATION_FLOOR_HEIGHT;
  let game = createGameState(GAME_FLOORS);
  let system = null;

  const statsElements = {
    modeEl,
    levelEl,
    scoreEl,
    timeLeftEl,
    waitingCountEl,
    inLiftCountEl,
    liftManifestEl,
    gameFeedbackEl,
  };

  function buildUi(totalFloors, waitingByFloor = null, interactiveCalls = true) {
    createFloorControls(floorControls, totalFloors, waitingByFloor, { interactiveCalls });
    createCabinControls(cabinControls, totalFloors);
    floorHeight = resetFloorLayout(floorControls, totalFloors);
  }

  function attachSystem(totalFloors, { waitMs, moveMs }) {
    system = new ElevatorSystem({ totalFloors, waitMs, moveMs });

    system.subscribe((snapshot) => {
      const translateY = (snapshot.currentFloor - 1) * floorHeight;
      elevatorCar.style.transform = `translateY(-${translateY}px)`;
      elevatorCar.classList.toggle('is-moving', snapshot.state === 'moving');

      if (currentFloorEl) {
        currentFloorEl.textContent = floorDisplayLabel(snapshot.currentFloor);
      }
      if (stateEl) {
        stateEl.textContent = snapshot.state;
      }
      if (directionEl) {
        directionEl.textContent = snapshot.direction;
      }
      if (queueCountEl) {
        queueCountEl.textContent = String(snapshot.queue.length);
      }

      updateRequestLights(floorControls, cabinControls, snapshot);
    });

    return system;
  }

  function stopGame() {
    clearGameTimers(game);
    game = createGameState(GAME_FLOORS);
    game.active = false;
    buildUi(SIMULATION_FLOORS, null, true);
    attachSystem(SIMULATION_FLOORS, {
      waitMs: options.waitMs ?? 5000,
      moveMs: options.moveMs ?? 700,
    });
    doc.body.classList.remove('game-active');

    if (gameToggleButton) {
      gameToggleButton.textContent = 'Start Game';
    }
    if (gameObjectiveEl) {
      gameObjectiveEl.textContent = 'Start Game to play: the lift drops from 10 to Ground automatically. Use cabin controls to schedule stops and collect waiting people.';
    }
    renderGameFeedback(game, gameFeedbackEl);
    updateGameStats(game, statsElements);
  }

  function startGame() {
    clearGameTimers(game);
    game = createGameState(GAME_FLOORS);
    game.active = true;

    buildUi(GAME_FLOORS, game.waitingByFloor, false);
    attachSystem(GAME_FLOORS, {
      waitMs: 250,
      moveMs: 220,
    });
    doc.body.classList.add('game-active');

    game.positionFloor = GAME_FLOORS;
    updateCarFromGame(elevatorCar, game, floorHeight, directionEl, stateEl, currentFloorEl);

    setSpawnTimer(game, () => {
      updateWaitingDisplays(floorControls, game.waitingByFloor);
      updateGameStats(game, statsElements);
    });

    scheduleNextGameStep(game, {
      onTick: () => {
        updateWaitingDisplays(floorControls, game.waitingByFloor);
        updatePlannedStopLights(cabinControls, game);
        updatePlannedFloorHighlights(floorControls, game);
        updateCarFromGame(elevatorCar, game, floorHeight, directionEl, stateEl, currentFloorEl);
        updateGameStats(game, statsElements);
      },
    });

    pushGameEvent(game, 'Game started. Schedule stops quickly while the lift descends.');

    game.gameTimer = setInterval(() => {
      game.timeLeft -= 1;
      if (game.timeLeft <= 0) {
        stopGame();
        return;
      }
      updateGameStats(game, statsElements);
    }, 1000);

    if (gameToggleButton) {
      gameToggleButton.textContent = 'Stop Game';
    }
    if (gameObjectiveEl) {
      gameObjectiveEl.textContent = 'The lift auto-descends from 10 to Ground. Click cabin floors before passing them to stop and collect waiting people.';
    }

    updateWaitingDisplays(floorControls, game.waitingByFloor);
    updatePlannedStopLights(cabinControls, game);
    updatePlannedFloorHighlights(floorControls, game);
    updateGameStats(game, statsElements);
  }

  buildUi(SIMULATION_FLOORS, null, true);
  attachSystem(SIMULATION_FLOORS, {
    waitMs: options.waitMs ?? 5000,
    moveMs: options.moveMs ?? 700,
  });
  updateGameStats(game, statsElements);

  floorControls.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-floor][data-direction]');
    if (!button) {
      return;
    }

    const floorNumber = Number(button.dataset.floor);
    const direction = button.dataset.direction;
    system.enqueueFloorCall(floorNumber, direction);
  });

  cabinControls.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-target-floor]');
    if (!button) {
      return;
    }

    const targetFloor = Number(button.dataset.targetFloor);
    if (game.active) {
      const currentRoundedFloor = Math.round(game.positionFloor);
      if (targetFloor <= currentRoundedFloor) {
        game.plannedStops.add(targetFloor);
        pushGameEvent(game, `Queued stop at ${floorDisplayLabel(targetFloor)}`);
      } else {
        pushGameEvent(game, `${floorDisplayLabel(targetFloor)} already passed this run`);
      }

      updatePlannedStopLights(cabinControls, game);
      updatePlannedFloorHighlights(floorControls, game);
      updateGameStats(game, statsElements);
      return;
    }

    system.enqueueCabinSelection(targetFloor);
  });

  gameToggleButton?.addEventListener('click', () => {
    if (game.active) {
      stopGame();
    } else {
      startGame();
    }
  });

  return system;
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('floor-controls') && document.getElementById('cabin-controls')) {
      initApp();
    }
  });
}
