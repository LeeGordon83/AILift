import { describe, expect, test } from '@jest/globals';
import { initApp } from '../../public/app.js';

function setupDom() {
  document.body.innerHTML = `
    <div id="floor-controls"></div>
    <div id="cabin-controls"></div>
    <div id="elevator-car"></div>
    <button id="game-toggle" type="button">Start Game</button>
    <span id="mode"></span>
    <span id="level"></span>
    <span id="score"></span>
    <span id="time-left"></span>
    <span id="waiting-count"></span>
    <span id="in-lift-count"></span>
    <p id="game-objective"></p>
    <p id="lift-manifest"></p>
    <p id="game-feedback"></p>
    <span id="current-floor"></span>
    <span id="state"></span>
    <span id="direction"></span>
    <span id="queue-count"></span>
  `;
}

describe('DOM interactions', () => {
  test('floor button click enqueues a request', async () => {
    setupDom();
    initApp(document, { waitMs: 5, moveMs: 1 });

    const floorButton = document.querySelector('button[data-floor="2"][data-direction="up"]');
    floorButton.click();

    expect(document.getElementById('state').textContent).toBe('moving');
    expect(document.getElementById('direction').textContent).toBe('up');
    expect(floorButton.classList.contains('is-active')).toBe(true);
  });

  test('cabin button click enqueues internal request', async () => {
    setupDom();
    initApp(document, { waitMs: 5, moveMs: 1 });

    const cabinButton = document.querySelector('button[data-target-floor="4"]');
    cabinButton.click();

    expect(document.getElementById('state').textContent).toBe('moving');
    expect(document.getElementById('direction').textContent).toBe('up');
  });

  test('start game switches cabin controls to 10 floors', () => {
    setupDom();
    initApp(document, { waitMs: 5, moveMs: 1 });

    expect(document.querySelectorAll('#cabin-controls button')).toHaveLength(4);

    document.getElementById('game-toggle').click();

    expect(document.querySelectorAll('#cabin-controls button')).toHaveLength(10);
  });

  test('game mode cabin click queues a stop', () => {
    setupDom();
    initApp(document, { waitMs: 5, moveMs: 1 });

    document.getElementById('game-toggle').click();

    const targetButton = document.querySelector('#cabin-controls button[data-target-floor="9"]');
    targetButton.click();

    expect(targetButton.classList.contains('is-active')).toBe(true);
  });
});
