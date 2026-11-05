// Whole source/caller regression SOURCE. No execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../../integer-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedIntegerSources} from '../../prepare-owned-integer-sources.mjs';
import {prepareIntegerCore} from '../../prepare-integer-core.mjs';
import {prepareOwnedOutcomeCore} from '../../prepare-owned-outcome-core.mjs';
import {prepareOwnedControlSources} from '../../prepare-owned-control-sources.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_integer_u64_saturating_add as add,router_integer_u64_wrapping_sub as sub,router_integer_u64_checked_div as divide,router_integer_i64_checked_abs as absolute,router_integer_i64_saturating_add as signedAdd} from './runtime/integer-runtime.mjs';
/** @param {Parameters<typeof add>[0]} value @param {Parameters<typeof add>[1]} other */
export function saturated(value,other){return add(value,other);}
/** @param {Parameters<typeof add>[0]} value */
export function counted(value){let current=value;while(current<3n){current=add(current,1n);}return current;}
/** @param {Parameters<typeof add>[0]} value */
export function previous(value){return sub(value,1n);}
/** @param {Parameters<typeof divide>[0]} value @param {Parameters<typeof divide>[1]} other */
export function divided(value,other){return divide(value,other);}
/** @param {Parameters<typeof absolute>[0]} value @returns {ReturnType<typeof absolute>} */
export function positive(value){const result=absolute(value);if(result.$==='Some'){return {$:'Some',field0:signedAdd(result.field0,1n)};}return {$:'None'};}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\npub mod translation_integer_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE},{path:'src/translation_integer_core.rs',source:INTEGER_NATIVE_SOURCE});return data;
}
function draft(){const data=input(),context=createOwnedOutcomeContext(data),result=translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
test('actual source executes integer loops optional results strict TS and both independently checked interpreters',limits,async t=>{
 const row=draft(),directory=mkdtempSync(join(tmpdir(),'router-owned-integers-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 const modules=[await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)],token=await prepareOwnedOutcomeRuntime(row.result.program),cases=[['saturated',[18446744073709551615n,1n],18446744073709551615n],['counted',[0n],3n],['counted',[4n],4n],['previous',[0n],18446744073709551615n],['divided',[5n,0n],{$:'None'}],['divided',[5n,2n],{$:'Some',field0:2n}],['positive',[-9223372036854775808n],{$:'None'}],['positive',[-7n],{$:'Some',field0:8n}]];for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(cases.map(([name,args])=>evaluateOwnedOutcome(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));
});
test('typed and complete native source round trips keep signed widths and checked Options',limits,()=>{
 const row=draft(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('missing changed native/runtime sources false widths coercion and unguarded options refuse',limits,()=>{
 for(const path of ['src/translation_integer_core.rs','runtime/integer-runtime.mjs','runtime/integer-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const caller of [source.replace('add(value,other)','add(value,-1n)'),source.replace('return divide(value,other);','return divide(value,other).field0;'),source.replace('Parameters<typeof absolute>[0]','bigint'),source.replace('signedAdd(result.field0,1n)','add(result.field0,1n)')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));
});
test('all eight complete code predecessors and both original native roots retain full inverse histories',limits,()=>{
 const current=prepareOwnedIntegerSources();assert.equal(current.files.length,8);for(const plan of [current,prepareOwnedControlSources(),prepareIntegerCore(),prepareOwnedOutcomeCore()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
