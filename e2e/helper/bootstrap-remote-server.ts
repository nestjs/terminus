import { type Server } from 'http';
import * as express from 'express';
import * as portfinder from 'portfinder';

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export type DynamicRemoteServerFn = ThenArg<
  ReturnType<typeof bootstrapRemoteServer>
>;

export async function bootstrapRemoteServer(port?: number) {
  const app = express();
  let server: Server;

  if (!port) {
    port = await portfinder.getPortPromise({
      port: 3000,
      stopPort: 8888,
    });
  }

  function close() {
    server?.close?.();
  }
  function get(
    endpoint: string,
    handler: (req: express.Request, res: express.Response) => void,
  ) {
    app.get(endpoint, handler);

    return {
      start: async () => {
        if (!server) {
          server = app.listen(port, '0.0.0.0');
        }
      },
    };
  }

  return {
    get,
    close,
    url: `http://0.0.0.0:${port}`,
  };
}
