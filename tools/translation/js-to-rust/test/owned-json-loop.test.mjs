// Independent actual source regressions; no execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch,readOwnedOutcomeMeta,emitOwnedOutcomeRust} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedJsonLoopSources} from '../../prepare-owned-json-loop-sources.mjs';
import {prepareOwnedOutcome} from '../../prepare-owned-outcome.mjs';
import {prepareOwnedForwardSources} from '../../prepare-owned-forward-sources.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60_000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {router_state_json_append as append,router_state_json_into_values as intoValues,router_state_json_values_copy as valuesCopy} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {serde_json_value_is_null as isNull} from './runtime/json-runtime.mjs';
import {json_macro_null as nil,json_macro_array as array} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`
/** @param {Parameters<typeof valuesCopy>[0]} values @param {import('./runtime/json-macro-runtime.mjs').JsonValue} initial */
export function accumulated(values,initial){let result=copy(initial);for(const value of values){result=append(result,copy(value));}return result;}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function firstNonNull(values){for(const value of values){if(!isNull(value)){return copy(value);}}return nil();}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function last(values){let result=nil();for(const value of values){result=copy(value);}return result;}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function snapshot(values){let active=valuesCopy(values);let result=array([]);for(const value of active){active=intoValues(array([]));result=append(result,copy(value));}return result;}
/** @param {Parameters<typeof valuesCopy>[0]} values @param {Parameters<typeof valuesCopy>[0]} nested */
export function nested(values,nested){let result=array([]);for(const outer of values){for(const inner of nested){result=append(result,copy(inner));}}return result;}
/** @param {Parameters<typeof valuesCopy>[0]} values @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function shadowed(values,value){let result=copy(value);for(const value of values){result=copy(value);}return result;}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE});return data;
}
function draft(){const data=input(),context=createOwnedOutcomeContext(data),result=translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-json-loops-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('empty and nested loops early returns assignments snapshots and shadowing agree across actual JS TS and both interpreters',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedOutcomeRuntime(row.result.program),values=Object.freeze([nil(),bool(false),text('λ😀')]),cases=[['accumulated',[values,array([])],array(values)],['accumulated',[[],array([])],array([])],['firstNonNull',[values],bool(false)],['firstNonNull',[[]],nil()],['last',[values],text('λ😀')],['last',[[]],nil()],['snapshot',[values],array(values)],['nested',[[nil(),nil()],[text('a'),text('b')]],array([text('a'),text('b'),text('a'),text('b')])],['shadowed',[[],bool(true)],bool(true)],['shadowed',[values,bool(true)],text('λ😀')]];
 for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(cases.map(([name,args])=>evaluateOwnedOutcome(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.equal(emitOwnedOutcomeRust(readOwnedOutcomeMeta(row.result.meta,{context:row.context})),row.result.rust);
});
test('actual emitted TS and complete canonical Rust freshly recheck every loop and guard',limits,()=>{
 const row=draft(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
 const removed=row.result.rust.replace(/\s*__ro_domain\(&::serde_json::Value::Array\(__ro_loop_values_\d+\.clone\(\)\)\);/u,'');assert.notEqual(removed,row.result.rust);const bad={...row.data,files:[...row.data.files,{path:'caller.rs',source:removed}]};assert.throws(()=>translateOwnedOutcomeRust(removed,{context:createOwnedOutcomeContext(bad),sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));
});
test('unproved iterables mutable or escaping iteration bindings break and await remain refused',limits,()=>{
 const bodies=["/** @param {string} values */export function invalid(values){for(const value of values){return nil();}return nil();}","/** @param {Parameters<typeof valuesCopy>[0]} values */export function invalid(values){for(let value of values){return copy(value);}return nil();}","/** @param {Parameters<typeof valuesCopy>[0]} values @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */export function invalid(values,value){for(const value of values){return value;}return copy(value);}","/** @param {Parameters<typeof valuesCopy>[0]} values */export function invalid(values){outer:for(const value of values){break outer;}return nil();}"];
 for(const body of bodies){const caller=imports+body,context=createOwnedOutcomeContext(input(caller));assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context,sourcePath:'caller.mjs'}));}
 const row=draft(),typed=row.result.typescript.replace('for (const value of ','for (const value:boolean of ');assert.notEqual(typed,row.result.typescript);assert.throws(()=>translateOwnedOutcomeTypeScript(typed,{context:createOwnedOutcomeContext(input(typed,'caller.mts')),sourcePath:'caller.mts'}));
});
test('complete loop reader copy and every original outcome/forward source retain their adjacent CST histories',limits,()=>{
 const loops=prepareOwnedJsonLoopSources();assert.equal(loops.files.length,7);for(const plan of [loops,prepareOwnedOutcome(),prepareOwnedForwardSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
