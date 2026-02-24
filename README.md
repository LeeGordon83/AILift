# LIFTMASTER

Node.js + Hapi elevator simulation app with a visual front end, FIFO queue processing, and Docker support.

## Requirements

- Node.js 20+
- npm 10+
- Docker (optional, for container run)

## Local setup

```bash
npm install
```

## Run the app

```bash
npm run dev
```

Or:

```bash
npm start
```

Open http://localhost:3000

## Run tests

Run all tests:

```bash
npm test
```

Run Vitest only:

```bash
npm run test:unit
```

Run Jest only:

```bash
npm run test:jest
```

## Docker

Build image:

```bash
docker build -t ailift:latest .
```

Run container:

```bash
docker run --rm -p 3000:3000 -e PORT=3000 ailift:latest
```

Open http://localhost:3000

## Docker Compose (dev, no rebuild for code changes)

Start in development mode with bind mounts:

```bash
docker compose up
```

Stop:

```bash
docker compose down
```

Notes:

- Code changes on your host are reflected immediately in the container.
- Rebuild (`docker build ...`) is only needed when Dockerfile or dependency layers change.
