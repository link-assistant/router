// Full independent regression SOURCE; execute only after all bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createOwnedStateContext,translateOwnedStateJavaScript,translateOwnedStateTypeScript,prepareOwnedStateRuntime,evaluateOwnedState,evaluateOwnedStateBatch,readOwnedStateMeta,emitOwnedStateRust} from '../owned-state.mjs';
import {translateOwnedStateRust} from '../owned-rust.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {prepareOwnedStateFlow} from '../../prepare-owned-state-flow.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../../json-macro-runtime.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60_000};
const imports=`import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_state_json_append as append,router_state_json_without_field as without,router_state_json_merge as merge,router_state_json_from_values as fromValues,router_state_json_values_copy as valuesCopy,router_state_json_into_values as intoValues} from './runtime/json-state-runtime.mjs';
import {router_core_json_map as map,router_core_json_filter_map as filterMap} from './runtime/json-collections-runtime.mjs';
import {router_core_json_filter as filter,router_core_json_any as any} from './runtime/json-iteration-runtime.mjs';
import {json_macro_null as nil,json_macro_array as array} from './runtime/json-macro-runtime.mjs';
import {serde_json_value_is_null as isNull,serde_json_value_get_string as get} from './runtime/json-runtime.mjs';
`;
const source=imports+`
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} base @param {import('./runtime/json-macro-runtime.mjs').JsonValue} patch @param {string} key @param {boolean} remove */
export function objectFlow(base,patch,key,remove){let next=copy(base);const snapshot=copy(next);if(remove){next=without(next,key);}next=merge(next,patch);return array([snapshot,next]);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} base @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {boolean} early */
export function earlyFlow(base,value,early){let next=copy(base);if(early){next=append(next,value);return next;}next=append(next,nil());return next;}
/** @param {Parameters<typeof valuesCopy>[0]} values @param {import('./runtime/json-macro-runtime.mjs').JsonValue} replacement @param {boolean} replace */
export function listFlow(values,replacement,replace){let next=valuesCopy(values);if(replace){next=intoValues(replacement);}return fromValues(next);}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function nestedPredicates(values){return filter(values,value=>{return any(values,value=>{return !isNull(value);});});}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function nestedArrays(values){return map(values,value=>{const inner=map(values,value=>{return copy(value);});return fromValues(inner);});}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function nestedOption(values){return filterMap(values,value=>{const keep=any(values,candidate=>{return !isNull(candidate);});if(keep){return {$:'Some',field0:copy(value)};}return {$:'None'};});}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function guardedRead(value,key){const found=get(value,key);if(found.$==='None'){return nil();}return copy(found.field0);}
`;
function draft(javascript=source){const data=ownedStateReceivingData([{path:'caller.mjs',source:javascript}]),context=createOwnedStateContext(data),result=translateOwnedStateJavaScript(javascript,{context,sourcePath:'caller.mjs'});return {data,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-state-flow-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};
 for(const file of row.data.files.filter(file=>/\.(mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('translated.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'translated.mts')],{cwd:root,stdio:'pipe',timeout:20_000});
 for(const file of row.data.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/translated.mjs')).href)];
}
test('owned reassignments preserve snapshots branch updates and early returns across actual JS TS and both interpreters',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedStateRuntime(row.result.program),original=object([['keep',text('λ😀')],['drop',bool(false)]]),patch=object([['new',nil()]]),values=[nil(),bool(false)];
 const cases=[['objectFlow',[original,patch,'drop',true],array([original,object([['keep',text('λ😀')],['new',nil()]])])],['objectFlow',[original,patch,'drop',false],array([original,object([['keep',text('λ😀')],['drop',bool(false)],['new',nil()]])])],['earlyFlow',[array([]),text('x'),true],array([text('x')])],['earlyFlow',[array([]),text('x'),false],array([nil()])],['listFlow',[values,array([text('replacement')]),true],array([text('replacement')])],['listFlow',[values,array([]),false],array(values)],['guardedRead',[original,'keep'],text('λ😀')],['guardedRead',[original,'missing'],nil()]];
 for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);
 assert.deepEqual(cases.map(([name,args])=>evaluateOwnedState(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedStateBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.match(row.result.rust,/let mut next/);assert.equal(emitOwnedStateRust(readOwnedStateMeta(row.result.meta,{context:row.context})),row.result.rust);
});
test('nested callback shadowing and outer Option domains remain independent',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedStateRuntime(row.result.program),values=[nil(),bool(false),text('')],cases=[['nestedPredicates',[values],values],['nestedPredicates',[[nil()] ],[]],['nestedArrays',[values],values.map(()=>array(values))],['nestedOption',[values],values],['nestedOption',[[nil()]],[]]];
 for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(evaluateOwnedStateBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));
});
test('mutable flow and nested callbacks retain original TS checking and complete canonical Rust inversion',limits,()=>{
 const row=draft(),typedData=ownedStateReceivingData([{path:'caller.mts',source:row.result.typescript}]),typed=translateOwnedStateTypeScript(row.result.typescript,{context:createOwnedStateContext(typedData),sourcePath:'caller.mts'});assert.equal(typed.rust,row.result.rust);
 const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedStateRust(row.result.rust,{context:createOwnedStateContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.equal(inverse.rust,row.result.rust);assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('mutable shared inputs const assignment changed domains captured mutation and incomplete returns refuse',limits,()=>{
 const header=imports+"/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} base @param {Parameters<typeof valuesCopy>[0]} values @param {boolean} flag */\n";
 for(const body of [
  'export function invalid(base,values,flag){let next=base;return copy(next);}',
  'export function invalid(base,values,flag){const next=copy(base);next=copy(base);return next;}',
  'export function invalid(base,values,flag){let next=copy(base);next=valuesCopy(values);return next;}',
  'export function invalid(base,values,flag){let next=copy(base);const output=map(values,value=>{next=copy(value);return copy(value);});return fromValues(output);}',
  'export function invalid(base,values,flag){let next=copy(base);const output=map(values,value=>{return copy(next);});return fromValues(output);}',
  'export function invalid(base,values,flag){if(flag){return copy(base);}}',
 ])assert.throws(()=>draft(header+body));
});
test('all complete original flow implementations and successor rules remain available',limits,()=>{
 const proposal=prepareOwnedStateFlow();assert.equal(proposal.files.length,6);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
