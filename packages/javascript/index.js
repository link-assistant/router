/** Official CLI JSON transport. Operational decisions belong to the Rust library. */
import { spawn } from 'node:child_process';
import { readFileSync, constants } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, chmod, copyFile, lstat, access } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { dirname, join, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import Ajv2020 from 'ajv/dist/2020.js';

const root = dirname(fileURLToPath(import.meta.url));
export const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
export const version = catalog.version;
export const operationNames = Object.freeze(catalog.operations.map(operation => operation.name));
const validators = new Map();
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, validateFormats: false });
const camel = value => value.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

/** A transport, version, contract or Router operation failure with diagnostics. */
export class RouterError extends Error {
  constructor(message, { code = 'operation', exitCode = null, stderr = '', result = null, cause } = {}) {
    super(message, { cause });
    this.name = 'RouterError'; Object.assign(this, { code, exitCode, stderr, result });
  }
}

function terminate(child) {
  if (child.pid && process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already exited. */ }
  } else child.kill('SIGKILL');
}

/** Bounded process primitive; credentials enter through env/stdin only. */
export function runProcess(binary, args, { env = {}, stdin, deadlineMs = 60_000, signal, cwd, maxOutputBytes = 8_388_608 } = {}) {
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) throw new RouterError('deadlineMs must be positive', { code: 'options' });
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new RouterError('Operation cancelled', { code: 'cancelled' })); return; }
    const child = spawn(binary, args, { env: { ...process.env, ...env }, cwd, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', bytes = 0, failure;
    const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') };
    const fail = error => { failure ??= error; terminate(child); };
    const collect = name => chunk => {
      bytes += chunk.length;
      if (bytes > maxOutputBytes) { fail(new RouterError('Router output exceeds limit', { code: 'output-limit' })); return; }
      if (name === 'stdout') stdout += decoders.stdout.write(chunk); else stderr += decoders.stderr.write(chunk);
    };
    child.stdout.on('data', collect('stdout')); child.stderr.on('data', collect('stderr'));
    const timer = setTimeout(() => fail(new RouterError('Router deadline exceeded', { code: 'deadline' })), deadlineMs);
    const abort = () => fail(new RouterError('Operation cancelled', { code: 'cancelled' }));
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', error => { failure ??= new RouterError(`Cannot execute ${binary}`, { code: 'spawn', cause: error }); });
    child.on('close', exitCode => {
      stdout += decoders.stdout.end(); stderr += decoders.stderr.end();
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      // Clean up grandchildren which inherited pipes or survived their leader.
      terminate(child);
      if (failure) { failure.exitCode = exitCode; failure.stderr = stderr; reject(failure); }
      else resolve({ stdout, stderr, exitCode });
    });
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') fail(error); });
    child.stdin.end(stdin ?? '');
  });
}

function schemaFor(operation) {
  if (!validators.has(operation.name)) {
    const filename = operation.name.replaceAll('.', '-') + '.v1.json';
    const schema = JSON.parse(readFileSync(join(root, 'schemas', filename), 'utf8'));
    validators.set(operation.name, ajv.compile(schema));
  }
  return validators.get(operation.name);
}

/** Validate a complete result using the same offline contracts as Router. */
export function validateOperation(name, result) {
  const operation = catalog.operations.find(operation => operation.name === name);
  if (!operation || !schemaFor(operation)(result)) throw new RouterError(`Invalid ${name} response`, { code: 'schema', result });
  return result;
}

