// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=0b025abd90a61552ecd170cb8a6a2f7bb54bab349a3079e62605c856aaf0bcd8; dynamic any annotations are explicit draft gaps.
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Router, RouterError, runProcess, validateOperation } from "./index.js";
export async function temporaryHome(): Promise<any> {
    const home: any = await mkdtemp(join(tmpdir(), 'router-home-'));
    const env: any = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_DATA_HOME: join(home, '.local/share'), XDG_CACHE_HOME: join(home, '.cache'), CODEX_HOME: join(home, '.codex'), CLAUDE_CONFIG_DIR: join(home, '.claude'), DATA_DIR: join(home, 'router-data') };
    return { home, env, close: (): any => rm(home, { recursive: true, force: true }) };
}
export async function mockUpstream(handler: any = (request?: any): any => ({ status: 200, body: request.path.endsWith('/models') ? { object: 'list', data: [{ id: 'fixture-model', object: 'model', owned_by: 'fixture' }] } : { id: 'fixture-completion', object: 'chat.completion', model: 'fixture-model', choices: [{ index: 0, message: { role: 'assistant', content: 'fixture answer' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } } })): Promise<any> {
    const requests: any = [];
    const server: any = createServer(async (request?: any, response?: any): Promise<any> => {
        try {
            let bytes: any = 0, body: any = '';
            for await (const chunk of request as any) {
                bytes += chunk.length;
                if (bytes > 1048576) {
                    response.writeHead(413).end();
                    return;
                }
                body += chunk;
            }
            const record: any = { method: request.method, path: request.url, body: body ? JSON.parse(body as any) : null };
            requests.push(record);
            const result: any = await handler(record);
            response.writeHead(result.status ?? 200, { 'content-type': 'application/json', ...result.headers });
            response.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
        }
        catch {
            response.writeHead(500).end();
        }
    });
    await new (Promise as any)((resolve?: any): any => server.listen(0, '127.0.0.1', resolve));
    return { origin: `http://127.0.0.1:${server.address().port}`, requests, close: (): any => new (Promise as any)((resolve?: any, reject?: any): any => { server.closeAllConnections?.(); server.close((error?: any): any => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()); }) };
}
export async function vendorStub({ name = 'codex', version = '0.158.0', output = 'fixture answer', exitCode = 0 }: any = {}): Promise<any> {
    if (!/^[a-z][a-z0-9-]*$/.test(name))
        throw new (RouterError as any)('Invalid stub executable name', { code: 'options' });
    const directory: any = await mkdtemp(join(tmpdir(), 'router-vendor-'));
    const binary: any = join(directory, name);
    const source: any = `#!/usr/bin/env node\nif(process.argv.includes('--version')){console.log(${JSON.stringify(version)});process.exit(0)}console.log(${JSON.stringify(output)});process.exit(${Number(exitCode)});\n`;
    await writeFile(binary, source, { mode: 0o755 });
    return { binary, directory, env: { PATH: `${directory}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}` }, close: (): any => rm(directory, { recursive: true, force: true }) };
}
export async function verifyContracts({ router = new (Router as any)(), areas = [], linux = false, repository = process.cwd(), output, clientVersions = 'installed', deadlineMs = 3600000, requireParity = false, env = {} }: any = {}): Promise<any> {
    const args: any = areas.flatMap((area?: any): any => ['--area', area]);
    if (requireParity)
        args.push('--require-parity');
    if (!linux) {
        if (output)
            args.push('--output', resolve(output));
        return (await router.verify({ arguments: args }, { deadlineMs, cwd: repository, env })).data;
    }
    const response: any = await runProcess('bash', [join(repository, 'scripts/verify-contracts-in-linux.sh'), '--client-versions', clientVersions, ...args], { env, deadlineMs, cwd: repository });
    const path: any = join(repository, 'target/verification-linux/result.json');
    let result: any;
    try {
        result = JSON.parse(await readFile(path, 'utf8') as any);
    }
    catch (cause: any) {
        throw new (RouterError as any)('Linux verification produced no result.json', { code: 'schema', stderr: response.stderr, exitCode: response.exitCode, cause });
    }
    validateOperation('verify', { schema: 'link-assistant-router/verify/v1', operation: 'verify', success: response.exitCode === 0, exit_code: response.exitCode, data: result, diagnostics: [] });
    if (response.exitCode !== 0)
        throw new (RouterError as any)('Linux verification failed', { exitCode: response.exitCode, stderr: response.stderr, result });
    return result;
}
