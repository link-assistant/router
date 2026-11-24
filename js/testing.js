/** Reusable, isolated fixtures for downstream contract tests. */
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Router, RouterError, runProcess, validateOperation } from './index.js';

export async function temporaryHome() {
  const home = await mkdtemp(join(tmpdir(), 'router-home-'));
  const env = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_DATA_HOME: join(home, '.local/share'), XDG_CACHE_HOME: join(home, '.cache'), CODEX_HOME: join(home, '.codex'), CLAUDE_CONFIG_DIR: join(home, '.claude'), DATA_DIR: join(home, 'router-data') };
  return { home, env, close: () => rm(home, { recursive: true, force: true }) };
}

/** Loopback upstream with finite request bodies and recorded, secret-free requests. */
export async function mockUpstream(handler = request => ({ status: 200, body: request.path.endsWith('/models') ? { object: 'list', data: [{ id: 'fixture-model', object: 'model', owned_by: 'fixture' }] } : { id: 'fixture-completion', object: 'chat.completion', model: 'fixture-model', choices: [{ index: 0, message: { role: 'assistant', content: 'fixture answer' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } } })) {
  const requests = [];
  const server = createServer(async (request, response) => {
    try {
      let bytes = 0, body = '';
      for await (const chunk of request) { bytes += chunk.length; if (bytes > 1_048_576) { response.writeHead(413).end(); return; } body += chunk; }
      const record = { method: request.method, path: request.url, body: body ? JSON.parse(body) : null };
      requests.push(record);
      const result = await handler(record);
      response.writeHead(result.status ?? 200, { 'content-type': 'application/json', ...result.headers });
      response.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    } catch { response.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((resolve, reject) => { server.closeAllConnections?.(); server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()); }) };
}

/** A vendor executable that never contacts a paid service. */
export async function vendorStub({ name = 'codex', version = '0.158.0', output = 'fixture answer', exitCode = 0 } = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new RouterError('Invalid stub executable name', { code: 'options' });
  const directory = await mkdtemp(join(tmpdir(), 'router-vendor-'));
  const binary = join(directory, name);
  const source = `#!/usr/bin/env node\nif(process.argv.includes('--version')){console.log(${JSON.stringify(version)});process.exit(0)}console.log(${JSON.stringify(output)});process.exit(${Number(exitCode)});\n`;
  await writeFile(binary, source, { mode: 0o755 });
  return { binary, directory, env: { PATH: `${directory}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}` }, close: () => rm(directory, { recursive: true, force: true }) };
}

/** Run the authoritative native verifier or the disposable Linux boundary. */
export async function verifyContracts({ router = new Router(), areas = [], linux = false, repository = process.cwd(), output, clientVersions = 'installed', deadlineMs = 3_600_000, requireParity = false, env = {} } = {}) {
  const args = areas.flatMap(area => ['--area', area]);
  if (requireParity) args.push('--require-parity');
  if (!linux) {
    if (output) args.push('--output', resolve(output));
    return (await router.verify({ arguments: args }, { deadlineMs, cwd: repository, env })).data;
  }
  const response = await runProcess('bash', [join(repository, 'scripts/verify-contracts-in-linux.sh'), '--client-versions', clientVersions, ...args], { env, deadlineMs, cwd: repository });
  const path = join(repository, 'target/verification-linux/result.json');
  let result;
  try { result = JSON.parse(await readFile(path, 'utf8')); } catch (cause) { throw new RouterError('Linux verification produced no result.json', { code: 'schema', stderr: response.stderr, exitCode: response.exitCode, cause }); }
  validateOperation('verify', { schema: 'link-assistant-router/verify/v1', operation: 'verify', success: response.exitCode === 0, exit_code: response.exitCode, data: result, diagnostics: [] });
  if (response.exitCode !== 0) throw new RouterError('Linux verification failed', { exitCode: response.exitCode, stderr: response.stderr, result });
  return result;
}
