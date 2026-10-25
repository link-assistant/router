// Independent opaque cancellation caller SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../../async-control-native-source.mjs';
import {createOwnedCancellationContext,ownedCancellationRuntimeSources,translateOwnedCancellationJavaScript,translateOwnedCancellationTypeScript,prepareOwnedCancellationRuntime,evaluateOwnedCancellation,evaluateOwnedCancellationBatch,readOwnedCancellationMeta} from '../owned-cancellation.mjs';
import {createOwnedOutcomeContext} from '../owned-outcome.mjs';
import {router_cancel_new,router_cancel_is_set} from '../../async-control-runtime.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedCancellationSources} from '../../prepare-owned-cancellation-sources.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_cancel_new as created,router_cancel_clone as cloned,router_cancel_set as signal,router_cancel_is_set as isSet} from './runtime/async-control-runtime.mjs';
export function initial(){const value=created();return isSet(value);}
export function twice(){const value=created();const first=signal(value);const second=signal(value);return first&&!second&&isSet(value);}
export function shared(){const original=created();const copy=cloned(original);const changed=signal(copy);return changed&&isSet(original);}
export function moved(){const original=created();const next=original;const changed=signal(next);return changed&&isSet(next);}
export function produced(){const value=created();return value;}
/** @param {Parameters<typeof isSet>[0]} value */
export function borrowed(value){return isSet(value);}
/** @param {Parameters<typeof signal>[0]} value */
export function signalled(value){return signal(value);}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedCancellationRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_async_control_core;\n';data.files.push({path:'src/translation_async_control_core.rs',source:ASYNC_CONTROL_NATIVE_SOURCE});return data;
}
function translated(caller=source){return translateOwnedCancellationJavaScript(caller,{context:createOwnedCancellationContext(input(caller)),sourcePath:'caller.mjs'});}
test('actual owned local moves shared clones and idempotent cancellation agree under JS strict TS and both interpreters',limits,async t=>{
 const data=input(),result=translateOwnedCancellationJavaScript(source,{context:createOwnedCancellationContext(data),sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'router-cancellation-callers-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)));assert.equal(api.initial(),false);assert.equal(api.twice(),true);assert.equal(api.shared(),true);assert.equal(api.moved(),true);const handle=api.produced();assert.equal(api.borrowed(handle),false);assert.equal(api.signalled(handle),true);assert.equal(api.signalled(handle),false);assert.equal(api.borrowed(handle),true);assert.throws(()=>api.borrowed(Object.freeze({})),TypeError);}
 const token=await prepareOwnedCancellationRuntime(result.program);for(const [name,expected]of [['initial',false],['twice',true],['shared',true],['moved',true]])assert.equal(evaluateOwnedCancellation(result.program,name,[],token),expected);assert.deepEqual(evaluateOwnedCancellationBatch(result.program,[['initial',[]],['twice',[]],['shared',[]],['moved',[]]],token),[false,true,true,true]);const handle=evaluateOwnedCancellation(result.program,'produced',[],token);assert.equal(router_cancel_is_set(handle),false);assert.equal(evaluateOwnedCancellation(result.program,'signalled',[handle],token),true);assert.equal(evaluateOwnedCancellation(result.program,'borrowed',[handle],token),true);
});
test('operation-derived written types and detached semantic meta receive fresh whole native-source checks',limits,()=>{
 const result=translated(),typed=translateOwnedCancellationTypeScript(result.typescript,{context:createOwnedCancellationContext(input(result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.ok(result.rust.includes('crate::translation_async_control_core::cancel_clone(&'));assert.ok(result.rust.includes('crate::translation_async_control_core::Cancellation'));assert.ok(result.typescript.includes('Parameters<typeof __ro_router_cancel_is_set>[0]'));const context=createOwnedCancellationContext(input());assert.equal(readOwnedCancellationMeta(result.meta,{context}).length,result.program.length);const old=createOwnedOutcomeContext(input());assert.throws(()=>translateOwnedCancellationJavaScript(source,{context:old,sourcePath:'caller.mjs'}),/context/u);assert.throws(()=>translateOwnedCancellationJavaScript(source,{context:structuredClone(context),sourcePath:'caller.mjs'}),/context/u);
});
test('moved aliases divergent branch moves unknown handles mutable resources and stored shared borrows remain refused',limits,()=>{
 const prelude="import {router_cancel_new as created,router_cancel_clone as cloned,router_cancel_set as signal,router_cancel_is_set as isSet} from './runtime/async-control-runtime.mjs';\n";
 for(const body of [
  'export function bad(){const first=created();const second=first;const changed=signal(second);return isSet(first);}',
  '/** @param {boolean} flag */ export function bad(flag){const first=created();if(flag){const second=first;const changed=signal(second);}return isSet(first);}',
  'export function bad(){return isSet(false);}',
  'export function bad(){return isSet(created());}',
  'export function bad(){let value=created();return isSet(value);}',
  '/** @param {Parameters<typeof isSet>[0]} value */ export function bad(value){const alias=value;return isSet(alias);}',
  '/** @param {ReturnType<typeof created>} value */ export function bad(value){return isSet(value);}',
  'export function bad(){const first=created();return isSet(first,first);}',
 ])assert.throws(()=>translated(prelude+body));
});
test('complete native runtime declarations original root and actual imports are required on each source context',limits,()=>{
 for(const path of ['src/translation_async_control_core.rs','runtime/async-control-runtime.mjs','runtime/async-control-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedCancellationJavaScript(source,{context:createOwnedCancellationContext(data),sourcePath:'caller.mjs'}));}
 const duplicate=input();duplicate.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_async_control_core;';assert.throws(()=>createOwnedCancellationContext(duplicate));assert.throws(()=>translated(source.replace("'./runtime/async-control-runtime.mjs'","'./unregistered/async-control-runtime.mjs'")));
 const value=router_cancel_new();assert.equal(router_cancel_is_set(value),false);
});
test('all complete predecessor sources and distinct copied issuer/codec substitutions remain available',limits,()=>{
 const plan=prepareOwnedCancellationSources();assert.equal(plan.files.length,6);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const source=plan.files.find(row=>row.path.endsWith('/owned-cancellation-source.mjs'));assert.ok(source.originalPath.endsWith('/originals/owned-outcome-source.mjs.txt'));assert.ok(source.after.includes('const linear=type=>ownedBase64Result(type)||ownedCancellationOwned(type)'));
});
