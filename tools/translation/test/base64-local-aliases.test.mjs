// Independent chronological lexical alias/source regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createBase64LocalArgumentSource} from '../base64-local-argument-source.mjs';
import {readConcreteBase64Argument} from '../base64-argument-source.mjs';
import {proposeCoreBase64Corpus} from '../migrate-core-base64.mjs';
import {proposeCoreBase64Corpus as proposeSourceBoundBase64} from '../source-bound-owned-migrate-core-base64.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareBase64LocalAliasSources} from '../prepare-base64-local-alias-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),engine='base64::engine::general_purpose::',call=(method,value)=>'base64::Engine::'+method+'(&'+engine+'STANDARD,'+value+')';
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let restored=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);assert.equal(restored,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.equal(proposal.executableAdmission,false);return row;}
test('alias DATA follows declaration order exact initializer spans and nested lexical scopes without escaping them',limits,()=>{
 const source='probe(value);let first=value;probe(first);{let second=first.as_bytes();probe(second);}probe(second);',rows=tokens(source),provider=createBase64LocalArgumentSource(rows,new Map([['value','text']])),calls=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,argument:rows[at+2]}]:[]),expected=['text','text','bytes',null];for(const [index,row]of calls.entries()){const value=readConcreteBase64Argument([row.argument],provider.at(row.position));assert.equal(value?.kind??null,expected[index]);const evidence=provider.evidence(row.argument.text);if(evidence){assert.equal(evidence.sourceAuthority,false);assert.equal(evidence.semanticAuthority,false);assert.ok(Object.isFrozen(evidence.span));assert.ok(source.slice(...evidence.span).startsWith('let '));assert.ok(source.slice(...evidence.initializerSpan).length);}}assert.throws(()=>provider.at(0),/monotonic/u);
});
test('only a complete selected direct encode initializer acquires owned text DATA after its original semicolon',limits,()=>{
 const source='let encoded='+call('encode','value')+';probe(encoded);',rows=tokens(source),provider=createBase64LocalArgumentSource(rows,new Map([['value','text']])),start=rows.find(row=>row.text==='base64'),semicolon=rows.find(row=>row.text===';'),probe=rows.find(row=>row.text==='probe');assert.equal(provider.at(start.start).has('encoded'),false);provider.selectedCall({span:[start.start,semicolon.start],terminator:semicolon,method:'encode',operation:'base64_standard_encode_text'});assert.equal(provider.evidence('encoded'),null);assert.equal(provider.at(probe.start).get('encoded'),'owned-text');const evidence=provider.evidence('encoded');assert.equal(evidence.kind,'complete-selected-native-encode-alias');assert.equal(source.slice(...evidence.initializerSpan),call('encode','value'));assert.equal(evidence.originalTraitPermission,false);
});
for(const [name,propose]of [['ordinary',proposeCoreBase64Corpus],['source-bound',proposeSourceBoundBase64]])test(name+' complete aliases borrowed views and selected encode results flow through actual current source and both substitution phases',limits,()=>{
 const body='// aliases retain Ω😀 source offsets\n'+[
  'pub fn direct(value:&str)->String{let borrowed=value;let encoded='+call('encode','borrowed')+';encoded}',
  'pub fn bytes(value:String)->String{let moved=value;let raw=moved.as_bytes();let encoded='+call('encode','raw')+';encoded}',
  'pub fn literal()->String{let text="f";let encoded='+call('encode','text')+';encoded}',
  'pub fn roundtrip(value:&str)->Result<Vec<u8>,base64::DecodeError>{let encoded='+call('encode','value')+';let text=encoded.as_str();let decoded='+call('decode','text')+';decoded}',
 ].join('\n'),request=input(body),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,5,JSON.stringify(row.skipped));assert.deepEqual(row.selections.map(part=>part.ownedOperation),['base64_standard_encode_text','base64_standard_encode_bytes','base64_standard_encode_text','base64_standard_encode_text','base64_standard_decode_text']);const aliases=row.selections.filter(part=>part.localArgumentSource);assert.equal(aliases.length,4);for(const selected of aliases){assert.equal(selected.localArgumentSource.semanticAuthority,false);assert.equal(selected.originalTraitPermission,false);assert.ok(request.files['src/lib.rs'].slice(...selected.localArgumentSource.span).startsWith('let '));}assert.equal(row.selections.find(part=>part.function==='roundtrip'&&part.nativeOperation==='decode').localArgumentSource.originBinding,'encoded');
});
for(const [name,propose]of [['ordinary',proposeCoreBase64Corpus],['source-bound',proposeSourceBoundBase64]])test(name+' use-before-binding ended scope unknown expressions annotations and shadowing cannot become local source facts',limits,()=>{
 for(const body of [
  'pub fn test(value:&str)->String{let encoded='+call('encode','later')+';let later=value;encoded}',
  'pub fn test(value:&str)->String{{let hidden=value;}let encoded='+call('encode','hidden')+';encoded}',
  'pub fn test(value:&str)->String{let alias:String=value;let encoded='+call('encode','alias')+';encoded}',
  'pub fn test(value:&str)->String{let alias=value.to_owned();let encoded='+call('encode','alias')+';encoded}',
  'pub fn test(value:&str)->String{let alias=value;let alias=value;'+call('encode','alias')+'}',
  'pub fn test(value:&str)->String{let value=value;'+call('encode','value')+'}',
 ]){const request=input(body),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
});
test('the fixed existing bulk stage uses current lexical aliases without adding a privileged stage or namespace permit',limits,async()=>{
 const request=input('pub fn test(value:&str)->String{let alias=value;let encoded='+call('encode','alias')+';encoded}'),proposal=await proposeSourceBoundOwnedCoreStage('base64',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.equal(row.selections[0].localArgumentSource.originBinding,'value');
});
test('an actual adopted alias caller receives fresh whole-project JS and separately compiled strict TS behavior',limits,async()=>{
 const request=input('pub fn encode(value:&str)->String{let alias=value;let encoded='+call('encode','alias')+';encoded}'),proposal=proposeCoreBase64Corpus(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,1);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.ok(result.meta.executable.some(part=>part.name==='encode'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const [value,wanted]of [['',''],['f','Zg=='],['foo','Zm9v'],['Hello','SGVsbG8='],['😀','8J+YgA==']])assert.equal(api.encode(value),wanted);},{childTimeoutMs:20000});
});
test('four complete compiler equations retain full original sources native owners both phases and every inverse',limits,()=>{
 const plan=prepareBase64LocalAliasSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
