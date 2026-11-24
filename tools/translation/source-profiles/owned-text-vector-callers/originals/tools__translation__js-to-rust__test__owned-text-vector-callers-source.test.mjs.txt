// Independent caller/strict TS/IR/meta/inverse case SOURCE. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as outcome from '../owned-text-vector-outcome.mjs';
import * as cancellation from '../owned-text-vector-cancellation.mjs';
import * as originalOutcome from '../owned-outcome.mjs';
import * as originalCancellation from '../owned-cancellation.mjs';
import {translateOwnedOutcomeRust} from '../owned-text-vector-outcome-rust.mjs';
import {translateOwnedCancellationRust} from '../owned-text-vector-cancellation-rust.mjs';
import {emitOwnedCoreProgram as emitOutcome} from '../owned-text-vector-outcome-operations.mjs';
import {emitOwnedCoreProgram as emitCancellation} from '../owned-text-vector-cancellation-operations.mjs';
import {ownedTextVectorReceivingData} from './owned-text-vector-receiving-data.mjs';
import {prepareOwnedTextVectorCallerSources} from '../../prepare-owned-text-vector-caller-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const header=`import {router_owned_text_vec_new as made,router_owned_text_vec_push as pushed,router_owned_text_vec_append as joined,router_owned_text_vec_truncate as truncated,router_owned_text_vec_replace as replaced,router_owned_text_vec_len as length,router_owned_text_vec_get as at,router_owned_text_vec_from_slice as copied} from './runtime/owned-text-vector-runtime.mjs';
import {router_text_repeat as repeat,router_text_trim as trim,router_text_len_utf8 as bytes} from './runtime/text-runtime.mjs';
`;
function apiFor(family){return family==='outcome'?outcome:cancellation;}
function translated(family,source,path='caller.mjs'){
 const api=apiFor(family),data=ownedTextVectorReceivingData(family,source,path),context=api.createOwnedOutcomeContext(data);return {api,data,context,result:api.translateOwnedOutcomeJavaScript(source,{context,sourcePath:path})};
}
async function directAndTyped(data,source,typescript,run){
 const directory=mkdtempSync(join(tmpdir(),'router-text-vector-caller-'));try{
  const write=(path,text)=>{const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,text);};
  for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write(row.path,row.source);write('caller.mjs',source);write('typed.mts',typescript);
  execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--version'],{timeout:20000,stdio:'pipe'});
  execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,timeout:20000,stdio:'pipe'});
  for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
  return await run(await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href));
 }finally{rmSync(directory,{recursive:true,force:true});}
}
for(const family of ['outcome','cancellation']){
 test(family+' moves owned String/Vec, independently clones lookup payload and preserves Unicode',limits,async()=>{
  const source=header+`/** @param {string} input */
