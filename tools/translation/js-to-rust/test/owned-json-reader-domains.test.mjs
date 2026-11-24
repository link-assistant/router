// Independent reverse JSON domain regression SOURCE. All new cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript,parseOwnedCoreDocumentMeta,emitRust} from '../translator.mjs';
import {ownedCoreRuntimeSources} from '../owned-core-source.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {ownedJsonReaderOperation,ownedJsonOptionalPayload,ownedJsonBorrowed,ownedJsonRustTypes,ownedJsonTypeScriptTypes} from '../owned-json-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
import {prepareReverseJsonReaderDomainSources} from '../../prepare-reverse-json-reader-domain-sources.mjs';
import {serde_json_from_str} from '../../extensions/json-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url)),some=field0=>({$:'Some',field0}),none={$:'None'};
const imports="import {serde_json_value_as_f64 as asDecimal,serde_json_value_as_null as asUnit,serde_json_value_as_number as asNumber,serde_json_value_as_array as asArray,serde_json_value_as_object as asObject} from './runtime/json-runtime.mjs';\n";
const methods=[['readDecimal','asDecimal'],['readUnit','asUnit'],['readNumber','asNumber'],['readArray','asArray'],['readObject','asObject']];
const source=imports+methods.map(([name,op])=>'export function '+name+'(value){return '+op+'(value);}\n'+'export function wrap'+name.slice(4)+'(value){const found='+op+"(value);if(found.$==='Some'){return {$:'Some',field0:found.field0};}else{return {$:'None'};}}\n").join('');
function typed(js=source){let result=js;for(const [name,op]of methods)for(const actual of [name,'wrap'+name.slice(4)])result=result.replace('function '+actual+'(value)','function '+actual+'(value:Parameters<typeof '+op+'>[0]):ReturnType<typeof '+op+'>');return result;}
function receive(js=source,ts=typed(js),alter=null){
 const data={runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:readFileSync(join(root,'rust/Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'Cargo.lock'),'utf8')},{path:'caller.mjs',source:js},{path:'caller.mts',source:ts}]};alter?.(data);const context=createOwnedCoreSourceContext(data),result=translateOwnedCoreDocumentJavaScript(js,{context,sourcePath:'caller.mjs',typescriptOutputPath:'reverse.mts'});return {data,context,result};
}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-reverse-json-domains-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));function write(path,source){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
 for(const file of row.data.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('reverse.mts',row.result.typescript);const compiler=join(root,'js/node_modules/typescript/bin/tsc'),version=execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',timeout:20000});t.diagnostic(version.trim());
 execFileSync(process.execPath,[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),join(directory,'caller.mts'),join(directory,'reverse.mts')],{encoding:'utf8',timeout:20000,stdio:'pipe'});for(const file of row.data.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/caller.mjs')).href),await import(pathToFileURL(join(directory,'out/reverse.mjs')).href)];
}
function json(source){const parsed=serde_json_from_str(source);assert.equal(parsed.$,'Ok');return parsed.field0;}
test('five existing readers retain exact optional payloads native types and scalar versus borrowed roots',limits,()=>{
 for(const [name,ret,payload,borrowed]of [['as_f64','f64-option','f64',false],['as_null','unit-option','unit',false],['as_number','number-option-ref','json-number-ref',true],['as_array','array-option-ref','json-array-ref',true],['as_object','map-option-ref','map-ref',true]]){const row=ownedJsonReaderOperation('serde_json_value_'+name);assert.equal(row.ret,ret);assert.equal(row.root,borrowed?0:null);assert.equal(ownedJsonOptionalPayload(ret),payload);assert.equal(ownedJsonBorrowed(ret),borrowed);assert.ok(ownedJsonRustTypes[ret].startsWith('::std::option::Option<'));assert.ok(ownedJsonTypeScriptTypes[ret].includes("{$:'Some';field0:"));}
 const row=receive(),again=parseOwnedCoreDocumentMeta(row.result.meta,{context:row.context});assert.deepEqual(again,row.result.program);assert.equal(emitRust(again),row.result.rust);assert.equal(row.result.program.length,10);for(const item of row.result.program)assert.equal(item.resultRoot,['readNumber','wrapNumber','readArray','wrapArray','readObject','wrapObject'].includes(item.javascript)?'value':null);for(const name of ['as_f64','as_null','as_number','as_array','as_object'])assert.ok(row.result.rust.includes('::serde_json::Value::'+name+'('));
});
test('original JS original strict TS reverse strict TS and checked interpreter agree on absent scalar and aggregate cases',limits,async t=>{
 const row=receive(),apis=await targets(t,row),runtime=await prepareOwnedCoreRuntime(row.result.program);
 const cases=[['null','Null',null],['false','Bool',null],['""','String',null],['"猫😀\\u0000"','String',null],['[]','Array',null],['[false,{"Ω":null}]','Array',null],['{}','Object',null],['{"__proto__":"safe","猫":"😀"}','Object',null],['0','Number',0],['-1','Number',-1],['1.5','Number',1.5],['-0.0','Number',-0],['18446744073709551615','Number',18446744073709551616]];
 for(const [source,kind,decimal]of cases){const value=json(source),before=structuredClone(value),expected={Decimal:kind==='Number'?some(decimal):none,Unit:kind==='Null'?some(null):none,Number:kind==='Number'?some(value.field0):none,Array:kind==='Array'?some(value.field0):none,Object:kind==='Object'?some(value.field0):none};assert.equal(value.$,kind);
  for(const api of apis)for(const name of ['Decimal','Unit','Number','Array','Object'])for(const prefix of ['read','wrap']){const actual=api[prefix+name](value);assert.deepEqual(actual,expected[name],source+' '+prefix+name);if(actual.$==='Some'&&['Number','Array','Object'].includes(name))assert.strictEqual(actual.field0,value.field0);if(source==='-0.0'&&name==='Decimal')assert.ok(Object.is(actual.field0,-0));}
  for(const name of ['Decimal','Unit','Number','Array','Object'])for(const prefix of ['read','wrap'])assert.deepEqual(evaluate(row.result.program,prefix+name,[value],runtime),expected[name],source+' checked interpreter');assert.deepEqual(value,before);
 }
});
test('new optional public inputs still refuse before carrier access and copied metadata cannot change a borrowed root',limits,()=>{
 const js=imports+"export function pending(option,value){if(option.$==='Some'){return {$:'Some',field0:option.field0};}else{return {$:'None'};}}\n";
 for(const op of ['asDecimal','asUnit','asNumber','asArray','asObject']){const ts=js.replace('function pending(option,value)','function pending(option:ReturnType<typeof '+op+'>,value:Parameters<typeof '+op+'>[0]):ReturnType<typeof '+op+'>');assert.throws(()=>receive(js,ts),/optional public parameters require an independently checked carrier boundary/u);}
 const row=receive(),copied=structuredClone(row.result.program);copied[0].returns='bool-option';assert.throws(()=>emitRust(copied),/unissued/u);
 for(const runtime of ['runtime/json-runtime.mjs','runtime/json-runtime.d.mts'])assert.throws(()=>receive(source,typed(),data=>{data.files.find(row=>row.path===runtime).source+='\n// altered source\n';}),/runtime|registered/u);
});
test('two whole compiler equations retain original bodies both ordered phases and full source inverses',limits,()=>{
 const plan=prepareReverseJsonReaderDomainSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
