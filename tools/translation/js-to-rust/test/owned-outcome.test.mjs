// Independent full compiler receiving SOURCE; no execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,readOwnedOutcomeMeta,emitOwnedOutcomeRust,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript} from '../owned-state.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedOutcome} from '../../prepare-owned-outcome.mjs';
import {prepareOwnedOutcomeCore} from '../../prepare-owned-outcome-core.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60_000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {router_carrier_json_ok as ok,router_carrier_json_err as err,router_carrier_json_result_copy as copy,router_carrier_json_result_or as otherwise,router_carrier_json_some as some,router_carrier_json_none as none,router_carrier_json_option_to_result as requireValue,router_carrier_json_result_to_option as optional,router_carrier_json_option_or as optionalOr} from './runtime/owned-outcome-runtime.mjs';
import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function success(value){return ok(value);}
/** @param {string} message */
export function failure(message){return err(message);}
/** @param {ReturnType<typeof ok>} result @param {import('./runtime/json-macro-runtime.mjs').JsonValue} fallback */
export function recovered(result,fallback){return otherwise(result,fallback);}
/** @param {ReturnType<typeof some>} value @param {string} message */
export function required(value,message){return requireValue(value,message);}
/** @param {ReturnType<typeof ok>} result */
export function asOption(result){return optional(result);}
/** @param {ReturnType<typeof some>} value @param {import('./runtime/json-macro-runtime.mjs').JsonValue} fallback */
export function optionValue(value,fallback){if(value.$==='None'){return optionalOr(value,fallback);}return value.field0;}
/** @param {ReturnType<typeof ok>} result */
export function inspect(result){if(result.$==='Err'){return nil();}return result.field0;}
/** @param {ReturnType<typeof ok>} result */
export function copyError(result){if(result.$!=='Ok'){return err(result.field0);}return copy(result);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @returns {ReturnType<typeof ok>} */
export function constructed(value){const observed=nil();return {$:'Ok',field0:value};}
/** @param {string} message @returns {ReturnType<typeof ok>} */
export function constructedError(message){const observed=nil();return {$:'Err',field0:message};}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @returns {ReturnType<typeof some>} */
export function constructedSome(value){const observed=nil();return {$:'Some',field0:value};}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function mutated(value){let result=ok(value);if(result.$==='Ok'){result=err('changed');}if(result.$==='Err'){return err(result.field0);}return result;}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function mutatedOption(value){let result=some(value);if(result.$==='Some'){result=none();}return optionalOr(result,nil());}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE});return data;
}
function draft(){const data=input(),context=createOwnedOutcomeContext(data),result=translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-outcome-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('constructors guards conversions fallback and mutable carriers agree in JS strict TS and both interpreters',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedOutcomeRuntime(row.result.program),value=object([['λ😀',bool(false)]]),ok={$:'Ok',field0:value},err={$:'Err',field0:'λ😀'},some={$:'Some',field0:nil()},none={$:'None'},cases=[['success',[value],ok],['failure',['λ😀'],err],['recovered',[ok,nil()],value],['recovered',[err,nil()],nil()],['required',[some,'missing'],{$:'Ok',field0:nil()}],['required',[none,'missing'],{$:'Err',field0:'missing'}],['asOption',[ok],{$:'Some',field0:value}],['asOption',[err],none],['optionValue',[some,bool(false)],nil()],['optionValue',[none,bool(false)],bool(false)],['inspect',[ok],value],['inspect',[err],nil()],['copyError',[err],err],['constructed',[value],ok],['constructedError',['λ😀'],err],['mutated',[value],{$:'Err',field0:'changed'}],['mutatedOption',[value],nil()]];
 cases.push(['constructedSome',[value],{$:'Some',field0:value}]);for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(cases.map(([name,args])=>evaluateOwnedOutcome(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.equal(emitOwnedOutcomeRust(readOwnedOutcomeMeta(row.result.meta,{context:row.context})),row.result.rust);
});
test('whole authoritative Rust and emitted TS independently recheck complete Result and Option sources',limits,()=>{
 const row=draft(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);assert.equal(inverse.runtimeParity,false);
});
test('payload access without a current native guard and guards invalidated by assignment remain refused',limits,()=>{
 const bodies=["/** @param {ReturnType<typeof ok>} value */ export function invalid(value){const observed=nil();return value.field0;}","/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */ export function invalid(value){let result=ok(value);if(result.$==='Ok'){result=err('changed');return result.field0;}return nil();}","/** @param {ReturnType<typeof some>} value */ export function invalid(value){const observed=nil();return value.field0;}","/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */ export function invalid(value){let result=some(value);if(result.$==='Some'){if(true){result=none();}return result.field0;}return nil();}"];
 for(const body of bodies){const caller=imports+body,context=createOwnedOutcomeContext(input(caller));assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context,sourcePath:'caller.mjs'}));}
});
test('source/runtime counterfeits and old private context issuers cannot authorize the new carrier lane',limits,()=>{
 for(const path of ['src/translation_carriers_core.rs','runtime/owned-outcome-runtime.mjs','runtime/owned-outcome-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 const data=input();data.files.find(row=>row.path==='src/lib.rs').source=data.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod translation_carriers_core;','');assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));const row=draft();assert.throws(()=>readOwnedOutcomeMeta(row.result.meta,{context:createOwnedStateContext(row.data)}));assert.throws(()=>translateOwnedStateJavaScript(source,{context:row.context,sourcePath:'caller.mjs'}));
});
test('all complete source copies and native publication retain both CST sequences and inverses',limits,()=>{
 const source=prepareOwnedOutcome();assert.equal(source.files.length,9);for(const row of source.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const native=prepareOwnedOutcomeCore();assert.equal(native.files[0].current,native.files[0].currentAfter);assert.equal(native.rustExecuted,false);
});