function argumentsFor(operation, options) {
  const allowed = new Map(operation.options.map(option => [camel(option.name), option]));
  const flags = [], positional = [];
  for (const [name, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    const option = allowed.get(camel(name));
    if (!option) throw new RouterError(`Unknown ${operation.name} option: ${name}`, { code: 'options' });
    if (option.secret) throw new RouterError(`${name} is secret; use env or stdin transport`, { code: 'secret-argv' });
    const values = Array.isArray(value) ? value : [value];
    if (option.positional) { positional.push([operation.options.indexOf(option), values]); continue; }
    if (!option.flag) throw new RouterError(`No CLI flag for ${name}`, { code: 'options' });
    if (option.boolean) {
      if (typeof value !== 'boolean') throw new RouterError(`${name} must be boolean`, { code: 'options' });
      if (option.boolean_value) flags.push(`--${option.flag}=${value}`);
      else if (value) flags.push('--' + option.flag);
    }
    else for (const item of values) flags.push('--' + option.flag, String(item));
  }
  positional.sort((a, b) => a[0] - b[0]);
  const args = [...operation.command, '--json', ...flags];
  // The launcher forwards everything after its client argument. Put Router
  // options first and preserve caller arguments, including vendor --json.
  for (const [, values] of positional) args.push(...values.map(String));
  return args;
}

/** Resolve/download exactly this package's binary, with fail-closed provenance. */
export async function resolveBinary({ binary = process.env.ROUTER_BIN, allowDownload = true, allowVersionMismatch = false, env = {}, deadlineMs = 60_000, cacheDir = join(homedir(), '.cache', 'link-assistant-router') } = {}) {
  let candidate = binary ?? env.ROUTER_BIN ?? 'router';
  // Preserve PATH resolution across subsequent per-call environment overrides.
  if (!candidate.includes('/') && !candidate.includes('\\')) {
    for (const directory of (env.PATH ?? process.env.PATH ?? '').split(delimiter)) {
      const location = resolve(directory, candidate);
      try { await access(location, constants.X_OK); candidate = location; break; } catch { /* Try the next PATH entry. */ }
    }
  } else candidate = resolve(candidate);
  let response;
  try { response = await runProcess(candidate, ['version', '--json'], { env, deadlineMs }); }
  catch (error) {
    if (binary || env.ROUTER_BIN || !allowDownload || error.code !== 'spawn' || error.cause?.code !== 'ENOENT') throw error;
    candidate = await downloadBinary({ cacheDir, deadlineMs });
    response = await runProcess(candidate, ['version', '--json'], { env, deadlineMs });
  }
  let result;
  try { result = JSON.parse(response.stdout); } catch (cause) { throw new RouterError('Binary does not implement the version JSON contract', { code: 'version', stderr: response.stderr, cause }); }
  const operation = catalog.operations.find(operation => operation.name === 'version');
  if (!schemaFor(operation)(result)) throw new RouterError('Invalid binary version contract', { code: 'schema', stderr: response.stderr, result });
  if (response.exitCode !== 0 || !result.success) throw new RouterError('Binary version probe failed', { code: 'version', exitCode: response.exitCode, stderr: response.stderr, result });
  if (!allowVersionMismatch && result.data.version !== version) throw new RouterError(`Package ${version} cannot use binary ${result.data.version}; opt in with allowVersionMismatch`, { code: 'version', result });
  return candidate;
}

async function downloadBinary({ cacheDir, deadlineMs }) {
  const platform = process.platform === 'darwin' ? 'darwin' : process.platform === 'linux' ? 'linux' : null;
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'amd64' : null;
  if (!platform || !arch) throw new RouterError('No verified binary asset for this platform; set ROUTER_BIN', { code: 'platform' });
  const destination = join(cacheDir, version, `${platform}-${arch}`, 'router');
  // A verified receipt protects cached content against replacement.
  try {
    const receipt = JSON.parse(await readFile(destination + '.verified.json', 'utf8'));
    const digest = createHash('sha256').update(await readFile(destination)).digest('hex');
    if (receipt.version === version && receipt.sha256 === digest) return destination;
  } catch { /* Re-download invalid/missing cache. */ }
  await mkdir(dirname(destination), { recursive: true });
  const work = await mkdtemp(join(tmpdir(), 'router-download-'));
  try {
    const asset = `link-assistant-router-${version}-${platform}-${arch}.tar.gz`;
    const checksum = asset.replace('.tar.gz', '.sha256');
    const base = `https://github.com/link-assistant/router/releases/download/v${version}/`;
    for (const name of [asset, checksum]) {
      const response = await fetch(base + name, { signal: AbortSignal.timeout(deadlineMs) });
      if (!response.ok) throw new RouterError(`Download failed: ${response.status} ${name}`, { code: 'download' });
      const chunks = []; let total = 0;
      for await (const chunk of response.body) {
        total += chunk.length;
        if (total > 150_000_000) throw new RouterError('Release download exceeds size limit', { code: 'download' });
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);
      await writeFile(join(work, name), bytes);
    }
    const lines = (await readFile(join(work, checksum), 'utf8')).split('\n');
    const entry = lines.map(line => line.trim().split(/\s+/)).find(([, name]) => name?.replace(/^\*/, '') === asset);
    const digest = createHash('sha256').update(await readFile(join(work, asset))).digest('hex');
    if (!entry || entry[0] !== digest) throw new RouterError('Release checksum mismatch', { code: 'checksum' });
    const verification = await runProcess('gh', ['attestation', 'verify', join(work, asset), '--repo', 'link-assistant/router', '--source-ref', `refs/tags/v${version}`], { deadlineMs });
    if (verification.exitCode !== 0) throw new RouterError('Release attestation verification failed', { code: 'attestation', stderr: verification.stderr, exitCode: verification.exitCode });
    // Extract only the named regular binary, never arbitrary archive paths.
    const extraction = await runProcess('tar', ['-xzf', join(work, asset), '-C', work, './router'], { deadlineMs });
    if (extraction.exitCode !== 0) throw new RouterError('Binary extraction failed', { code: 'download', stderr: extraction.stderr });
    if (!(await lstat(join(work, 'router'))).isFile()) throw new RouterError('Release binary must be a regular file', { code: 'download' });
    const stagingDirectory = await mkdtemp(join(dirname(destination), 'staging-'));
    const staged = join(stagingDirectory, 'router');
    await copyFile(join(work, 'router'), staged);
    await chmod(staged, 0o755);
    await rename(staged, destination);
    await rm(stagingDirectory, { recursive: true, force: true });
    const receipt = { version, sha256: createHash('sha256').update(await readFile(destination)).digest('hex') };
    await writeFile(destination + '.verified.json', JSON.stringify(receipt), { mode: 0o600 });
    return destination;
  } finally { await rm(work, { recursive: true, force: true }); }
}

/** Full operation namespace, generated from the Rust command catalog. */
export class Router {
  constructor(options = {}) {
    this.options = options; this.binaryPromise = null;
    for (const operation of catalog.operations) {
      let namespace = this;
      const names = operation.name.split('.').map(camel);
      for (const name of names.slice(0, -1)) namespace = namespace[name] ??= {};
      namespace[names.at(-1)] = (options = {}, invocation = {}) => this.invoke(operation.name, options, invocation);
    }
    this.deployStatus = (options = {}, invocation = {}) => this.deploy({ ...options, status: true }, invocation);
    this.logs = Object.assign((options = {}, invocation = {}) => this.invoke('logs.show', options, invocation), this.logs);
    const launch = this.with;
    this.with = (client, args, options = {}, invocation = {}) => typeof client === 'string'
      ? launch({ ...options, client, clientArgs: args }, invocation) : launch(client, args);
  }
  async invoke(name, options = {}, invocation = {}) {
    const operation = catalog.operations.find(operation => operation.name === name);
    if (!operation) throw new RouterError(`Unknown operation ${name}`, { code: 'options' });
    const args = argumentsFor(operation, options);
    const settings = { ...this.options, ...invocation, env: { ...this.options.env, ...invocation.env } };
    this.binaryPromise ??= resolveBinary(settings);
    const binary = await this.binaryPromise;
    const response = await runProcess(binary, args, settings);
    let result;
    try { result = JSON.parse(response.stdout); } catch (cause) { throw new RouterError(`Invalid JSON from ${name}`, { code: 'schema', ...response, cause }); }
    if (result?.operation === 'cli-error') {
      if (!schemaFor({ name: 'cli-error' })(result)) throw new RouterError('Invalid CLI error response', { code: 'schema', exitCode: response.exitCode, stderr: response.stderr, result });
      throw new RouterError(result.diagnostics.join('; ') || 'CLI arguments rejected', { exitCode: response.exitCode, stderr: [response.stderr, ...result.diagnostics].join('\n'), result });
    }
    if (!schemaFor(operation)(result)) throw new RouterError(`Invalid ${name} response: ${ajv.errorsText(schemaFor(operation).errors)}`, { code: 'schema', exitCode: response.exitCode, stderr: response.stderr, result });
    if (result.exit_code !== response.exitCode) throw new RouterError('Exit status disagrees with the result contract', { code: 'schema', exitCode: response.exitCode, stderr: response.stderr, result });
    if (!result.success) throw new RouterError(result.diagnostics.join('; ') || `${name} failed`, { exitCode: response.exitCode, stderr: [response.stderr, ...result.diagnostics].join('\n'), result });
    return result;
  }
}
export const createRouter = options => new Router(options);

// Native execution is explicitly opt-in; the existing Router transport is unchanged.
export { NativeRouter, NativeRouterError, createNativeRouter } from './native/operations.mjs';
