// Independent full JS/TS/meta/interpreter/canonical inverse SOURCE. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as outcome from '../owned-text-vector-outcome.mjs';
import * as cancellation from '../owned-text-vector-cancellation.mjs';
import {translateOwnedOutcomeRust} from '../owned-text-vector-outcome-rust.mjs';
import {translateOwnedCancellationRust} from '../owned-text-vector-cancellation-rust.mjs';
import {ownedTextVectorReceivingData} from './owned-text-vector-receiving-data.mjs';
import {ownedTextVectorLiteralRuntimeSources} from '../../owned-text-vector-literal-runtime-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},header="import {router_owned_text_vec_literal as literal} from './runtime/owned-text-vector-literal-runtime.mjs';\nimport {router_owned_text_vec_len as length,router_owned_text_vec_get as at} from './runtime/owned-text-vector-runtime.mjs';\n";
function dataFor(family,source,path='caller.mjs'){
 const data=ownedTextVectorReceivingData(family,source,path),files=new Map(data.files.map(row=>[row.path,row]));for(const row of ownedTextVectorLiteralRuntimeSources(data.runtimeRoot,data.declarationRoot)){const old=files.get(row.path);if(old&&old.source!==row.source)throw new TypeError('Complete literal fixture source conflict');files.set(row.path,row);}return {...data,files:[...files.values()]};
}
for(const family of ['outcome','cancellation']){
 const api=family==='outcome'?outcome:cancellation,translate=source=>{const data=dataFor(family,source),context=api.createOwnedOutcomeContext(data);return {data,context,result:api.translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'})};};
 test(family+' native String operands move once while actual borrowed str operands copy explicitly',limits,async()=>{
  const source=header+`/** @param {Parameters<typeof literal>[0]} first @param {Parameters<typeof literal>[0]} second */
export function owned(first,second){return literal(first,second);}
/** @param {string} input */
export function copied(input){return literal(input,input);}
export function constants(){return literal('', 'é', '🦀');}
export function empty(){return literal();}
`,{data,context,result}=translate(source),token=await api.prepareOwnedOutcomeRuntime(result.program);
  assert.deepEqual(api.evaluateOwnedOutcome(result.program,'owned',['é','🦀'],token),['é','🦀']);assert.deepEqual(api.evaluateOwnedOutcome(result.program,'copied',['x'],token),['x','x']);assert.deepEqual(api.evaluateOwnedOutcome(result.program,'constants',[],token),['','é','🦀']);assert.deepEqual(api.evaluateOwnedOutcome(result.program,'empty',[],token),[]);assert.match(result.rust,/vec_text_from_slice\(&\[/u);assert.match(result.typescript,/owned-text-vector-literal-runtime\.mjs/u);
  const read=api.readOwnedOutcomeMeta(result.meta,{context});assert.equal(api.emitOwnedOutcomeRust(read),result.rust);const path='src/owned_text_literals.rs',nativeData={...data,files:data.files.concat([{path,source:result.rust}])},inverse=(family==='outcome'?translateOwnedOutcomeRust:translateOwnedCancellationRust)(result.rust,{context:api.createOwnedOutcomeContext(nativeData),sourcePath:path,javascriptPath:'caller.mjs'});assert.equal(sameRustSourceSyntax(inverse.rust,result.rust),true);assert.equal(inverse.runtimeParity,false);assert.equal(result.wholeRouterSynchronization,false);
 });
 test(family+' refuses owned String aliases, duplicate operands, spread syntax, excess arity and stale wrapper bytes',limits,()=>{
  const doc='/** @param {Parameters<typeof literal>[0]} input */\n';for(const body of ['return literal(input,input);','const alias=input;return literal(alias,input);','return literal(...[input]);','const values=literal(input);return literal(input);'])assert.throws(()=>translate(header+doc+'export function bad(input){'+body+'}'));
  assert.throws(()=>translate(header+'export function bad(){return literal('+Array(65).fill("'x'").join(',')+');}'));const source=header+doc+'export function selected(input){return literal(input);}',data=dataFor(family,source);const path=data.runtimeRoot+'/owned-text-vector-literal-runtime.mjs';data.files=data.files.map(row=>row.path===path?{...row,source:row.source+'\n// stale\n'}:row);assert.throws(()=>api.translateOwnedOutcomeJavaScript(source,{context:api.createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));
 });
 test(family+' original typed literals retain the complete typed source and checked projection history',limits,()=>{
  const source=header+'export function typed(input: Parameters<typeof literal>[0]): ReturnType<typeof literal>{return literal(input);}',data=dataFor(family,source,'typed.mts'),result=api.translateOwnedOutcomeTypeScript(source,{context:api.createOwnedOutcomeContext(data),sourcePath:'typed.mts'});assert.equal(result.originalTypeScript,source);assert.equal(result.ownedCollectionTypeScriptHistory.sourceAuthority,false);assert.match(result.rust,/input: ::std::string::String/u);assert.equal(result.rustExecuted,false);
 });
}
