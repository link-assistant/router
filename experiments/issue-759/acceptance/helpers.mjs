import { mkdtemp, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

export const repository = resolve(process.env.ROUTER_ACCEPTANCE_ROOT ?? fileURLToPath(new URL('../../../', import.meta.url)));
export const load = path => import(pathToFileURL(join(repository, path)).href);
export async function temporary(t) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'router-759-acceptance-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
export async function upstream(t, handler) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const observed = { method: request.method, path: request.url, headers: request.headers, body: Buffer.concat(chunks) };
    requests.push(observed);
    try { await handler(observed, response); }
    catch (error) { response.destroy(error); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { origin: `http://127.0.0.1:${server.address().port}`, requests };
}
