# Project Build Prompt (AI Working Spec)

Use this file as the single source of truth for what to build.
When you ask me to start, say: **“Build from prompt.md”**.

---

## 1) Product Summary

### LIFTMASTER
- Interactive elevator simulation focused on event-driven request handling and queue processing.

### The objective of the Elevator app is to simulate the operation of an elevator and more importantly, how to handle the events generated when the buildings occupants use it.
- Model how floor call buttons and in-cabin panel buttons generate events that are queued and processed in order.

### Problem statement
- We need a clear, testable simulation of elevator behavior (calls, movement, waits, and idle behavior) to practice event handlers, state transitions, and FIFO queue logic.

### Target users
- Learners and developers practicing JavaScript/TypeScript event-driven UI logic.
- Users who want to visualize elevator request processing in a simple 4-floor building.

---

## 2) Scope

### In scope (must build)
- 4-floor building cross-section with one elevator shaft and one elevator car.
- Floor call buttons: floor 1 (Up), floors 2-3 (Up/Down), floor 4 (Down).
- Elevator control panel with floor buttons 1-4.
- Visual lift animation between floors (smooth vertical movement in shaft).
- Clickable floor call buttons and clickable in-cabin floor buttons.
- Request queue processed in click order (FIFO).
- Elevator movement animation/state updates between floors.
- 5-second dwell at a stop to allow interior floor selection.
- Idle behavior: return elevator to floor 1 when no pending requests.
- Single shared handler for all floor call buttons.
- Single shared handler for all elevator panel buttons.
- Docker containerization for local run and consistent environment.

### Out of scope (do not build yet)
- Multi-elevator dispatch logic.
- Occupant simulation/spawn timing.
- Audio alerts/chimes.
- Capacity/overload warnings.
- Authentication, user accounts, or persistence across sessions.

### MVP definition (smallest useful version)
- A Node.js app that runs locally (directly and via Docker), serves a browser UI, and simulates a single elevator with clickable controls, visible lift animation, FIFO request handling, and idle return behavior.

---

## 3) User Stories

Format each story like this:

```text
US-01
As a <type of user>
I want <capability>
So that <benefit>

Acceptance Criteria:
- Given ... When ... Then ...
- Given ... When ... Then ...

Priority: High | Medium | Low
```

### Stories
- US-01:
	- As a building occupant
	- I want to press Up/Down on my floor
	- So that the elevator is called to me.
	- Acceptance Criteria:
		- Given floor call buttons are visible, when I click one, then the request is added to the queue.
		- Given multiple floor calls, when they are queued, then they are serviced in FIFO order.
	- Priority: High
- US-02:
	- As an elevator passenger
	- I want to choose a destination floor from the cabin panel
	- So that the elevator takes me where I need to go.
	- Acceptance Criteria:
		- Given the elevator stops at a floor, when I click a cabin floor button within 5 seconds, then that destination is queued.
		- Given a queued destination, when it is next in queue, then the elevator travels to that floor.
	- Priority: High
- US-03:
	- As a user watching the simulation
	- I want to see realistic idle behavior
	- So that the system behaves predictably when demand is low.
	- Acceptance Criteria:
		- Given no pending requests, when the queue is empty, then the elevator returns to floor 1.
		- Given no new inputs, when the elevator is at floor 1, then it remains idle.
	- Priority: Medium

---

## 4) Functional Requirements

List concrete system behaviors.

- FR-01: System shall maintain a FIFO queue of elevator requests from floor buttons and cabin buttons.
- FR-02: System shall move the elevator one floor at a time toward the active request and update direction/state.
- FR-03: System shall pause for 5 seconds at each serviced stop before processing the next queued request.
- FR-04: System shall route to floor 1 when queue becomes empty.
- FR-05: System shall use a single event handler for all floor call buttons and one single event handler for all cabin panel buttons.
- FR-06: System shall expose npm scripts to start the app and run tests locally.
- FR-07: System shall render a visible animated elevator car movement in the browser UI when changing floors.
- FR-08: System shall include a Dockerfile to build and run the application in a container.
- FR-09: System shall expose a container port and support `docker build` and `docker run` commands documented in README.

---

## 5) Non-Functional Requirements

- NFR-01 Performance: UI input response under 100ms for button press feedback; queue updates without visible lag.
- NFR-02 Security: No sensitive data collected; sanitize any dynamic text rendered to DOM.
- NFR-03 Accessibility: Buttons must be keyboard accessible with visible focus states and ARIA labels.
- NFR-04 Reliability: Queue processing must be deterministic and resilient to rapid repeated clicks.
- NFR-05 Observability/logging: Provide optional debug log of queue state transitions and elevator position changes.
- NFR-06 Tooling: Project must use ES modules (`"type": "module"`) and include both Vitest and Jest test runners.
- NFR-07 Portability: App must run consistently in local Node.js and Docker container environments.

