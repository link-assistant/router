import { createRequire } from 'node:module';
import { dirname,resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(join(sourceRoot,'packages/javascript/package.json'));
let compiler,latest;
export function ownershipSyntax(source) {
  if(latest?.source===source)return latest.syntax;
  compiler??=require('typescript');
  const file=compiler.createSourceFile('module-ownership.mjs',source,compiler.ScriptTarget.Latest,true,compiler.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw new Error('invalid module ownership syntax');
  const syntax={ts:compiler,file};latest={source,syntax};return syntax;
}
