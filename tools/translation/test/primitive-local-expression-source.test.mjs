// Independent primitive initializer expression regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {primitiveLocalInitializerEnd,readPrimitiveLocalExpression} from '../primitive-local-expression-source.mjs';
import {readPrimitiveAliasOperand,createPrimitiveLocalArgumentSource} from '../primitive-local-argument-source.mjs';
import {createChronologicalLocalSource} from '../chronological-local-source.mjs';
import {proposeCoreIntegerMethodCorpus as ordinary} from '../migrate-core-integer-methods.mjs';
import {proposeCoreIntegerMethodCorpus as sourceBound} from '../source-bound-owned-migrate-core-integer-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {preparePrimitiveLocalExpressionSources} from '../prepare-primitive-local-expression-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},bindings=new Map([['value','u64'],['signed','i64'],['byte','u8']]),read=(source,declared=null)=>readPrimitiveLocalExpression(tokens(source),bindings,{readAtom:readPrimitiveAliasOperand,declared});
test('only complete matching native domains supply expression DATA without evaluating arithmetic or granting effects',limits,()=>{
 for(const [source,wanted,declared]of [['value+1','u64'],['1+value*2','u64'],['(signed-1)/2','i64'],['-signed+i64::MIN','i64'],['!value&255','u64'],['value<<1','u64'],['value>>1','u64'],['value^u64::MAX','u64'],['((value+1))','u64'],['255+1','u8','u8'],['-9223372036854775808','i64','i64'],['340282366920938463463374607431768211455','u128','u128']])assert.equal(read(source,declared??null)?.kind,wanted,source);
 for(const [source,declared]of [['1+2'],['value+signed'],['value+18446744073709551616'],['value==0'],['value>0'],['value as i64'],['unknown()+value'],['value.method()'],['bytes[0]'],['-value'],['1_f64'],['value||value'],['value+=1'],['-0','u64'],['-1','u64']])assert.equal(read(source,declared??null),null,source);assert.equal(read('value/0')?.kind,'u64','source domain DATA cannot evaluate or erase a native division-by-zero effect');assert.equal(read('value')?.binding,'value');assert.equal(read('(value+1)')?.bridge,'complete-native-primitive-expression');
});
test('complete initializer selection charges real tokens retains grouping and has unchanged hard bounds',limits,()=>{
 const rows=tokens('(value+1)*2;later();');let cells=0;const end=primitiveLocalInitializerEnd(0,rows,()=>cells++);assert.equal(rows[end].text,';');assert.equal(cells,end+1);for(const source of ['(value+1];','{value+1};','value+1','('.repeat(65)+'value'+')'.repeat(65)+';']){const input=tokens(source);if(source.startsWith('('.repeat(65)))assert.equal(read(source.slice(0,-1)),null);else assert.equal(primitiveLocalInitializerEnd(0,input,()=>{}),null,source);}assert.equal(readPrimitiveLocalExpression(tokens('value+'.repeat(140)+'1'),bindings,{readAtom:readPrimitiveAliasOperand}),null);
 assert.throws(()=>createChronologicalLocalSource(tokens('let alias=value;probe(alias);'),new Map(),{initializerSizes:[1],initializerEnd:()=>999,readOperand:()=>null,acceptResult:()=>null,aliasKind:'source',resultKind:'source'}).at(20),/bounded complete initializer/u);
});
test('actual expression aliases appear at their semicolons retain original spans and expire with real body scopes',limits,()=>{
 const source='let next=value+1;probe(next);{let inner=(next*2);probe(inner);}probe(inner);let mut changed=value+1;probe(changed);',rows=tokens(source),provider=createPrimitiveLocalArgumentSource(rows,new Map([['value','u64']])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries()){assert.equal(provider.at(probe.position).get(probe.name),at<2?'u64':undefined);const evidence=provider.evidence(probe.name);if(evidence){assert.equal(evidence.semanticAuthority,false);assert.equal(evidence.sourceAuthority,false);assert.equal(evidence.bridge,'complete-native-primitive-expression');assert.equal(source.slice(...evidence.initializerSpan),at===0?'value+1':'(next*2)');}}assert.throws(()=>provider.at(0),/monotonic/u);
});
const original=[
 'pub fn step(value:u64)->u64{let next=value+1;next.saturating_mul(2)}',
 'pub fn calculate(value:u64)->u64{let left=1+value*2;let next=left/2;next.wrapping_add(1)}',
 'pub fn signed(value:i64)->i64{let magnitude=-(value+1);magnitude.saturating_abs()}',
 'pub fn constant()->u64{let initial:u64=1+2*3;initial.saturating_mul(2)}',
].join('\n');
function input(source=original){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_integer_core;\n// Ω😀 original expression coordinates\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
for(const [name,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(name+' method adoption retains actual initializer expression bytes and exact source inverses',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,4);for(const text of ['let next=value+1;','let left=1+value*2;let next=left/2;','let magnitude=-(value+1);','let initial:u64=1+2*3;'])assert.ok(row.after.source.includes(text));for(const selected of row.selections){assert.equal(selected.localReceiverSource.semanticAuthority,false);assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);}
});
for(const [name,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(name+' unproved mixed cast comparison mutable and call expressions remain outside the alias lane',limits,()=>{
 for(const initializer of ['value+other','value as i64','value==0','unknown()+value','18446744073709551616+value']){const request=input('pub fn f(value:u64,other:i64)->u64{let alias='+initializer+';alias.saturating_add(1)}');assert.equal(rejoin(propose(request),request.files['src/lib.rs']).edits.length,0,initializer);}
});
test('the existing integer bulk stage receives full original callers with independent JS strict TS and native-boundary expectations',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,4);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['step','calculate','signed','constant'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.step(0n),2n);assert.equal(api.step(1n),4n);assert.equal(api.step(18446744073709551614n),18446744073709551615n);for(const value of [0n,1n,100n])assert.equal(api.calculate(value),value+1n);for(const [value,wanted]of [[-2n,1n],[-1n,0n],[0n,1n],[1n,2n]])assert.equal(api.signed(value),wanted);assert.equal(api.constant(),14n);},{childTimeoutMs:20000});
});
test('four complete original-owner source equations retain original implementations both phases and full inverses',limits,()=>{
 const plan=preparePrimitiveLocalExpressionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
