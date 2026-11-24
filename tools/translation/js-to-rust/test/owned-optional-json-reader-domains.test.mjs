// Independent source/private/strict target regression SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ownedJsonOptionalReaderOperation,ownedJsonOptionalReaderRustCall} from '../owned-json-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../../router-core-source-data.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../../async-control-native-source.mjs';
import {serde_json_from_str} from '../../extensions/json-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url)),some=field0=>({$:'Some',field0}),none={$:'None'};
const variants=['owned-core','owned-collections','owned-iteration','owned-vector-candidate','owned-state','owned-outcome','owned-cancellation'];
const methods=[['text','as_str',true],['boolean','as_bool',false],['unsigned','as_u64',false],['signed','as_i64',false],['decimal','as_f64',false],['unit','as_null',false],['number','as_number',true],['array','as_array',true],['object','as_object',true]];
const imports='import {'+methods.map(([name,member])=>'router_core_json_option_'+member+' as read_'+name).join(',')+"} from './runtime/json-option-runtime.mjs';\n",source=imports+methods.map(([name])=>'export function '+name+'(value){return read_'+name+'(value);}\n').join('');
function typed(){let result=source;for(const [name]of methods)result=result.replace('function '+name+'(value)','function '+name+'(value:Parameters<typeof read_'+name+'>[0]):ReturnType<typeof read_'+name+'>');return result;}
function files(syntax,cancellation,js=source,ts=typed()){return [...syntax.ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'+(cancellation?'pub mod translation_async_control_core;\n':'')},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},...(cancellation?[{path:'src/translation_async_control_core.rs',source:ASYNC_CONTROL_NATIVE_SOURCE}]:[]),{path:'Cargo.toml',source:readFileSync(join(root,'rust/Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'Cargo.lock'),'utf8')},{path:'caller.mjs',source:js},{path:'caller.mts',source:ts}];}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function json(source){const value=serde_json_from_str(source);assert.equal(value.$,'Ok');return freeze(value.field0);}
test('the nine fixed Rust equations distinguish borrowed roots from copied scalar results',limits,()=>{
 for(const [,member,borrowed]of methods){const name='router_core_json_option_'+member,row=ownedJsonOptionalReaderOperation(name);assert.equal(row.root,borrowed?0:null);assert.equal(row.input,'json-option-input');assert.equal(ownedJsonOptionalReaderRustCall(name,'__ro_arg_0'),'match __ro_arg_0 { Some(value) => ::serde_json::Value::'+member+'(value), None => None }');}assert.equal(ownedJsonOptionalReaderOperation('router_core_json_option_custom'),null);
});
test('all seven original source paths emit paired opaque input witnesses and execute independently strict targets',limits,async t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-optional-json-domains-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const inputs=[];
 for(const variant of variants){
  const syntax=await import('../'+variant+'-source.mjs'),operations=await import('../'+variant+'-operations.mjs'),data=files(syntax,variant==='owned-cancellation'),context=syntax.createOwnedCoreSourceContext({runtimeRoot:'runtime',declarationRoot:'runtime',files:data,...(variant==='owned-vector-candidate'?{vectorBindings:[]}: {})}),analysis=operations.analyzeOwnedCoreModule(context,'caller.mjs');assert.equal(analysis.program.length,9,variant);for(const [name,,borrowed]of methods)assert.equal(analysis.program.find(item=>item.javascript===name).resultRoot,borrowed?'value':null,variant+' '+name);
  const typed=operations.emitOwnedCoreProgram(analysis.program,'typescript',{outputPath:'reverse.mts'}),rust=operations.emitOwnedCoreProgram(analysis.program,'rust');assert.ok(typed.includes('router_core_json_option_as_str as __ro_router_core_json_option_as_str'),variant);for(const [,member]of methods)assert.ok(rust.includes('::serde_json::Value::'+member+'('),variant+' '+member);
  function write(path,source){const target=join(directory,variant,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);}for(const row of data.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('reverse.mts',typed);inputs.push(join(directory,variant,'reverse.mts'));
 }
 const compiler=join(root,'js/node_modules/typescript/bin/tsc');t.diagnostic(execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',timeout:20000}).trim());execFileSync(process.execPath,[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),...inputs],{encoding:'utf8',timeout:20000,stdio:'pipe'});
 for(const variant of variants){
  const syntax=await import('../'+variant+'-source.mjs');for(const row of syntax.ownedCoreRuntimeSources()){const target=join(directory,'out',variant,row.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,row.source);}
  const api=await import(pathToFileURL(join(directory,'out',variant,'reverse.mjs')).href);for(const [name]of methods)assert.deepEqual(api[name](none),none,variant+' '+name);
  const array=json('["猫😀",false]');assert.strictEqual(api.array(some(array)).field0,array.field0);assert.deepEqual(api.boolean(some(json('true'))),some(true));assert.deepEqual(api.unsigned(some(json('18446744073709551615'))),some(18446744073709551615n));assert.deepEqual(api.signed(some(json('-1'))),some(-1n));assert.ok(Object.is(api.decimal(some(json('-0.0'))).field0,-0));assert.deepEqual(api.unit(some(json('null'))),some(null));assert.deepEqual(api.text(some(json('"猫😀"'))),some('猫😀'));
 }
});
test('opaque input field access and alternate runtime bindings remain source refusals',limits,async()=>{
 const syntax=await import('../owned-core-source.mjs'),operations=await import('../owned-core-operations.mjs');
 for(const body of ["return value.field0;","if(value.$==='Some'){return read_text(value);}else{return read_text(value);}"]){const js=imports+'export function pending(value){'+body+'}',ts=js.replace('function pending(value)','function pending(value:Parameters<typeof read_text>[0]):ReturnType<typeof read_text>'),context=syntax.createOwnedCoreSourceContext({runtimeRoot:'runtime',declarationRoot:'runtime',files:files(syntax,false,js,ts)}),analysis=operations.analyzeOwnedCoreModule(context,'caller.mjs');assert.equal(analysis.program.length,0);assert.equal(analysis.diagnostics.length,1);assert.match(analysis.diagnostics[0].message,/opaque|optional|unimplemented/u);}
});
