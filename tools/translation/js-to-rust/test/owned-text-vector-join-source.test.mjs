// Complete original JS/TS -> private helper/check/meta/inverse case sources. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as outcome from '../owned-text-vector-outcome.mjs';
import * as cancellation from '../owned-text-vector-cancellation.mjs';
import {proposeOwnedTextVectorJoins as propose} from '../owned-text-vector-join-proposals.mjs';
import {ownedTextVectorLiteralReceivingData as receiving} from './owned-text-vector-literal-receiving-data.mjs';
import {targets} from './primitive-slice-adoption-targets.mjs';
import {translateOwnedOutcomeRust} from '../owned-text-vector-outcome-rust.mjs';
import {translateOwnedCancellationRust} from '../owned-text-vector-cancellation-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},select=[{function:'joined',local:'values'}];
function source(typed=false,argument='separator'){return `import {router_owned_text_vec_literal as literal} from './runtime/owned-text-vector-literal-runtime.mjs';
import {router_text_to_owned as copy} from './runtime/text-runtime.mjs';
${typed?'':'/** @param {string} input @param {string} separator */'}
export function joined(input${typed?':string':''},separator${typed?':string':''}){const values=literal(copy(input),copy('é'));return values /* receiver */ .join(${argument});}
`;}
for(const family of ['outcome','cancellation']){
 const api=family==='outcome'?outcome:cancellation;
 test(family+' whole helper and selected caller produce shared JS/strict TS/interpreter results and canonical Rust inverse',limits,async t=>{
  const before=source(),data=receiving(family,before),proposal=propose(data,{family,sourcePath:'caller.mjs',vectors:select}),token=await api.prepareOwnedOutcomeRuntime(proposal.program),modules=await targets(t,data,proposal);assert.equal(proposal.files[0].history.inverse,before);assert.equal(proposal.joins,1);assert.ok(proposal.files[0].after.includes('/* receiver */'));for(const input of ['', '🦀\u0000文'])for(const separator of ['', '\n\n', 'é']){const expected=[input,'é'].join(separator);for(const target of modules)assert.equal(target.joined(input,separator),expected);assert.equal(api.evaluateOwnedOutcome(proposal.program,'joined',[input,separator],token),expected);}assert.equal(proposal.originalArrayCoercionEquivalent,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.maxTextUtf8Bytes,1048576);
  const after=proposal.files[0].after,nativeData=receiving(family,after);nativeData.files.push({path:'caller.rs',source:proposal.rustCandidate});const inverse=(family==='outcome'?translateOwnedOutcomeRust:translateOwnedCancellationRust)(proposal.rustCandidate,{context:api.createOwnedOutcomeContext(nativeData),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.equal(sameRustSourceSyntax(inverse.rust,proposal.rustCandidate),true);
 });
 test(family+' written TypeScript and default comma separator retain actual helper utility witnesses',limits,()=>{
  const before=source(true,''),proposal=propose(receiving(family,before,'caller.mts'),{family,sourcePath:'caller.mts',vectors:select});assert.ok(proposal.helperSource.includes('Parameters<typeof routerJoin_length>[0]'));assert.ok(proposal.helperSource.includes('ReturnType<typeof routerJoin_copy>'));assert.ok(proposal.files[0].after.includes('values, ",")'));assert.equal(proposal.files[0].inverse,before);assert.equal(proposal.defaultSeparator,',');
 });
 test(family+' malformed payload/separator and untrusted selection metadata never authorize a String helper',limits,()=>{
  const original=source(),data=receiving(family,original),run=(text,vectors=select)=>propose(receiving(family,text),{family,sourcePath:'caller.mjs',vectors});assert.throws(()=>run(original.replace('copy(input),copy(\'é\')','true')));assert.throws(()=>run(original.replace('.join(separator)','.join(2n)')));assert.throws(()=>run(original.replace('.join(separator)','.join(...[separator])')));assert.throws(()=>run(original,[...select,...select]));assert.throws(()=>propose(data,{family,sourcePath:'caller.mjs',vectors:new Array(1)}));let read=false;const rows=[select[0]];Object.defineProperty(rows,'0',{enumerable:true,get(){read=true;return select[0];}});assert.throws(()=>propose(data,{family,sourcePath:'caller.mjs',vectors:rows}));assert.equal(read,false);
 });
 test(family+' complete helper refuses bounded output overflow independently of the original array coercion contract',limits,async()=>{
  const before=source(),proposal=propose(receiving(family,before),{family,sourcePath:'caller.mjs',vectors:select}),token=await api.prepareOwnedOutcomeRuntime(proposal.program);assert.throws(()=>api.evaluateOwnedOutcome(proposal.program,'joined',['x'.repeat(1048576),''],token));assert.throws(()=>api.evaluateOwnedOutcome(proposal.program,'joined',['','x'.repeat(1048577)],token));
 });
}

for(const family of ['outcome','cancellation'])test(family+' full 4096-element and 1MiB UTF8 boundary retains a complete synchronous deadline',limits,async t=>{
 const api=family==='outcome'?outcome:cancellation,before=`import {router_owned_text_vec_len as length} from './runtime/owned-text-vector-runtime.mjs';
/** @param {Parameters<typeof length>[0]} input @param {string} separator */
export function joined(input,separator){const guard=length(input);const values=input;return values.join(separator);}
`,proposal=propose(receiving(family,before),{family,sourcePath:'caller.mjs',vectors:select}),token=await api.prepareOwnedOutcomeRuntime(proposal.program),input=Object.freeze(Array.from({length:4096},()=> 'x'.repeat(256))),expected='x'.repeat(1048576),started=performance.now(),actual=api.evaluateOwnedOutcome(proposal.program,'joined',[input,''],token),elapsed=performance.now()-started;t.diagnostic(JSON.stringify({family,completeCase:'4096-elements-1MiB-join',milliseconds:elapsed,deadlineMilliseconds:60000,executed:true}));assert.equal(actual,expected);assert.ok(elapsed<60000,'complete synchronous join must finish inside its original deadline');assert.equal(api.evaluateOwnedOutcome(proposal.program,'joined',[Object.freeze([]),''],token),'');assert.throws(()=>api.evaluateOwnedOutcome(proposal.program,'joined',[input,'x'],token));assert.throws(()=>api.evaluateOwnedOutcome(proposal.program,'joined',[Object.freeze(Array.from({length:4097},()=> '')),''],token));assert.throws(()=>api.evaluateOwnedOutcome(proposal.program,'joined',[Object.freeze(['\ud800']),''],token));
});