export function independent(input){let values=made();values=pushed(values,repeat(input,1n));const selected=at(values,0n);const moved=joined(values,made());if(selected.$==='Some'){return selected.field0;}else{return repeat('',1n);}}
/** @param {string} input */
export function edited(input){let values=pushed(made(),repeat(input,1n));values=replaced(values,0n,repeat('replacement',1n));values=truncated(values,1n);return at(values,0n);}
/** @param {string} input */
export function borrowedLocal(input){const text=repeat(input,1n);const loan=trim(text);return bytes(loan);}
`,{api,data,result}=translated(family,source),token=await api.prepareOwnedOutcomeRuntime(result.program);
  for(const value of ['', 'é', '🦀\u0000文']){assert.equal(api.evaluateOwnedOutcome(result.program,'independent',[value],token),value);assert.deepEqual(api.evaluateOwnedOutcome(result.program,'edited',[value],token),{$:'Some',field0:'replacement'});}assert.equal(api.evaluateOwnedOutcome(result.program,'borrowedLocal',[' 🦀 '],token),4n);
  const decoded=api.readOwnedOutcomeMeta(result.meta,{context:api.createOwnedOutcomeContext(data)});assert.equal(api.emitOwnedOutcomeRust(decoded),result.rust);assert.deepEqual(result.trace.map(row=>row.phase),['language','language','language','repository']);
  assert.match(result.rust,/translation_owned_text_vectors_core::vec_text_push/u);assert.doesNotMatch(result.rust,/selected\.clone\(\)/u);assert.match(result.typescript,/owned-text-vector-runtime\.mjs/u);assert.equal(result.runtimeParity,false);assert.equal(result.wholeRouterSynchronization,false);
  await directAndTyped(data,source,result.typescript,(js,ts)=>{assert.equal(js.independent('🦀'), '🦀');assert.equal(ts.independent('🦀'),'🦀');assert.deepEqual(ts.edited('x'),{$:'Some',field0:'replacement'});});
  const nativePath='src/owned_text_callers.rs',nativeData={...data,files:data.files.filter(row=>row.path!==nativePath).concat([{path:nativePath,source:result.rust}])},inverse=(family==='outcome'?translateOwnedOutcomeRust:translateOwnedCancellationRust)(result.rust,{context:api.createOwnedOutcomeContext(nativeData),sourcePath:nativePath,javascriptPath:'caller.mjs'});
  assert.equal(sameRustSourceSyntax(inverse.rust,result.rust),true);assert.equal(inverse.originalRust,result.rust);assert.equal(inverse.rustExecuted,false);
 });
 test(family+' actual owned/shared/slice inputs and independently checked helper signatures',limits,async()=>{
  const source=header+`/** @param {Parameters<typeof pushed>[1]} value @returns {Parameters<typeof pushed>[1]} */
export function movedText(value){return value;}
/** @param {Parameters<typeof length>[0]} input */
export function count(input){const checked=length(input);return length(input);}
/** @param {Parameters<typeof pushed>[0]} input @param {Parameters<typeof pushed>[1]} text */
export function add(input,text){const checked=truncated(input,18446744073709551615n);return pushed(checked,movedText(text));}
/** @param {Parameters<typeof copied>[0]} input */
export function copyCount(input){const checked=copied(input);return count(checked);}
`,{api,result}=translated(family,source),token=await api.prepareOwnedOutcomeRuntime(result.program),input=Object.freeze(['first','🦀']);
  assert.equal(api.evaluateOwnedOutcome(result.program,'count',[input],token),2n);assert.equal(api.evaluateOwnedOutcome(result.program,'copyCount',[input],token),2n);assert.deepEqual(api.evaluateOwnedOutcome(result.program,'add',[input,'third'],token),['first','🦀','third']);assert.equal(api.evaluateOwnedOutcome(result.program,'movedText',['owned'],token),'owned');assert.match(result.rust,/fn moved_text\(value: ::std::string::String\)/u);assert.doesNotMatch(result.rust,/return value\.to_owned\(\)/u);
 });
 test(family+' branch exits, ownership phi and loop reinitialization keep only continuing paths live',limits,async()=>{
  const prefix=header+'/** @param {boolean} flag @param {string} input */\n',source=prefix+`export function branch(flag,input){let values=made();if(flag){const moved=pushed(values,repeat(input,1n));return length(moved);}else{values=pushed(values,repeat('else',1n));}return length(values);}
