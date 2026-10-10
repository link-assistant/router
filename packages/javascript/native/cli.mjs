#!/usr/bin/env node
/** Standalone native CLI: structured contracts, never falls back to Rust. */
import { pathToFileURL } from 'node:url';
import { NativeRouter, catalog, operationResult } from './operations.mjs';

export function parseNativeArguments(argv) {
  const remaining = [...argv], global = {};
  for (let index = 0; index < remaining.length; index++) {
    if (remaining[index] === '--json') { remaining.splice(index--, 1); continue; }
    if (remaining[index] === '--config') {
      if (!remaining[index + 1]) throw new Error('--config requires a file');
      global.configPath = remaining[index + 1]; remaining.splice(index, 2); index--;
    }
  }
  const operation = [...catalog.operations].sort((a, b) => b.command.length - a.command.length)
    .find(operation => operation.command.every((word, index) => remaining[index] === word));
  if (!operation) throw new Error(`Unknown native command: ${remaining.slice(0, 3).join(' ')}`);
  const options = {}, positionals = [], args = remaining.slice(operation.command.length);
  const flags = new Map(operation.options.filter(option => option.flag).map(option => [option.flag, option]));
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--') { positionals.push(...args.slice(index + 1)); break; }
    if (!arg.startsWith('--')) { positionals.push(arg); continue; }
    const equal = arg.indexOf('='), flag = arg.slice(2, equal < 0 ? undefined : equal);
    const option = flags.get(flag);
    if (!option) throw new Error(`Unknown ${operation.name} flag: --${flag}`);
    if (option.secret) throw new Error(`--${flag} is secret; use the catalog environment variable or stdin transport`);
    let value;
    if (option.boolean) {
      if (equal < 0) value = true;
      else if (['true', 'false'].includes(arg.slice(equal + 1))) value = arg.slice(equal + 1) === 'true';
      else throw new Error(`--${flag} requires true or false`);
    } else {
      value = equal < 0 ? args[++index] : arg.slice(equal + 1);
      if (value === undefined || value.startsWith('--')) throw new Error(`--${flag} requires a value`);
    }
    if (!option.multiple && Object.hasOwn(options, option.name)) throw new Error(`Duplicate --${flag}`);
    if (option.multiple) (options[option.name] ??= []).push(value); else options[option.name] = value;
  }
  for (const option of operation.options.filter(option => option.positional)) {
    if (option.multiple) options[option.name] = positionals.splice(0);
    else if (positionals.length) options[option.name] = positionals.shift();
  }
  if (positionals.length) throw new Error(`Unexpected positional arguments for ${operation.name}`);
  return { name: operation.name, options, global };
}
export async function runNativeCli(argv, { stdout = process.stdout, stdin = process.stdin, env = process.env, router } = {}) {
  let result;
  try {
    const parsed = parseNativeArguments(argv);
    router ??= new NativeRouter({ ...parsed.global, env });
    let input = '';
    if (parsed.options.api_key_stdin || parsed.options.token_stdin) {
      for await (const chunk of stdin) {
        input += chunk;
        if (Buffer.byteLength(input) > 1_048_576) throw new Error('stdin exceeds 1 MiB limit');
      }
    }
    result = await router.execute(parsed.name, parsed.options, { stdin: input });
  } catch (error) {
    result = operationResult('cli-error', { output: [] }, [error.message], 2);
  }
  stdout.write(JSON.stringify(result) + '\n');
  return result.exit_code;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runNativeCli(process.argv.slice(2));
}
