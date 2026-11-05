// Independent control-flow regression SOURCE. Entire bulk draft precedes runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedControlSources} from '../../prepare-owned-control-sources.mjs';
import {prepareOwnedJsonLoopSources} from '../../prepare-owned-json-loop-sources.mjs';
import {prepareFilesystemControlSources} from '../../prepare-filesystem-control-sources.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {router_state_json_append as append,router_state_json_values_copy as valuesCopy} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {serde_json_value_is_null as isNull} from './runtime/json-runtime.mjs';
import {json_macro_null as nil,json_macro_array as array,json_macro_bool as boolean} from './runtime/json-macro-runtime.mjs';
import {router_carrier_json_ok as ok,router_carrier_json_err as err} from './runtime/owned-outcome-runtime.mjs';
`;
const source=imports+`
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function untilNull(values){let result=array([]);for(const value of values){if(isNull(value)){break;}result=append(result,copy(value));}return result;}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function skippingNull(values){let result=array([]);for(const value of values){if(isNull(value)){continue;}result=append(result,copy(value));}return result;}
/** @param {Parameters<typeof valuesCopy>[0]} values @param {Parameters<typeof valuesCopy>[0]} nested */
export function exclusive(values,nested){let result=array([]);for(const outer of values){if(isNull(outer)){continue;}for(const inner of nested){if(isNull(inner)){break;}result=append(result,copy(inner));}}return result;}
/** @param {boolean} enabled */
export function onePoll(enabled){let active=enabled;let result=nil();while(active){active=false;result=boolean(true);continue;}return result;}
/** @param {boolean} enabled */
export function broken(enabled){let active=enabled;while(active){break;}return boolean(enabled);}
/** @param {boolean} enabled */
export function returned(enabled){while(enabled){return boolean(true);}return nil();}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function remembered(values){let seen=false;for(const value of values){if(!isNull(value)){seen=true;break;}}return boolean(seen);}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function first(values){let active=true;let result=nil();while(active){active=false;for(const value of values){if(isNull(value)){continue;}result=copy(value);break;}}return result;}
/** @param {boolean} enabled @returns {ReturnType<typeof ok>} */
export function carrier(enabled){let current=ok(nil());while(current.$==='Ok'){if(enabled){current=err('changed');continue;}else{break;}}return current;}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE});return data;
}
function draft(){const data=input(),context=createOwnedOutcomeContext(data),result=translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-control-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('nested break continue while zero iterations mutable flags and real returns agree in all four targets',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedOutcomeRuntime(row.result.program),a=text('a'),b=text('b'),cases=[['untilNull',[[a,nil(),b]],array([a])],['untilNull',[[]],array([])],['skippingNull',[[nil(),a,nil(),b]],array([a,b])],['exclusive',[[a,nil(),b],[b,nil(),a]],array([b,b])],['onePoll',[true],bool(true)],['onePoll',[false],nil()],['broken',[true],bool(true)],['broken',[false],bool(false)],['returned',[true],bool(true)],['returned',[false],nil()],['remembered',[[nil(),a]],bool(true)],['remembered',[[nil()]],bool(false)],['first',[[nil(),a,b]],a],['first',[[]],nil()],['carrier',[true],{$:'Err',field0:'changed'}],['carrier',[false],{$:'Ok',field0:nil()}]];
 for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(cases.map(([name,args])=>evaluateOwnedOutcome(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));
});
test('complete native TypeScript and Rust inverses freshly reproduce loops and control completions',limits,()=>{
 const row=draft(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));
 const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
 const altered=row.result.rust.replace('break;','break unrelated;'),bad={...row.data,files:[...row.data.files,{path:'caller.rs',source:altered}]};assert.notEqual(altered,row.result.rust);assert.throws(()=>translateOwnedOutcomeRust(altered,{context:createOwnedOutcomeContext(bad),sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));
});
test('loop entry and every exit discard stale mutable carrier facts and preserve callback boundaries',limits,()=>{
 const bodies=[
  '/** @param {boolean} enabled */ export function invalid(enabled){while(enabled){break label;}return nil();}',
  '/** @param {boolean} enabled */ export function invalid(enabled){while(enabled){continue;return nil();}return nil();}',
  '/** @param {string} enabled */ export function invalid(enabled){while(enabled){break;}return nil();}',
  '/** @param {boolean} enabled @returns {ReturnType<typeof ok>} */ export function invalid(enabled){let current=ok(nil());if(current.$===\'Ok\'){while(enabled){current=err(\'bad\');break;}return ok(current.field0);}return current;}',
  '/** @param {Parameters<typeof valuesCopy>[0]} values @returns {ReturnType<typeof ok>} */ export function invalid(values){let current=ok(nil());if(current.$===\'Ok\'){for(const value of values){const observed=current.field0;current=err(\'bad\');}return current;}return current;}',
 ];
 for(const body of bodies){const caller=imports+body;assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));}
});
test('six complete predecessors compose the original loop and filesystem histories without cached verdicts',limits,()=>{
 const current=prepareOwnedControlSources();assert.equal(current.files.length,6);for(const plan of [current,prepareOwnedJsonLoopSources(),prepareFilesystemControlSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
