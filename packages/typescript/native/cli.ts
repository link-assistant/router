// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=61c8ab53d195cc3f434497188b7aa3b1a85e41a3dd1f4c61759063e112fdcf6c; dynamic any annotations are explicit draft gaps.
import { pathToFileURL } from 'node:url';
import { NativeRouter, catalog, operationResult } from "./operations.js";
export function parseNativeArguments(argv?: any): any {
    const remaining: any = [...argv], global: any = {};
    for (let index: any = 0; index < remaining.length; index++) {
        if ((remaining as any)[index] === '--json') {
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
    const operation: any = [...catalog.operations].sort((a?: any, b?: any): any => b.command.length - a.command.length)
        .find((operation?: any): any => operation.command.every((word?: any, index?: any): any => (remaining as any)[index] === word));
    if (!operation)
        throw new (Error as any)(`Unknown native command: ${remaining.slice(0, 3).join(' ')}`);
    const options: any = {}, positionals: any = [], args: any = remaining.slice(operation.command.length);
    const flags: any = new (Map as any)(operation.options.filter((option?: any): any => option.flag).map((option?: any): any => [option.flag, option]));
    for (let index: any = 0; index < args.length; index++) {
        const arg: any = (args as any)[index];
        if (arg === '--') {
            positionals.push(...args.slice(index + 1));
            break;
        }
        if (!arg.startsWith('--')) {
            positionals.push(arg);
            continue;
        }
        const equal: any = arg.indexOf('='), flag: any = arg.slice(2, equal < 0 ? undefined : equal);
        const option: any = flags.get(flag);
        if (!option)
            throw new (Error as any)(`Unknown ${operation.name} flag: --${flag}`);
        if (option.secret)
            throw new (Error as any)(`--${flag} is secret; use the catalog environment variable or stdin transport`);
        let value: any;
        if (option.boolean) {
            if (equal < 0)
                value = true;
            else if (['true', 'false'].includes(arg.slice(equal + 1)))
                value = arg.slice(equal + 1) === 'true';
            else
                throw new (Error as any)(`--${flag} requires true or false`);
        }
        else {
            value = equal < 0 ? (args as any)[++index] : arg.slice(equal + 1);
            if (value === undefined || value.startsWith('--'))
                throw new (Error as any)(`--${flag} requires a value`);
        }
        if (!option.multiple && Object.hasOwn(options, option.name))
            throw new (Error as any)(`Duplicate --${flag}`);
        if (option.multiple)
            ((options as any)[option.name] ??= []).push(value);
        else
            (options as any)[option.name] = value;
    }
    for (const option of operation.options.filter((option?: any): any => option.positional) as any) {
        if (option.multiple)
            (options as any)[option.name] = positionals.splice(0);
        else if (positionals.length)
            (options as any)[option.name] = positionals.shift();
    }
    if (positionals.length)
        throw new (Error as any)(`Unexpected positional arguments for ${operation.name}`);
    return { name: operation.name, options, global };
}
export async function runNativeCli(argv?: any, { stdout = process.stdout, stdin = process.stdin, env = process.env, router }: any = {}): Promise<any> {
    let result: any;
    try {
        const parsed: any = parseNativeArguments(argv);
        router ??= new (NativeRouter as any)({ ...parsed.global, env });
        let input: any = '';
        if (parsed.options.api_key_stdin || parsed.options.token_stdin) {
            for await (const chunk of stdin as any) {
                input += chunk;
                if (Buffer.byteLength(input) > 1048576)
                    throw new (Error as any)('stdin exceeds 1 MiB limit');
            }
        }
        result = await router.execute(parsed.name, parsed.options, { stdin: input });
    }
    catch (error: any) {
        result = operationResult('cli-error', { output: [] }, [error.message], 2);
    }
    stdout.write(JSON.stringify(result) + '\n');
    return result.exit_code;
}
if ((process.argv as any)[1] && import.meta.url === pathToFileURL((process.argv as any)[1]).href) {
    process.exitCode = await runNativeCli(process.argv.slice(2));
}
