import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export async function createServer() {
  const server = Hapi.server({
    port: Number(process.env.PORT || 3000),
    host: '0.0.0.0',
  });

  await server.register(Inert);

  server.route({
    method: 'GET',
    path: '/',
    handler: (_, h) => h.file(path.join(projectRoot, 'public', 'index.html')),
  });

  server.route({
    method: 'GET',
    path: '/src/{param*}',
    handler: {
      directory: {
        path: path.join(projectRoot, 'src'),
      },
    },
  });

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: path.join(projectRoot, 'public'),
        index: false,
      },
    },
  });

  return server;
}

export async function startServer() {
  const server = await createServer();
  await server.start();
  return server;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer()
    .then((server) => {
      console.log(`LIFTMASTER running on ${server.info.uri}`);
    })
    .catch((error) => {
      console.error('Failed to start server', error);
      process.exit(1);
    });
}
