import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';import {compileCurrentBridgeControls} from './original-core-bridge-fixture.mjs';
const root=new URL('../../../',import.meta.url),hash=text=>createHash('sha256').update(text).digest('hex'),read=file=>readFileSync(new URL(file,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const original=file=>{const source=read(file),result=translateProject({entry:file,paths:[file],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.sources.find(row=>row.source===file).sha256,hash(source));return result;};
let retainedBytes=0;
function retain(name,value){
  const folder=process.env.ROUTER_ORIGINAL_INTO_VECTOR_DIR;if(!folder)return;
  const raw=Buffer.from(JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n'),stored=gzipSync(raw);
  assert.ok(raw.length<=67108864,'bounded complete Into packet');retainedBytes+=stored.length;assert.ok(retainedBytes<=134217728,'bounded complete Into evidence');
  mkdirSync(folder,{recursive:true});writeFileSync(join(folder,name+'.json.gz'),stored,{flag:'wx'});
}
function authoredAnonymousControl(originalResult){
  const file='src/bridge_request.rs',parent=read(file),name='untranslatable_responses_state';
  assert.equal(originalResult.meta.sources.find(row=>row.source===file).sha256,hash(parent));
  const before=transportConcreteSyntaxSource(parent,{language:'Rust'}),beforeWire=serializeConcreteSyntaxMeta(before.document),reparsed=transportConcreteSyntaxMeta(beforeWire);
  assert.equal(before.source,parent);assert.equal(reparsed.source,parent);
  const items=sourceItems(reparsed.source),matches=items.filter(item=>item.term==='use'&&parent.slice(item.start,item.end)==='use base64::Engine as _;');assert.equal(matches.length,1,'one complete actual anonymous import');
  const item=matches[0],expected=parent.slice(item.start,item.end),replacement='use std::fmt::Display as _;',selected={source:file,span:[item.start,item.end],sourceText:expected,sha256:hash(expected),tokens:item.tokens};
  const originals=items.filter(item=>item.term==='fn'&&item.name===name);assert.equal(originals.length,1);const originalItem=originals[0],declaration=parent.slice(originalItem.start,originalItem.end);
  const language=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:[{id:'into-negative:retain-complete-language-cst',edits:[]}],repositoryRules:[]}),languageWire=serializeConcreteSyntaxMeta(language.value),languageReparsed=transportConcreteSyntaxMeta(languageWire);assert.equal(languageReparsed.source,parent);
  const repository=applyConcreteSyntaxSubstitutions(languageReparsed.document,{languageRules:[],repositoryRules:[{id:'into-negative:author-independent-anonymous-route',edits:[{span:selected.span,expected,replacement}]}]}),afterWire=serializeConcreteSyntaxMeta(repository.value),after=transportConcreteSyntaxMeta(afterWire),authored=after.source;
  const afterEnd=item.start+replacement.length,wanted=parent.slice(0,item.start)+replacement+parent.slice(item.end);assert.equal(authored,wanted);
  const mapping=[{kind:'equal',before:[0,item.start],after:[0,item.start]},{kind:'substitution',before:[item.start,item.end],after:[item.start,afterEnd],expected,replacement},{kind:'equal',before:[item.end,parent.length],after:[afterEnd,authored.length]}];
  for(const row of mapping)if(row.kind==='equal')assert.equal(parent.slice(...row.before),authored.slice(...row.after));
  const inverse=applyConcreteSyntaxSubstitutions(after.document,{languageRules:[{id:'into-negative:retain-authored-language-cst',edits:[]}],repositoryRules:[{id:'into-negative:restore-complete-original-parent',edits:[{span:[item.start,afterEnd],expected:replacement,replacement:expected}]}]}),inverseWire=serializeConcreteSyntaxMeta(inverse.value),inverseReparsed=transportConcreteSyntaxMeta(inverseWire);assert.equal(inverseReparsed.source,parent);assert.equal(hash(inverseReparsed.source),hash(parent));
  for(const phase of [language,repository,inverse])assert.deepEqual(phase.trace.map(row=>row.phase),['language','repository']);
  const afterItems=sourceItems(authored).filter(item=>item.term==='fn'&&item.name===name);assert.equal(afterItems.length,1);assert.equal(authored.slice(afterItems[0].start,afterItems[0].end),declaration,'complete actual function and attributes unchanged');
  retain('02-complete-original-and-authored-source-cst',{scope:'authored whole-parent negative; not unchanged-module equivalence',parent,originalResult,file,selected,originalItem,declaration,before,beforeWire,reparsed,language,languageWire,languageReparsed,repository,afterWire,after,mapping,inverse,inverseWire,inverseReparsed,cargo:{manifest:read('Cargo.toml'),lock:read('Cargo.lock')},compilationProfile:PRODUCTION_PROFILE});
  const result=translateProject({entry:file,paths:[file],readSource:()=>authored,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  retain('03-complete-authored-anonymous-route-result',{scope:'explicit authored whole-parent negative only',file,parent,authored,originalSourceSha256:hash(parent),authoredSourceSha256:hash(authored),result});
  assert.equal(result.meta.sources.find(row=>row.source===file).sha256,hash(authored));
  const refusal=result.meta.refused.find(row=>row.name===name);assert.ok(refusal);assert.match(refusal.message,/source conversion namespace.*anonymous trait/u);assert.match(refusal.message,/standard-library anonymous trait reexport lacks its original route source/u);assert.equal(result.meta.executable.some(row=>row.name===name),false);
}
test('the two original whole-file bridge controls gain ordinary functions rather than generated source owners',()=>{
  const standalone=original('src/bridge_controls.rs'),{result}=compileCurrentBridgeControls(standalone);for(const name of ['untranslatable_moderation','untranslatable_chat_prediction']){const qualified='bridge_controls.'+name;assert.ok(result.meta.executable.some(row=>row.name===qualified&&row.term==='fn'));assert.equal(result.meta.refused.some(row=>row.name===qualified),false);}assert.equal(result.meta.runtimeParity,false);assert.ok(standalone.meta.refused.some(row=>row.name==='validate_responses_resource_selectors'));
});
test('remaining original borrowed aggregate and anonymous conversion contexts retain explicit barriers',()=>{
  const result=original('src/bridge_request.rs'),refusal=result.meta.refused.find(row=>row.name==='untranslatable_responses_state');retain('01-complete-current-original-refusal',{source:read('src/bridge_request.rs'),result,refusal});assert.ok(refusal);assert.equal(refusal.message,'source conversion namespace: Original external trait source: original outer item has an unproved attribute producer');assert.equal(result.meta.executable.some(row=>row.name==='untranslatable_responses_state'),false);authoredAnonymousControl(result);
  const safety=original('src/safety_identifier.rs');for(const name of ['validate_openai_value','validate_openai_user_value','anthropic_user_id'])assert.ok(safety.meta.refused.some(row=>row.name===name));
});
test('original GitHub conversion does not waive derive namespace or later Default obligations',()=>{
  const result=original('src/github_proxy.rs');assert.ok(result.meta.refused.some(row=>row.name.endsWith('with_credential')||row.name.endsWith(Buffer.from('with_credential').toString('hex'))));assert.equal(result.meta.checkedMethods.some(row=>row.name==='GitHubProxyConfig.with_credential'),false);
});