/** @param {string} input */
export function looped(input){let values=made();for(let index=0n;index<3n;index+=1n){values=pushed(values,repeat(input,1n));}return length(values);}
`,{api,result}=translated(family,source),token=await api.prepareOwnedOutcomeRuntime(result.program);assert.equal(api.evaluateOwnedOutcome(result.program,'branch',[true,'x'],token),1n);assert.equal(api.evaluateOwnedOutcome(result.program,'branch',[false,'x'],token),1n);assert.equal(api.evaluateOwnedOutcome(result.program,'looped',['x'],token),3n);
 });
 test(family+' refuses aliases, optional payload double moves, incomplete branches and loop backedge loss',limits,()=>{
  const prefix=header+'/** @param {boolean} flag @param {string} input */\n';
  for(const body of [
   'const values=made();const alias=values;const moved=pushed(values,repeat(input,1n));return length(alias);',
   'let values=made();const moved=joined(values,values);return length(moved);',
   'let values=made();if(flag){const moved=pushed(values,repeat(input,1n));}return length(values);',
   'let values=made();for(let index=0n;index<3n;index+=1n){const moved=pushed(values,repeat(input,1n));}return 0n;',
   'const text=repeat(input,1n);const a=pushed(made(),text);const b=pushed(made(),text);return length(b);',
   'const option=at(pushed(made(),repeat(input,1n)),0n);if(option.$===\'Some\'){const a=pushed(made(),option.field0);return pushed(made(),option.field0);}else{return made();}',
   'let text=repeat(input,1n);const loan=trim(text);text=repeat(input,2n);return bytes(loan);',
   'const text=repeat(input,1n);return trim(text);',
  ])assert.throws(()=>translated(family,prefix+'export function refused(flag,input){'+body+'}'));
 });
 test(family+' per-call loans survive later nested move and restore attempts',limits,()=>{
  const helper=header+`/** @param {Parameters<typeof length>[0]} input @param {Parameters<typeof pushed>[0]} other */
export function observed(input,other){const checked=length(input);const moved=truncated(other,18446744073709551615n);return length(input);}
`;
  assert.throws(()=>translated(family,helper+'export function refused(){let values=made();return observed(values,joined(values,made()));}'));
 });
 test(family+' actual complete source, original profile refusals and private reissue cannot be bypassed by metadata',limits,()=>{
  const source=header+'export function selected(){return at(made(),0n);}',{api,data,result}=translated(family,source),old=family==='outcome'?originalOutcome:originalCancellation;
  assert.throws(()=>old.translateOwnedOutcomeJavaScript(source,{context:old.createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));
  for(const missing of ['src/translation_owned_text_vectors_core.rs','runtime/owned-text-vector-runtime.mjs','runtime/owned-text-vector-runtime.d.mts'])assert.throws(()=>api.createOwnedOutcomeContext({...data,files:data.files.filter(row=>row.path!==missing)}));
  const fake=JSON.parse(JSON.stringify(result.program));fake[0].body[0].value.name='router_owned_text_vec_len';fake[0].privateCallerBindingQualified=true;assert.throws(()=>(family==='outcome'?emitOutcome:emitCancellation)(fake,'rust'));
  assert.throws(()=>api.createOwnedOutcomeContext({...data,nativeTypeOwnerQualified:true}));assert.throws(()=>api.readOwnedOutcomeMeta(result.meta.replace('text-vector-source-document','forged-source-document'),{context:api.createOwnedOutcomeContext(data)}));
 });
 test(family+' original TypeScript caller passes through lossless projection and fresh typed-source reissue',limits,()=>{
  const source=header+`export function typed(input: Parameters<typeof pushed>[1]): ReturnType<typeof at>{const values=pushed(made(),input);return at(values,0n);}`,api=apiFor(family),data=ownedTextVectorReceivingData(family,source,'typed.mts'),result=api.translateOwnedOutcomeTypeScript(source,{context:api.createOwnedOutcomeContext(data),sourcePath:'typed.mts'});
  assert.equal(result.originalTypeScript,source);assert.equal(result.ownedCollectionTypeScriptHistory.sourceAuthority,false);assert.match(result.rust,/input: ::std::string::String/u);assert.match(result.rust,/Option<::std::string::String>/u);assert.equal(result.runtimeParity,false);
 });
}
test('complete caller source copies retain ordered language/repository substitutions and source inverses',limits,()=>{
 const plan=prepareOwnedTextVectorCallerSources();assert.ok(plan.files.length>=24);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);
});
