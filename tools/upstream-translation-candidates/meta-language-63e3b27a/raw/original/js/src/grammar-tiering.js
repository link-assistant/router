import v8 from 'node:v8';
import { Language } from 'web-tree-sitter';

// V8 recompiles a hot WebAssembly function with TurboFan in the background, and
// TurboFan's memory for one function grows with the function's size. The
// generated lexers of some grammars are single functions of 130 to 360 KB
// (PowerShell, Swift, Markdown and its inline grammar), and their tier-up took
// 0.5 to 2 GB each, which killed whole-suite runs after every parse had
// finished. A WebAssembly module takes V8's tiering budget when it is compiled,
// so grammar modules get a budget no parse exhausts and keep their code on the
// baseline compiler. The runtime and every other module keep the process's
// budget, which is restored after each grammar loads.

/** Tiering budget of grammar instances: no parse executes this much code. */
export const GRAMMAR_TIERING_BUDGET = 2 ** 31 - 1;

// V8's own default, unless the process was started with another budget.
const PROCESS_TIERING_BUDGET =
  process.execArgv
    .map((argument) => /^--wasm[-_]tiering[-_]budget=(\d+)$/u.exec(argument)?.[1])
    .findLast((budget) => budget !== undefined) ?? '13000000';

/**
 * Compiles and instantiates a tree-sitter grammar from its WebAssembly bytes,
 * after the runtime is initialized, with the grammar tiering budget.
 */
export function loadGrammarLanguage(binary) {
  v8.setFlagsFromString(`--wasm-tiering-budget=${GRAMMAR_TIERING_BUDGET}`);
  try {
    return Language.loadSync(new WebAssembly.Module(binary));
  } finally {
    v8.setFlagsFromString(`--wasm-tiering-budget=${PROCESS_TIERING_BUDGET}`);
  }
}
