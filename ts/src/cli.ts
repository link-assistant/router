// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=bf9375110604a9d9b4fc0ee4242c3c1c52f3acbef6d0f8c9ef747005a9e647e7; dynamic any annotations are explicit draft gaps.
import { pathToFileURL } from 'node:url';
import { renderNativeHuman } from "./cli-output.js";
import { NativeRouter, catalog, operationResult } from "./operations.js";
export function parseNativeArguments(argv?: any): any {
    const remaining: any = [...argv], global: any = {};
    for (let index: any = 0; index < remaining.length; index++) {
        if ((remaining as any)[index] === '--')
            break;
        if ((remaining as any)[index] === '--json') {
            global.json = true;
            remaining.splice(index--, 1);
            continue;
        }
        if (((remaining as any)[index].startsWith as any)('--config=')) {
            global.configPath = ((remaining as any)[index].slice as any)(9);
            if (!global.configPath)
                throw new (Error as any)('--config requires a file');
            remaining.splice(index--, 1);
            continue;
        }
        if ((remaining as any)[index] === '--config') {
            if (!(remaining as any)[index + 1])
                throw new (Error as any)('--config requires a file');
            global.configPath = (remaining as any)[index + 1];
            remaining.splice(index, 2);
            index--;
        }
    }
    const prefix: any = [], rootFlags: any = new (Map as any)((((catalog.operations.find as any)((operation?: any): boolean => operation.name === 'version').options.filter as any)((option?: any): any => option.flag).map as any)((option?: any): any => [option.flag, option]));
    while ((remaining as any)[0]?.startsWith('--')) {
        const arg: any = remaining.shift(), equal: any = (arg.indexOf as any)('='), flag: any = (arg.slice as any)(2, equal < 0 ? undefined : equal), option: any = rootFlags.get(flag);
        if (!option)
            throw new (Error as any)(`Unknown global flag: --${flag}`);
        prefix.push(arg);
        if (!option.boolean && equal < 0) {
            const value: any = remaining.shift();
            if (value === undefined || (value.startsWith as any)('--'))
                throw new (Error as any)(`--${flag} requires a value`);
            prefix.push(value);
        }
    }
    const operation: any = [...catalog.operations].sort((a?: any, b?: any): number => b.command.length - a.command.length)
        .find((operation?: any): any => (operation.command.every as any)((word?: any, index?: any): boolean => (remaining as any)[index] === word));
    if (!operation)
        throw new (Error as any)(`Unknown native command: ${remaining.slice(0, 3).join(' ')}`);
    const options: any = {}, positionals: any = [], args: any = [...prefix, ...remaining.slice(operation.command.length)];
    const flags: any = new (Map as any)(((operation.options.filter as any)((option?: any): any => option.flag).map as any)((option?: any): any => [option.flag, option]));
    for (let index: any = 0; index < args.length; index++) {
        const arg: any = (args as any)[index];
        if (arg === '--') {
            positionals.push(...args.slice(index + 1));
            break;
        }
        if (!(arg.startsWith as any)('--')) {
            positionals.push(arg);
            continue;
        }
        const equal: any = (arg.indexOf as any)('='), flag: any = (arg.slice as any)(2, equal < 0 ? undefined : equal);
        const option: any = flags.get(flag);
        if (!option)
            throw new (Error as any)(`Unknown ${operation.name} flag: --${flag}`);
        if (option.secret && !((operation.name.startsWith as any)('logs.') && option.name === 'token'))
            throw new (Error as any)(`--${flag} is secret; use the catalog environment variable or stdin transport`);
        let value: any;
        if (option.boolean) {
            if (equal < 0)
                (value as any) = true;
            else if (['true', 'false'].includes((arg.slice as any)(equal + 1)))
                (value as any) = (arg.slice as any)(equal + 1) === 'true';
            else
                throw new (Error as any)(`--${flag} requires true or false`);
        }
        else {
            (value as any) = equal < 0 ? (args as any)[++index] : (arg.slice as any)(equal + 1);
            if (value === undefined || ((value as any).startsWith as any)('--'))
                throw new (Error as any)(`--${flag} requires a value`);
        }
        if (!option.multiple && (Object as any).hasOwn(options, option.name))
            throw new (Error as any)(`Duplicate --${flag}`);
        if (option.multiple)
            (((options as any)[option.name] ??= []).push as any)(value);
        else
            (options as any)[option.name] = value;
    }
    for (const option of (operation.options.filter as any)((option?: any): any => option.positional) as any) {
        if (option.multiple)
            (options as any)[option.name] = positionals.splice(0);
        else if (positionals.length)
            (options as any)[option.name] = positionals.shift();
    }
    if (positionals.length)
        throw new (Error as any)(`Unexpected positional arguments for ${operation.name}`);
    return { name: operation.name, options, global };
}
export async function runNativeCli(argv?: any, { stdout = (process as any).stdout, stderr = (process as any).stderr, stdin = (process as any).stdin, env = (process as any).env, router }: any = {}): Promise<any> {
    let result: any, json: any = ((argv.slice as any)(0, (argv.indexOf as any)('--') < 0 ? argv.length : (argv.indexOf as any)('--')).includes as any)('--json');
    try {
        const parsed: any = parseNativeArguments(argv);
        (json as any) = parsed.global.json ?? false;
        (router as any) ??= new (NativeRouter as any)({ ...parsed.global, env });
        let input: any = '';
        if (parsed.options.api_key_stdin || parsed.options.token_stdin) {
            for await (const chunk of stdin as any) {
                (input as any) += chunk;
                if ((Buffer as any).byteLength(input) > 1048576)
                    throw new (Error as any)('stdin exceeds 1 MiB limit');
            }
        }
        (result as any) = await ((router as any).execute as any)(parsed.name, parsed.options, { stdin: input, ...(!json ? { onProgress: (line?: any): boolean => stdout.write(line + '\n') } : {}) });
    }
    catch (error: any) {
        (result as any) = operationResult('cli-error', { output: [] }, [error.message], 2);
    }
    if (json)
        stdout.write((JSON as any).stringify(result) + '\n');
    else {
        const output: any = renderNativeHuman(result);
        if (output)
            stdout.write(output + '\n');
        for (const diagnostic of (result as any).diagnostics as any)
            stderr.write(`error: ${diagnostic}\n`);
    }
    return (result as any).exit_code;
}
if (((process as any).argv as any)[1] && import.meta.url === pathToFileURL(((process as any).argv as any)[1]).href) {
    (process as any).exitCode = await runNativeCli((process as any).argv.slice(2));
}