---

## 6) UX / UI Requirements

### Screens/views
- Single-page layout with building diagram and adjacent elevator control panel.
- Visual indicators for current floor, elevator direction, and pending request count.

### Design constraints
- Keep interface minimal and instructional (simulation-first).
- Only show valid call buttons per floor (Up/Down placement by floor).

### Content/copy notes
- Clear labels: Floor 1-4, Up, Down, Queue, Idle/Moving/Waiting.
- Show short status text when elevator is waiting ("Waiting 5s for selection").

---

## 7) Data Model

### Entities
- Elevator
- Request
- Floor

### Fields per entity
- Elevator: currentFloor (1-4), direction (up|down|idle), state (moving|waiting|idle), doorOpen (boolean)
- Request: id, sourceFloor, direction (up|down|internal), targetFloor (optional), createdAt, status (queued|processing|done)
- Floor: floorNumber, hasUpButton, hasDownButton

### Validation rules
- Floor numbers must be integers in range 1-4.
- Ignore duplicate immediate requests for same floor+direction while already queued.
- Cabin target floor must be 1-4 and different from current floor for movement request.

### Sample data (optional)
- Elevator: { currentFloor: 1, direction: "idle", state: "idle", doorOpen: false }
- Queue: []

---

## 8) API / Integrations

### Internal APIs to build
- `enqueueFloorCall(floorNumber, direction)`
- `enqueueCabinSelection(targetFloor)`
- `processNextRequest()`
- `moveOneFloor()`
- `setElevatorState(state)`

### External services
- None required for MVP.

### Auth requirements
- None for MVP.

---

## 9) Tech Stack & Constraints

### Required stack
- Frontend: Vanilla HTML/CSS/JavaScript browser UI with elevator animation
- Backend: Node.js app runtime used to serve static frontend assets
- Database: None required for MVP
- Hosting/runtime: Node.js local server + browser, plus Docker container runtime

### Constraints
- Language/version: Node.js 20+ and JavaScript ES modules
- Libraries to use: Vitest for unit tests, Jest for additional integration/DOM-focused tests
- Libraries to avoid: Heavy state-management libraries for MVP
- Folder/file conventions: `src/` for logic, `styles/` for CSS, `tests/` for unit tests if added
- Container constraints: Multi-stage Docker build preferred; use a minimal Node.js base image; app listens on configurable `PORT`.

---

## 10) Definition of Done

- [ ] All High priority stories implemented
- [ ] Acceptance criteria pass
- [ ] Basic error handling implemented
- [ ] README updated with run steps
- [ ] Tests for critical paths
- [ ] `npm run dev` (or `npm start`) launches the app locally with working UI
- [ ] Both `vitest` and `jest` are configured and runnable via npm scripts
- [ ] `docker build` succeeds and produces a runnable image
- [ ] `docker run` starts the app and UI is reachable from mapped host port
- [ ] README includes Docker build/run commands

---

## 11) Delivery Plan (optional)

### Phase 1
- Set up Node.js ES module project structure and local server.
- Build UI skeleton with 4 floors, elevator car animation, and button controls.
- Implement shared button handlers and FIFO request queue.
- Implement movement, stop, and 5-second wait behavior.
- Add Dockerfile and verify containerized app startup.

### Phase 2
- Add duplicate-request guards and clearer state indicators.
- Add Vitest unit tests for queue ordering and idle return behavior.
- Add Jest integration/DOM tests for key button interaction flows.
- Add optional docker-compose file for simplified local container run.

### Phase 3
- Optional bonus features: sound, occupancy simulation, capacity warnings.

---

## 12) Open Questions / Assumptions

- Q1: Assumption: FIFO processing is strict by click order, without route optimization.
- Q2: Assumption: If a request is made for current floor while doors are open, it is treated as immediately satisfied.

---

## 13) Build Instructions for AI (important)

When generating implementation:

1. Build MVP first.
2. If requirements conflict, prioritize: Acceptance Criteria > Functional Requirements > User Stories.
3. Keep implementation minimal; no extra features outside scope.
4. Ask clarifying questions only when blocked by missing critical detail.
5. After implementation, summarize:
	- what was built,
	- what was deferred,
	- and any assumptions made.

---

## 14) Kickoff Command

After filling this file, tell me:

**“Read prompt.md and implement Phase 1.”**

