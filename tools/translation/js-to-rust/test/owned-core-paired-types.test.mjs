import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createOwnedCoreSourceContext,translateOwnedCoreJavaScript,translateOwnedCoreConcreteSyntaxMeta,parseOwnedCoreMeta,emitRust} from '../translator.mjs';
import {ownedCoreRuntimeSources} from '../owned-core-source.mjs';
import {prepareOwnedCorePairedTypes} from '../owned-core-paired-types.mjs';
import {buildOwnedCoreArtifacts,captureOwnedCoreCorpus} from '../owned-core-corpus.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {json_macro_null,json_macro_string,json_macro_object} from '../../json-macro-runtime.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000};
const JS='app/src/caller.mjs',TS='typed/src/caller.mts';
const imports="import {router_core_json_copy as copy,router_core_json_index_str as index} from '../runtime/json-update-runtime.mjs';\n";
const types="import type {JsonValue} from '../runtime/json-macro-runtime.mjs';\n";
const copied=imports+'export function copied(value){return copy(value);}',copiedTyped=imports+types+'export function copied(value:JsonValue):JsonValue{return copy(value);}';
function original(path){return existsSync(join(root,path))?readFileSync(join(root,path),'utf8'):execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:16777216});}
function input(source,typed){
 return {runtimeRoot:'app/runtime',declarationRoot:'typed/runtime',files:[...ownedCoreRuntimeSources('app/runtime','typed/runtime'),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:JS,source},...(typed===undefined?[]:[{path:TS,source:typed}])]};
}
function translate(source=copied,typed=copiedTyped){
 const data=input(source,typed),context=createOwnedCoreSourceContext(data),result=translateOwnedCoreJavaScript(source,{sourcePath:JS,context,typescriptOutputPath:'typed/src/reverse.mts'});return {data,context,result};
}
function write(directory,path,source){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
async function targets(t,source=copied,typed=copiedTyped){
 const row=translate(source,typed),directory=mkdtempSync(join(tmpdir(),'owned-paired-types-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const file of row.data.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(directory,file.path,file.source);
 // The strict CLI resolves declarations beside both physical runtime copies;
 // these are the complete same registered declarations captured by the input.
 for(const file of row.data.files.filter(file=>file.path.startsWith('typed/runtime/')&&file.path.endsWith('.mts')))write(directory,'app/runtime/'+file.path.slice('typed/runtime/'.length),file.source);
 write(directory,'typed/src/reverse.mts',row.result.typescript);
 try{execFileSync(process.execPath,[join(root,'packages/javascript/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),join(directory,TS),join(directory,'typed/src/reverse.mts')],{cwd:root,encoding:'utf8',timeout:20000,stdio:'pipe'});}catch(error){assert.fail('strict paired original/reverse TypeScript failed\n'+String(error.stdout??'')+'\n'+String(error.stderr??''));}
 for(const file of row.data.files.filter(file=>file.path.startsWith('app/runtime/'))){
  write(directory,'out/'+file.path,file.source);
  // Both emitted TS modules import the same complete actual runtime bytes.
  write(directory,'out/typed/runtime/'+file.path.slice('app/runtime/'.length),file.source);
 }
 const javascript=await import(pathToFileURL(join(directory,JS)).href),typedOriginal=await import(pathToFileURL(join(directory,'out/typed/src/caller.mjs')).href),typedReverse=await import(pathToFileURL(join(directory,'out/typed/src/reverse.mjs')).href),runtime=await prepareOwnedCoreRuntime(row.result.program);
 return {...row,javascript,typedOriginal,typedReverse,run:(name,args)=>evaluate(row.result.program,name,args,runtime)};
}
test('paired written canonical types retain original JS and strict independent targets',limits,async t=>{
 const source=copied+'\nexport function choose(value,yes){if(yes){return copy(value);}else{return copy(value);}}',typed=copiedTyped+'\nexport function choose(value:JsonValue,yes:boolean):JsonValue{if(yes){return copy(value);}else{return copy(value);}}';
 const api=await targets(t,source,typed),value=json_macro_object([['name',json_macro_string('é🦀')]]),golden=json_macro_object([['name',json_macro_string('é🦀')]]);
 for(const actual of [api.javascript.copied(value),api.typedOriginal.copied(value),api.typedReverse.copied(value),api.run('copied',[value])]){assert.deepEqual(actual,golden);assert.notEqual(actual,value);assert.ok(Object.isFrozen(actual));}
 for(const flag of [true,false])for(const actual of [api.javascript.choose(value,flag),api.typedOriginal.choose(value,flag),api.typedReverse.choose(value,flag),api.run('choose',[value,flag])])assert.deepEqual(actual,golden);
 assert.equal(api.result.program[0].pairedSource.path,TS);assert.equal(api.result.program[0].source.source,source);assert.equal(api.result.program[0].pairedSource.source,typed);
 assert.equal(parseOwnedCoreMeta(api.result.meta,{context:api.context})[0].params[0].type,'json-ref');assert.match(api.result.rust,/crate::translation_core::json_copy/u);
});
test('complete paired CST, ordered executable tokens and every erasure have whole undo',limits,()=>{
 const source=imports+'// actual source é\nexport function copied(value){return copy(value);}',typed=imports+types+'// actual source é\nexport function copied(value:JsonValue):JsonValue{return copy(value);}';
 const pair=prepareOwnedCorePairedTypes(JS,source,TS,typed);assert.equal(pair.javascript.source,source);assert.equal(pair.typescript.source,typed);assert.equal(pair.javascript.concreteSyntax.language,'JavaScript');assert.equal(pair.typescript.concreteSyntax.language,'TypeScript');
 let after=typed;for(const edit of [...pair.erasure.edits].reverse()){assert.equal(after.slice(...edit.span),edit.expected);after=after.slice(0,edit.span[0])+after.slice(edit.span[1]);}assert.equal(after,pair.erasure.source);
 for(const edit of [...pair.erasure.edits].reverse())after=after.slice(0,edit.afterSpan[0])+edit.expected+after.slice(edit.afterSpan[1]);assert.equal(after,typed);
 assert.throws(()=>translate(source,typed.replace('copy(value)','index(value,"name")')),/complete executable tokens differ/u);
 assert.throws(()=>prepareOwnedCorePairedTypes(JS,source,TS,typed.replace('// actual source é','// counterfeit comment')),/complete executable tokens differ/u);
 assert.throws(()=>prepareOwnedCorePairedTypes(JS,copied.replace('return copy(value);','return\ncopy(value);'),TS,copiedTyped),/erased native syntax differs/u);
 const {context,result}=translate(source,typed),again=translateOwnedCoreConcreteSyntaxMeta(result.concreteSyntax.meta,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});assert.equal(again.meta,result.meta);assert.equal(again.rust,result.rust);
 assert.throws(()=>parseOwnedCoreMeta(result.meta.replace('copied','counterfeit'),{context}));
});
test('written types never replace actual imported symbols, result ABI or unknown layouts',limits,()=>{
 assert.throws(()=>translate(copied,copiedTyped.replace(':JsonValue{return',':boolean{return')),/paired written return ABI/u);
 assert.throws(()=>translate(copied,copiedTyped.replace(':JsonValue{return',':Promise<boolean>{return')),/actual import symbol/u);
 assert.throws(()=>translate(copied,copiedTyped.replace(types,'type JsonValue={readonly counterfeit:true};\n')),/unsupported paired top-level declaration/u);
 assert.throws(()=>translate(copied,copiedTyped.replace(types,"import type {JsonValue} from '../runtime/counterfeit.mjs';\n")),/import target missing/u);
 const source=imports+'export function copied(value){const copy=value;return copy(value);}',typed=imports+types+'export function copied(value:JsonValue):JsonValue{const copy=value;return copy(value);}';assert.throws(()=>translate(source,typed),/actual import symbol/u);
 const source2=imports+'export function copied(value){return value.clone();}',typed2=imports+types+'export function copied(value:JsonValue):JsonValue{return value.clone();}';assert.throws(()=>translate(source2,typed2),/direct original imported call/u);
 const local=copied.replace('return copy(value);','const actual=copy(value);return actual;'),localTyped=copiedTyped.replace('return copy(value);','const actual:boolean=copy(value);return actual;');assert.throws(()=>translate(local,localTyped),/paired written local ABI differs/u);
});
test('paired domains leave actual input loan roots and multiple written key lifetimes intact',limits,async t=>{
 const source=imports+'export function read_field(value,key){return index(value,key);}',typed=imports+types+'export function read_field(value:JsonValue,key:string):JsonValue{return index(value,key);}';
 const api=await targets(t,source,typed),value=json_macro_object([['é',json_macro_string('🦀')]]),entries=value.field0.entries.filter(entry=>entry.key==='é');assert.equal(entries.length,1);const stored=entries[0].value;
 assert.equal(api.javascript.read_field(value,'é'),stored);assert.equal(api.typedOriginal.read_field(value,'é'),stored);assert.equal(api.typedReverse.read_field(value,'é'),stored);assert.equal(api.run('read_field',[value,'é']),stored);
 assert.equal(api.result.program[0].resultRoot,'value');assert.match(api.result.rust,/fn read_field<'a>\(value: &'a crate::translation_core::Json, key: &str\) -> &'a crate::translation_core::Json/u);
 assert.throws(()=>translate(source.replace('index(value,key)','index(copy(value),key)'),typed.replace('index(value,key)','index(copy(value),key)')),/live input root/u);
 assert.throws(()=>translate(source,typed.replace('key:string','key:boolean')),/owned argument type differs/u);
});
test('generated underscore names are checked while Rust collisions and private names refuse',limits,async t=>{
 const source=copied.replace('copied(value)','rp_6162(value)').replace('return copy(value);','const named_value=copy(value);return named_value;'),typed=copiedTyped.replace('copied(value','rp_6162(value').replace('return copy(value);','const named_value:JsonValue=copy(value);return named_value;');
 const api=await targets(t,source,typed);assert.deepEqual(api.typedReverse.rp_6162(json_macro_null()),json_macro_null());assert.match(api.result.rust,/fn rp_6162/u);
 const duplicate=imports+'export function fooBar(value){return copy(value);} export function foo_bar(value){return copy(value);}',duplicateTyped=imports+types+'export function fooBar(value:JsonValue):JsonValue{return copy(value);} export function foo_bar(value:JsonValue):JsonValue{return copy(value);}';assert.throws(()=>translate(duplicate,duplicateTyped),/duplicate function/u);
 const names=imports+'export function copied(value,fooBar,foo_bar){return copy(value);}',namesTyped=imports+types+'export function copied(value:JsonValue,fooBar:boolean,foo_bar:boolean):JsonValue{return copy(value);}';assert.throws(()=>translate(names,namesTyped),/colliding Rust binding/u);
 assert.throws(()=>translate(copied.replaceAll('value','__ro_arg_0'),copiedTyped.replaceAll('value','__ro_arg_0')),/reserved or nonidentifier binding/u);
 assert.throws(()=>translate(copied.replace('copied(value)','gen(value)'),copiedTyped.replace('copied(value','gen(value')),/nonportable declaration name/u);
});
test('module preflight, malformed pairs and forged source data retain complete refusals',limits,()=>{
 assert.throws(()=>translate('const effect=1;\n'+copied,'const effect=1;\n'+copiedTyped),/top-level evaluation/u);
 assert.throws(()=>translate(copied,copiedTyped.replace('return copy(value);','return copy(value) as JsonValue;')),/unsupported executable TypeScript erasure/u);
 assert.throws(()=>translate(copied,copiedTyped.replace('copied(value','copied<T>(value')),/ordinary paired function/u);
 const data=input(copied,copiedTyped);data.files.push({path:TS.replace('.mts','.ts'),source:copiedTyped});const context=createOwnedCoreSourceContext(data);assert.throws(()=>translateOwnedCoreJavaScript(copied,{sourcePath:JS,context}),/ambiguous complete TypeScript pair/u);
 const changed=input(copied,copiedTyped);changed.files.find(row=>row.path==='app/runtime/json-update-runtime.mjs').source+='\n';assert.throws(()=>createOwnedCoreSourceContext(changed),/runtime differs/u);
 const foreign=input(copied,copiedTyped);foreign.files.push({path:'typed/runtime/json-macro-runtime.mjs',source:'export const forged=true;'});const foreignContext=createOwnedCoreSourceContext(foreign);assert.throws(()=>translateOwnedCoreJavaScript(copied,{sourcePath:JS,context:foreignContext}),/paired runtime counterpart differs/u);
 const {result}=translate();const detached=JSON.parse(JSON.stringify(result.program));assert.throws(()=>emitRust(detached),/unissued/u);
 const fields=input(copied,copiedTyped);fields.pairedTypesProved=true;assert.throws(()=>createOwnedCoreSourceContext(fields),/unknown source record field/u);
 const written=imports+'/** @param {import("../runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function copied(value){return copy(value);}';const legacy=translate(written,undefined);assert.equal(Object.hasOwn(legacy.result.program[0],'pairedSource'),false);
});
test('the actual corpus captures matching application TS and consumes it before packaging',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'owned-paired-corpus-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const base='packages/javascript/generated/rust-project',typed='packages/typescript/generated/rust-project';
 for(const row of input(copied,copiedTyped).files){
  const path=row.path===JS?base+'/src/lib.mjs':row.path===TS?typed+'/src/lib.mts':row.path.startsWith('app/runtime/')?base+'/runtime/'+row.path.slice('app/runtime/'.length):row.path.startsWith('typed/runtime/')?typed+'/runtime/'+row.path.slice('typed/runtime/'.length):row.path;
  write(directory,path,row.source);
 }
 const captured=captureOwnedCoreCorpus(directory);assert.equal(captured.files.find(row=>row.path===typed+'/src/lib.mts').source,copiedTyped);
 const actual=buildOwnedCoreArtifacts(directory);assert.equal(actual.manifest.totals.translatedItems,1);assert.equal(actual.manifest.totals.unsupportedItems,0);assert.deepEqual(actual.manifest.trace.map(row=>row.phase),['language','repository']);
 const stored=JSON.parse(actual.artifacts.get('tools/translation/js-to-rust/generated/owned-core/inputs.json'));assert.equal(stored.files.find(row=>row.path===typed+'/src/lib.mts').source,copiedTyped);
 write(directory,typed+'/src/lib.mts',copiedTyped.replace('copy(value)','index(value,"changed")'));assert.throws(()=>captured.requireCurrent(),/complete input changed/u);const changed=buildOwnedCoreArtifacts(directory);assert.equal(changed.manifest.totals.translatedItems,0);assert.match(changed.manifest.diagnostics[0].message,/complete executable tokens differ/u);
});
test('full real forward parents and every independent refusal remain in the actual input census',limits,()=>{
 const captured=captureOwnedCoreCorpus(root),js='packages/javascript/generated/rust-project/src/lib.mjs',typed='packages/typescript/generated/rust-project/src/lib.ts';
 assert.equal(captured.files.find(row=>row.path===js).source,original(js));assert.equal(captured.files.find(row=>row.path===typed).source,original(typed));
 const result=buildOwnedCoreArtifacts(root),stored=JSON.parse(result.artifacts.get('tools/translation/js-to-rust/generated/owned-core/inputs.json'));
 for(const path of [js,typed])assert.equal(stored.files.find(row=>row.path===path).source,original(path));
 for(const row of result.manifest.modules){assert.equal(row.sourceItems,row.translatedItems+row.unsupportedItems);assert.equal(stored.files.find(file=>file.path===row.path).source,original(row.path));}
 assert.equal(result.manifest.runtimeParity,false);assert.equal(result.manifest.wholeSourceSynchronization,false);assert.equal(result.manifest.witness.applicationItems,0);
});
