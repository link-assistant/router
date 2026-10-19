import { createRequire } from 'node:module';
import { dirname,resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(join(sourceRoot,'js/package.json'));
let compiler,latest;
// Loading the pinned compiler does not imply parsing a source under a dummy
// filename. Graph producers perform their own actual-path parse and guards.
export function ownershipCompiler() {
  compiler??=require('typescript');
  return compiler;
}
export function ownershipSyntax(source) {
  if(latest?.source===source)return latest.syntax;
  ownershipCompiler();
  const file=compiler.createSourceFile('module-ownership.mjs',source,compiler.ScriptTarget.Latest,true,compiler.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw new Error('invalid module ownership syntax');
  const syntax={ts:compiler,file};latest={source,syntax};return syntax;
}
