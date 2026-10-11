import {readFileSync} from 'node:fs';
import {hostData,HostChecker,HOST_CONTRACTS} from './extensions/host-contracts.mjs';
import {typeScriptAliases,typeScriptType} from './type-layout.mjs';
export function hostRuntimeAssets() {
  const checker=new HostChecker('Rust',[]),program=checker.program({language:'Rust',items:hostData(),main:null});
  const types=program.declarations,aliases=typeScriptAliases(types);
  const files=new Map();
  for(const file of ['json-runtime.mjs','json-values.mjs','json-parser.mjs','json-numbers.mjs','time-runtime.mjs','vector-runtime.mjs'])files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));
  files.set('vector-runtime.d.mts',`type RustOption<T> = Readonly<{ $: 'None' }> | Readonly<{ $: 'Some'; field0: T }>;
export declare function createVectorRuntime(validate: (value: unknown) => true): Readonly<{
  rust_vec_get<T>(value: readonly T[], index: bigint): RustOption<T>;
  rust_vec_first<T>(value: readonly T[]): RustOption<T>;
  rust_vec_last<T>(value: readonly T[]): RustOption<T>;
}>;
`);
  files.set('type-layout-runtime.mjs',readFileSync(new URL('./type-layout-runtime.mjs',import.meta.url),'utf8'));
  files.set('json-values.d.mts','export declare function validateJsonNumber(value: unknown): unknown;\nexport declare function validateJsonMap(value: unknown): unknown;\n');
  files.set('type-layout-runtime.d.mts','export declare function validateRustValue(value: unknown, type: unknown, schema: unknown, options?: unknown): true;\n');
  for(const family of ['json','time']) {
    const declarations=HOST_CONTRACTS.filter(contract=>contract.family===family).map(contract=>`export declare function ${contract.jsExport}(${contract.params.map((type,index)=>`arg${index}: ${typeScriptType(checker.hostType(type,[],{start:0,end:0}),types)}`).join(', ')}): ${typeScriptType(checker.hostType(contract.ret,[],{start:0,end:0}),types)};`).join('\n');
    files.set(family+'-runtime.d.mts',aliases+'\n'+declarations+'\n');
  }
  for(const file of ['json-NOTICE.md','json-LICENSE-MIT.txt','time-NOTICE.md']) {
    try{files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
  return files;
}
