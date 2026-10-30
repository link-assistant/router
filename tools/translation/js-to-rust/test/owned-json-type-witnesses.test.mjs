// Independent shared declaration witness regression SOURCE. All cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ownedJsonReaderTypeWitness} from '../owned-json-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../../router-core-source-data.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../../async-control-native-source.mjs';
import {prepareReverseJsonTypeWitnessSources} from '../../prepare-reverse-json-type-witness-sources.mjs';
import {serde_json_from_str} from '../../extensions/json-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const variants=['owned-core','owned-collections','owned-iteration','owned-vector-candidate','owned-state','owned-outcome','owned-cancellation'];
const imports="import {serde_json_value_as_f64 as asDecimal,serde_json_value_as_null as asUnit,serde_json_value_as_number as asNumber,serde_json_value_as_array as asArray,serde_json_value_as_object as asObject} from './runtime/json-runtime.mjs';\n";
const methods=[['decimal','asDecimal'],['unit','asUnit'],['number','asNumber'],['array','asArray'],['object','asObject']],source=imports+methods.map(([name,callee])=>'export function '+name+'(value){return '+callee+'(value);}\n').join('');
function typed(){let value=source;for(const [name,callee]of methods)value=value.replace('function '+name+'(value)','function '+name+'(value:Parameters<typeof '+callee+'>[0]):ReturnType<typeof '+callee+'>');return value;}
function nativeFiles(cancellation){return [
 {path:'src/lib.rs',source:'pub mod translation_core;\n'+(cancellation?'pub mod translation_async_control_core;\n':'')},
 {path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},
 ...(cancellation?[{path:'src/translation_async_control_core.rs',source:ASYNC_CONTROL_NATIVE_SOURCE}]:[]),
 {path:'Cargo.toml',source:readFileSync(join(root,'rust/Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'Cargo.lock'),'utf8')},
 {path:'caller.mjs',source},{path:'caller.mts',source:typed()},
];}
test('one finite catalogue supplies every optional JSON witness without observing unsupported values',limits,()=>{
 for(const [type,name]of [['json-option-ref','value_get_string'],['str-option-ref','value_as_str'],['bool-option','value_as_bool'],['u64-option','value_as_u64'],['i64-option','value_as_i64'],['f64-option','value_as_f64'],['unit-option','value_as_null'],['number-option-ref','value_as_number'],['array-option-ref','value_as_array'],['map-option-ref','value_as_object']])assert.equal(ownedJsonReaderTypeWitness(type),'serde_json_'+name);
 let touched=0;const object={toString(){touched++;return 'f64-option';}};for(const value of [object,null,undefined,'bool','str','json','json-owned-option','unknown'])assert.equal(ownedJsonReaderTypeWitness(value),null);assert.equal(touched,0);
});
test('all seven genuine receiving source contexts emit declaration-derived result types and independently strict compile',limits,async t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-json-type-witnesses-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const outputs=[];
 for(const variant of variants){
  const syntax=await import('../'+variant+'-source.mjs'),operations=await import('../'+variant+'-operations.mjs'),files=[...syntax.ownedCoreRuntimeSources(),...nativeFiles(variant==='owned-cancellation')],context=syntax.createOwnedCoreSourceContext({runtimeRoot:'runtime',declarationRoot:'runtime',files,...(variant==='owned-vector-candidate'?{vectorBindings:[]}: {})}),analysis=operations.analyzeOwnedCoreModule(context,'caller.mjs');assert.equal(analysis.program.length,5,variant);
  const result=operations.emitOwnedCoreProgram(analysis.program,'typescript',{outputPath:'witness.mts'});for(const name of ['as_f64','as_null','as_number','as_array','as_object'])assert.ok(result.includes('ReturnType<typeof __ro_serde_json_value_'+name+'>'),variant+' '+name);
  function write(path,source){const target=join(directory,variant,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);}
  for(const file of files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('witness.mts',result);outputs.push(join(directory,variant,'witness.mts'));
 }
 const compiler=join(root,'js/node_modules/typescript/bin/tsc');t.diagnostic(execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',timeout:20000}).trim());execFileSync(process.execPath,[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),...outputs],{encoding:'utf8',timeout:20000,stdio:'pipe'});
 for(const variant of variants){
  const syntax=await import('../'+variant+'-source.mjs');for(const file of syntax.ownedCoreRuntimeSources()){const path=join(directory,'out',variant,file.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,file.source);}
  const api=await import(pathToFileURL(join(directory,'out',variant,'witness.mjs')).href),parsed=serde_json_from_str('[false,"猫😀"]');assert.equal(parsed.$,'Ok');const value=parsed.field0;assert.deepEqual(api.array(value),{$:'Some',field0:value.field0});assert.strictEqual(api.array(value).field0,value.field0);assert.deepEqual(api.object(value),{$:'None'});assert.deepEqual(api.decimal(value),{$:'None'});assert.deepEqual(api.unit(value),{$:'None'});
 }
});
test('nine whole compiler equations keep original modules native owner spans both phases and complete inverses',limits,()=>{
 const plan=prepareReverseJsonTypeWitnessSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
