// Independent native-count alias regression SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createTextLocalArgumentSource,readTextAliasOperand} from '../text-local-argument-source.mjs';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {proposeCoreTextMethodCorpus as proposeSourceBoundText} from '../source-bound-owned-migrate-core-text-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {prepareTextCountLocalSources} from '../prepare-text-count-local-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('usize count DATA comes from explicit domains bounded native literals and known source text lengths',limits,()=>{
 for(const value of ['0_usize','1usize','4_294_967_295_usize'])assert.equal(readTextAliasOperand(tokens(value),new Map())?.kind,'usize-count');for(const value of ['1','1_u64','-1_usize','4294967296_usize','unknown()'])assert.equal(readTextAliasOperand(tokens(value),new Map()),null,value);assert.equal(readTextAliasOperand(tokens('value.len()'),new Map([['value','str']]))?.kind,'usize-count');assert.equal(readTextAliasOperand(tokens('value.len()'),new Map([['value','custom']])),null);
 const source='let alias=count;probe(alias);{let hidden=1_usize;probe(hidden);}probe(hidden);let wrong:&str=value.len();probe(wrong);',rows=tokens(source),provider=createTextLocalArgumentSource(rows,new Map([['count','usize-count'],['value','str']])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries())assert.equal(provider.at(probe.position).get(probe.name),['usize-count','usize-count',undefined,undefined][at]);
});
const source=[
 'pub fn repeated(value:&str,count:usize)->String{value.repeat(count)}',
 'pub fn alias(value:&str,count:usize)->String{let amount=count;value.repeat(amount)}',
 'pub fn literal(value:&str)->String{let amount=3_usize;value.repeat(amount)}',
 'pub fn length(value:&str)->String{let amount=value.len();value.repeat(amount)}',
 'pub fn replaced(value:&str,count:usize)->String{value.replacen("x","$&",count)}',
].join('\n');
for(const [name,propose]of [['ordinary',proposeCoreTextMethodCorpus],['source-bound',proposeSourceBoundText]])test(name+' native count arguments preserve once-only source casts and full inverses',limits,()=>{
 const request=input(source),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,5);assert.ok(row.after.source.includes('repeat(value, (count as u64))'));assert.ok(row.after.source.includes('repeat(value, (amount as u64))'));assert.ok(row.after.source.includes('replacen(value, "x", "$&", (count as u64))'));assert.ok(row.after.source.includes('let amount=value.len();'));for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}
});
for(const [name,propose]of [['ordinary',proposeCoreTextMethodCorpus],['source-bound',proposeSourceBoundText]])test(name+' unknown u64 forward scoped and mismatched count aliases remain unproved',limits,()=>{
 for(const body of ['pub fn f(value:&str,count:u64)->String{value.repeat(count)}','pub fn f(value:&str)->String{let count=1;value.repeat(count)}','pub fn f(value:&str)->String{{let count=1_usize;}value.repeat(count)}','pub fn f(value:&str)->String{let count:&str=value.len();value.repeat(count)}','pub fn f(value:&str)->String{let count=4294967296_usize;value.repeat(count)}']){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
});
test('fixed text bulk stage receives native count and UTF-8 length behavior in JS and strict TS',limits,async()=>{
 const request=input(source),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,5);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['repeated','alias','literal','length','replaced'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.repeated('é😀',2n),'é😀é😀');assert.equal(api.repeated('é😀',0n),'');assert.equal(api.alias('x',3n),'xxx');assert.equal(api.literal('x'),'xxx');assert.equal(api.length('é'),'éé');assert.equal(api.length('😀'),'😀😀😀😀');assert.equal(api.length(''),'');assert.equal(api.replaced('xxx',2n),'$&$&x');},{childTimeoutMs:20000});
});
test('three complete source equations retain original helpers selector and both source inverses',limits,()=>{
 const plan=prepareTextCountLocalSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
