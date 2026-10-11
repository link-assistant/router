import {readFileSync} from 'node:fs';
import {hostData,HostChecker,HOST_CONTRACTS} from './extensions/host-contracts.mjs';
import {typeScriptAliases,typeScriptType} from './type-layout.mjs';
export function hostRuntimeAssets() {
  const checker=new HostChecker('Rust',[]),program=checker.program({language:'Rust',items:hostData(),main:null});
  const types=program.declarations,aliases=typeScriptAliases(types);
  const files=new Map();
  files.set('string-bytes-runtime.mjs',readFileSync(new URL('./extensions/string-bytes-runtime.mjs',import.meta.url),'utf8'));
  files.set('string-bytes-runtime.d.mts','export declare function stringBytes(value: string): IterableIterator<bigint>;\n');
  files.set('reverse-string-runtime.mjs',readFileSync(new URL('./extensions/reverse-string-runtime.mjs',import.meta.url),'utf8'));
  files.set('reverse-string-runtime.d.mts',"type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\nexport declare function reverseFindCharacterSplit(value: string, delimiter: string, maps: ReadonlyArray<(value:string)=>string>, predicate:(value:string)=>boolean): RustOption<string>;\n");
  files.set('option-deref-runtime.mjs',readFileSync(new URL('./extensions/option-deref-runtime.mjs',import.meta.url),'utf8'));
  files.set('option-deref-runtime.d.mts',"type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\nexport declare function optionStringAsDeref(value: RustOption<string>): RustOption<string>;\n");
  files.set('result-iterator-runtime.mjs',readFileSync(new URL('./extensions/result-iterator-runtime.mjs',import.meta.url),'utf8'));
  files.set('result-iterator-runtime.d.mts',"type RustResult<T,E> = Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:E}>;\ntype Success<R extends RustResult<unknown,unknown>> = Extract<R,{$:'Ok'}>['field0'];\ntype Failure<R extends RustResult<unknown,unknown>> = Extract<R,{$:'Err'}>['field0'];\nexport declare function collectResult<R extends RustResult<unknown,unknown>>(values: Iterable<R>): RustResult<ReadonlyArray<Success<R>>,Failure<R>>;\nexport declare function mapResultError<R extends RustResult<unknown,unknown>,F>(value: R, callback: (error: Failure<R>) => F): RustResult<Success<R>,F>;\n");
  files.set('csv-string-runtime.mjs',readFileSync(new URL('./extensions/csv-string-runtime.mjs',import.meta.url),'utf8'));
  files.set('csv-string-runtime.d.mts',"type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\nexport declare function stringSplitCharacter(value: string, delimiter: string): IterableIterator<string>;\nexport declare function stringSplitNext(value: IterableIterator<string>): RustOption<string>;\nexport declare function allocateStringItem(value: string): string;\n");
  files.set('string-iterator-runtime.mjs',readFileSync(new URL('./extensions/string-iterator-runtime.mjs',import.meta.url),'utf8'));
  files.set('whitespace-data.mjs',readFileSync(new URL('./extensions/whitespace-data.mjs',import.meta.url),'utf8'));
  files.set('string-iterator-runtime.d.mts',"type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\nexport declare function stringLines(value: string): IterableIterator<string>;\nexport declare function stringWhitespace(value: string): IterableIterator<string>;\nexport declare function stringNext(value: IterableIterator<string>): RustOption<string>;\nexport declare function stringJoin(values: readonly string[], separator: string): string;\n");
  files.set('json-macro-runtime.mjs',readFileSync(new URL('./json-macro-runtime.mjs',import.meta.url),'utf8').replaceAll("'./extensions/json-values.mjs'","'./json-values.mjs'").replaceAll("'./extensions/json-numbers.mjs'","'./json-numbers.mjs'"));
  files.set('json-macro-runtime.d.mts',readFileSync(new URL('./json-macro-runtime.d.mts',import.meta.url),'utf8'));
  for(const file of ['slice-membership-runtime.mjs','slice-membership-runtime.d.mts'])files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));
  for(const file of ['json-roundtrip-numbers.mjs','json-roundtrip-numbers.d.mts','json-roundtrip-runtime.mjs','json-roundtrip-runtime.d.mts'])files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));
  for(const file of ['exact-binary64.mjs','exact-binary64.d.mts'])files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));
  for(const file of ['json-roundtrip-lexical.mjs','json-roundtrip-cache-source.mjs','json-roundtrip-lexical.d.mts','json-roundtrip-NOTICE.md','json-roundtrip-LICENSE-MIT.txt','json-roundtrip-LICENSE-APACHE.txt'])files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));
  files.set('utf16-fixed-f64-runtime.mjs',readFileSync(new URL('./extensions/utf16-fixed-f64-runtime.mjs',import.meta.url),'utf8'));
  files.set('utf16-fixed-f64-runtime.d.mts','export declare function encodeUtf16(value: string): IterableIterator<bigint>;\nexport declare function fixedToF64(value: bigint, source: string): number;\n');
  files.set('float-runtime.mjs',readFileSync(new URL('./extensions/float-runtime.mjs',import.meta.url),'utf8'));
  files.set('iterator-runtime.mjs',readFileSync(new URL('./extensions/iterator-runtime.mjs',import.meta.url),'utf8'));
  files.set('iterator-runtime.d.mts','export declare function assertImmutableIterator(value: unknown): true;\n');
  for(const file of ['json-runtime.mjs','json-values.mjs','json-parser.mjs','json-numbers.mjs','time-runtime.mjs','vector-runtime.mjs','integer-runtime.mjs','fixed-integer-runtime.mjs','copy-runtime.mjs','fixed-array-runtime.mjs'])files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));
  files.set('fixed-array-runtime.d.mts',"export declare function copyFixedArray<T, N extends number>(value: ReadonlyArray<T>, type: Readonly<{kind:'array';rustFixedArray:Readonly<{length:N}>;element:unknown}>): ReadonlyArray<T> & { readonly length:N };\n");
  files.set('copy-runtime.d.mts','export declare function assertImmutableCopy(value: unknown): true;\n');
  files.set('vector-runtime.d.mts',`type RustOption<T> = Readonly<{ $: 'None' }> | Readonly<{ $: 'Some'; field0: T }>;
export declare function createVectorRuntime(validate: (value: unknown) => true): Readonly<{
  rust_vec_get<T>(value: readonly T[], index: bigint): RustOption<T>;
  rust_vec_first<T>(value: readonly T[]): RustOption<T>;
  rust_vec_last<T>(value: readonly T[]): RustOption<T>;
}>;
`);
  files.set('fixed-integer-runtime.d.mts',`type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function createFixedIntegerRuntime(type: Readonly<{kind:'fixed';bits:8|16|32|64|128;signed:boolean}>): Readonly<{
${['checked_add','checked_sub','checked_mul','saturating_add','saturating_sub','saturating_mul','min','max','clamp'].map(method=>`rust_fixed_${method}(left:bigint,right:bigint${method==='clamp'?',upper:bigint':''}): ${method.startsWith('checked_')?'RustOption<bigint>':'bigint'};`).join('\n')}
}>;\n`);
  files.set('type-layout-runtime.mjs',readFileSync(new URL('./type-layout-runtime.mjs',import.meta.url),'utf8'));
  files.set('json-values.d.mts','export declare function validateJsonNumber(value: unknown): unknown;\nexport declare function validateJsonMap(value: unknown): unknown;\n');
  files.set('type-layout-runtime.d.mts','export declare function validateRustValue(value: unknown, type: unknown, schema: unknown, options?: unknown): true;\n');
  for(const family of ['json','time','integer','float']) {
    const declarations=HOST_CONTRACTS.filter(contract=>contract.family===family).map(contract=>`export declare function ${contract.jsExport}(${contract.params.map((type,index)=>`arg${index}: ${typeScriptType(checker.hostType(type,[],{start:0,end:0}),types)}`).join(', ')}): ${typeScriptType(checker.hostType(contract.ret,[],{start:0,end:0}),types)};`).join('\n');
    files.set(family+'-runtime.d.mts',aliases+'\n'+declarations+'\n');
  }
  const parseError=typeScriptType(checker.hostType({kind:'named',path:['std','num','ParseIntError']},[],{start:0,end:0}),types);
  files.set('integer-runtime.d.mts',files.get('integer-runtime.d.mts')+`export declare function createIntegerRuntime(type: Readonly<{kind:'fixed';bits:8|16|32|64|128;signed:boolean}>): Readonly<{
    rust_integer_parse(source:string): Readonly<{$:'Ok';field0:bigint}>|Readonly<{$:'Err';field0:${parseError}}>;
    rust_integer_from_str_radix(source:string,radix:bigint): Readonly<{$:'Ok';field0:bigint}>|Readonly<{$:'Err';field0:${parseError}}>;
  }>;\n`);
  for(const file of ['json-NOTICE.md','json-LICENSE-MIT.txt','time-NOTICE.md','integer-NOTICE.md','fixed-integer-NOTICE.md']) {
    try{files.set(file,readFileSync(new URL('./extensions/'+file,import.meta.url),'utf8'));}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
  return files;
}
