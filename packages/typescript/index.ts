// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=89e4ac74eedb512350c7eef1d7dc040ae1a65cc5afd63caeabb312c6b2736f02; dynamic any annotations are explicit draft gaps.
import { spawn } from 'node:child_process';
import { readFileSync, constants } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, chmod, copyFile, lstat, access } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { dirname, join, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import Ajv2020 from 'ajv/dist/2020.js';
const root: any = dirname(fileURLToPath(import.meta.url));
export const catalog: any = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8') as any);
export const version: any = catalog.version;
export const operationNames: any = Object.freeze(catalog.operations.map((operation?: any): any => operation.name));
const validators: any = new (Map as any)();
const ajv: any = new (Ajv2020 as any)({ strict: true, allowUnionTypes: true, validateFormats: false });
const camel: any = (value?: any): any => value.replace(/[-_]([a-z])/g, (_?: any, letter?: any): any => letter.toUpperCase());
export class RouterError extends Error {
    declare name: any;
    constructor(message: any, { code = 'operation', exitCode = null, stderr = '', result = null, cause }: any = {}) {
        super(message, { cause });
        this.name = 'RouterError';
        Object.assign(this, { code, exitCode, stderr, result });
    }
}
function terminate(child?: any): any {
    if (child.pid && process.platform !== 'win32') {
        try {
            process.kill(-child.pid, 'SIGKILL');
        }
        catch { }
    }
    else
        child.kill('SIGKILL');
}
export function runProcess(binary?: any, args?: any, { env = {}, stdin, deadlineMs = 60000, signal, cwd, maxOutputBytes = 8388608 }: any = {}): any {
    if (!Number.isFinite(deadlineMs) || deadlineMs <= 0)
        throw new (RouterError as any)('deadlineMs must be positive', { code: 'options' });
    return new (Promise as any)((resolve?: any, reject?: any): any => {
        if (signal?.aborted) {
            reject(new (RouterError as any)('Operation cancelled', { code: 'cancelled' }));
            return;
        }
        const child: any = spawn(binary, args, { env: { ...process.env, ...env }, cwd, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout: any = '', stderr: any = '', bytes: any = 0, failure: any;
        const decoders: any = { stdout: new (StringDecoder as any)('utf8'), stderr: new (StringDecoder as any)('utf8') };
        const fail: any = (error?: any): any => { failure ??= error; terminate(child); };
        const collect: any = (name?: any): any => (chunk?: any): any => {
            bytes += chunk.length;
            if (bytes > maxOutputBytes) {
                fail(new (RouterError as any)('Router output exceeds limit', { code: 'output-limit' }));
                return;
            }
            if (name === 'stdout')
                stdout += decoders.stdout.write(chunk);
            else
                stderr += decoders.stderr.write(chunk);
        };
        child.stdout.on('data', collect('stdout'));
        child.stderr.on('data', collect('stderr'));
        const timer: any = setTimeout((): any => fail(new (RouterError as any)('Router deadline exceeded', { code: 'deadline' })), deadlineMs);
        const abort: any = (): any => fail(new (RouterError as any)('Operation cancelled', { code: 'cancelled' }));
        signal?.addEventListener('abort', abort, { once: true });
        child.on('error', (error?: any): any => { failure ??= new (RouterError as any)(`Cannot execute ${binary}`, { code: 'spawn', cause: error }); });
        child.on('close', (exitCode?: any): any => {
            stdout += decoders.stdout.end();
            stderr += decoders.stderr.end();
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            terminate(child);
            if (failure) {
                failure.exitCode = exitCode;
                failure.stderr = stderr;
                reject(failure);
            }
            else
                resolve({ stdout, stderr, exitCode });
        });
        child.stdin.on('error', (error?: any): any => { if (error.code !== 'EPIPE')
            fail(error); });
        child.stdin.end(stdin ?? '');
    });
}
function schemaFor(operation?: any): any {
    if (!validators.has(operation.name)) {
        const filename: any = operation.name.replaceAll('.', '-') + '.v1.json';
        const schema: any = JSON.parse(readFileSync(join(root, 'schemas', filename), 'utf8') as any);
        validators.set(operation.name, ajv.compile(schema));
    }
    return validators.get(operation.name);
}
export function validateOperation(name?: any, result?: any): any {
    const operation: any = catalog.operations.find((operation?: any): any => operation.name === name);
    if (!operation || !schemaFor(operation)(result))
        throw new (RouterError as any)(`Invalid ${name} response`, { code: 'schema', result });
    return result;
}
function argumentsFor(operation?: any, options?: any): any {
    const allowed: any = new (Map as any)(operation.options.map((option?: any): any => [camel(option.name), option]));
    const flags: any = [], positional: any = [];
    for (const [name, value] of Object.entries(options) as any) {
        if (value === undefined || value === null)
            continue;
        const option: any = allowed.get(camel(name));
        if (!option)
            throw new (RouterError as any)(`Unknown ${operation.name} option: ${name}`, { code: 'options' });
        if (option.secret)
            throw new (RouterError as any)(`${name} is secret; use env or stdin transport`, { code: 'secret-argv' });
        const values: any = Array.isArray(value) ? value : [value];
        if (option.positional) {
            positional.push([operation.options.indexOf(option), values]);
            continue;
        }
        if (!option.flag)
            throw new (RouterError as any)(`No CLI flag for ${name}`, { code: 'options' });
        if (option.boolean) {
            if (typeof value !== 'boolean')
                throw new (RouterError as any)(`${name} must be boolean`, { code: 'options' });
            if (option.boolean_value)
                flags.push(`--${option.flag}=${value}`);
            else if (value)
                flags.push('--' + option.flag);
        }
        else
            for (const item of values as any)
                flags.push('--' + option.flag, String(item));
    }
    positional.sort((a?: any, b?: any): any => (a as any)[0] - (b as any)[0]);
    const args: any = [...operation.command, '--json', ...flags];
    for (const [, values] of positional as any)
        args.push(...values.map(String));
    return args;
}
export async function resolveBinary({ binary = process.env.ROUTER_BIN, allowDownload = true, allowVersionMismatch = false, env = {}, deadlineMs = 60000, cacheDir = join(homedir(), '.cache', 'link-assistant-router') }: any = {}): Promise<any> {
    let candidate: any = binary ?? env.ROUTER_BIN ?? 'router';
    if (!candidate.includes('/') && !candidate.includes('\\')) {
        for (const directory of (env.PATH ?? process.env.PATH ?? '').split(delimiter) as any) {
            const location: any = resolve(directory, candidate);
            try {
                await access(location, constants.X_OK);
                candidate = location;
                break;
            }
            catch { }
        }
    }
    else
        candidate = resolve(candidate);
    let response: any;
    try {
        response = await runProcess(candidate, ['version', '--json'], { env, deadlineMs });
    }
    catch (error: any) {
        if (binary || env.ROUTER_BIN || !allowDownload || error.code !== 'spawn' || error.cause?.code !== 'ENOENT')
            throw error;
        candidate = await downloadBinary({ cacheDir, deadlineMs });
        response = await runProcess(candidate, ['version', '--json'], { env, deadlineMs });
    }
    let result: any;
    try {
        result = JSON.parse(response.stdout as any);
    }
    catch (cause: any) {
        throw new (RouterError as any)('Binary does not implement the version JSON contract', { code: 'version', stderr: response.stderr, cause });
    }
    const operation: any = catalog.operations.find((operation?: any): any => operation.name === 'version');
    if (!schemaFor(operation)(result))
        throw new (RouterError as any)('Invalid binary version contract', { code: 'schema', stderr: response.stderr, result });
    if (response.exitCode !== 0 || !result.success)
        throw new (RouterError as any)('Binary version probe failed', { code: 'version', exitCode: response.exitCode, stderr: response.stderr, result });
    if (!allowVersionMismatch && result.data.version !== version)
        throw new (RouterError as any)(`Package ${version} cannot use binary ${result.data.version}; opt in with allowVersionMismatch`, { code: 'version', result });
    return candidate;
}
async function downloadBinary({ cacheDir, deadlineMs }: any): Promise<any> {
    const platform: any = process.platform === 'darwin' ? 'darwin' : process.platform === 'linux' ? 'linux' : null;
    const arch: any = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'amd64' : null;
    if (!platform || !arch)
        throw new (RouterError as any)('No verified binary asset for this platform; set ROUTER_BIN', { code: 'platform' });
    const destination: any = join(cacheDir, version, `${platform}-${arch}`, 'router');
    try {
        const receipt: any = JSON.parse(await readFile(destination + '.verified.json', 'utf8') as any);
        const digest: any = createHash('sha256').update(await readFile(destination)).digest('hex');
        if (receipt.version === version && receipt.sha256 === digest)
            return destination;
    }
    catch { }
    await mkdir(dirname(destination), { recursive: true });
    const work: any = await mkdtemp(join(tmpdir(), 'router-download-'));
    try {
        const asset: any = `link-assistant-router-${version}-${platform}-${arch}.tar.gz`;
        const checksum: any = asset.replace('.tar.gz', '.sha256');
        const base: any = `https://github.com/link-assistant/router/releases/download/v${version}/`;
        for (const name of [asset, checksum] as any) {
            const response: any = await fetch(base + name, { signal: AbortSignal.timeout(deadlineMs) });
            if (!response.ok)
                throw new (RouterError as any)(`Download failed: ${response.status} ${name}`, { code: 'download' });
            const chunks: any = [];
            let total: any = 0;
            for await (const chunk of response.body as any) {
                total += chunk.length;
                if (total > 150000000)
                    throw new (RouterError as any)('Release download exceeds size limit', { code: 'download' });
                chunks.push(chunk);
            }
            const bytes: any = Buffer.concat(chunks);
            await writeFile(join(work, name), bytes);
        }
        const lines: any = (await readFile(join(work, checksum), 'utf8')).split('\n');
        const entry: any = lines.map((line?: any): any => line.trim().split(/\s+/)).find(([, name]: any): any => name?.replace(/^\*/, '') === asset);
        const digest: any = createHash('sha256').update(await readFile(join(work, asset))).digest('hex');
        if (!entry || (entry as any)[0] !== digest)
            throw new (RouterError as any)('Release checksum mismatch', { code: 'checksum' });
        const verification: any = await runProcess('gh', ['attestation', 'verify', join(work, asset), '--repo', 'link-assistant/router', '--source-ref', `refs/tags/v${version}`], { deadlineMs });
        if (verification.exitCode !== 0)
            throw new (RouterError as any)('Release attestation verification failed', { code: 'attestation', stderr: verification.stderr, exitCode: verification.exitCode });
        const extraction: any = await runProcess('tar', ['-xzf', join(work, asset), '-C', work, './router'], { deadlineMs });
        if (extraction.exitCode !== 0)
            throw new (RouterError as any)('Binary extraction failed', { code: 'download', stderr: extraction.stderr });
        if (!(await lstat(join(work, 'router'))).isFile())
            throw new (RouterError as any)('Release binary must be a regular file', { code: 'download' });
        const stagingDirectory: any = await mkdtemp(join(dirname(destination), 'staging-'));
        const staged: any = join(stagingDirectory, 'router');
        await copyFile(join(work, 'router'), staged);
        await chmod(staged, 0o755);
        await rename(staged, destination);
        await rm(stagingDirectory, { recursive: true, force: true });
        const receipt: any = { version, sha256: createHash('sha256').update(await readFile(destination)).digest('hex') };
        await writeFile(destination + '.verified.json', JSON.stringify(receipt), { mode: 0o600 });
        return destination;
    }
    finally {
        await rm(work, { recursive: true, force: true });
    }
}
export class Router {
    declare binaryPromise: any;
    declare deploy: any;
    declare deployStatus: any;
    declare logs: any;
    declare options: any;
    declare with: any;
    constructor(options: any = {}) {
        this.options = options;
        this.binaryPromise = null;
        for (const operation of catalog.operations as any) {
            let namespace: any = this;
            const names: any = operation.name.split('.').map(camel);
            for (const name of names.slice(0, -1) as any)
                namespace = (namespace as any)[name] ??= {};
            (namespace as any)[names.at(-1)] = (options: any = {}, invocation: any = {}): any => this.invoke(operation.name, options, invocation);
        }
        this.deployStatus = (options: any = {}, invocation: any = {}): any => this.deploy({ ...options, status: true }, invocation);
        this.logs = Object.assign((options: any = {}, invocation: any = {}): any => this.invoke('logs.show', options, invocation), this.logs);
        const launch: any = this.with;
        this.with = (client?: any, args?: any, options: any = {}, invocation: any = {}): any => typeof client === 'string'
            ? launch({ ...options, client, clientArgs: args }, invocation) : launch(client, args);
    }
    async invoke(name?: any, options: any = {}, invocation: any = {}): Promise<any> {
        const operation: any = catalog.operations.find((operation?: any): any => operation.name === name);
        if (!operation)
            throw new (RouterError as any)(`Unknown operation ${name}`, { code: 'options' });
        const args: any = argumentsFor(operation, options);
        const settings: any = { ...this.options, ...invocation, env: { ...this.options.env, ...invocation.env } };
        this.binaryPromise ??= resolveBinary(settings);
        const binary: any = await this.binaryPromise;
        const response: any = await runProcess(binary, args, settings);
        let result: any;
        try {
            result = JSON.parse(response.stdout as any);
        }
        catch (cause: any) {
            throw new (RouterError as any)(`Invalid JSON from ${name}`, { code: 'schema', ...response, cause });
        }
        if (result?.operation === 'cli-error') {
            if (!schemaFor({ name: 'cli-error' })(result))
                throw new (RouterError as any)('Invalid CLI error response', { code: 'schema', exitCode: response.exitCode, stderr: response.stderr, result });
            throw new (RouterError as any)(result.diagnostics.join('; ') || 'CLI arguments rejected', { exitCode: response.exitCode, stderr: [response.stderr, ...result.diagnostics].join('\n'), result });
        }
        if (!schemaFor(operation)(result))
            throw new (RouterError as any)(`Invalid ${name} response: ${ajv.errorsText(schemaFor(operation).errors)}`, { code: 'schema', exitCode: response.exitCode, stderr: response.stderr, result });
        if (result.exit_code !== response.exitCode)
            throw new (RouterError as any)('Exit status disagrees with the result contract', { code: 'schema', exitCode: response.exitCode, stderr: response.stderr, result });
        if (!result.success)
            throw new (RouterError as any)(result.diagnostics.join('; ') || `${name} failed`, { exitCode: response.exitCode, stderr: [response.stderr, ...result.diagnostics].join('\n'), result });
        return result;
    }
}
export const createRouter: any = (options?: any): any => new (Router as any)(options);
export { NativeRouter, NativeRouterError, createNativeRouter } from "./native/operations.js";
