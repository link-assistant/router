// Independent source, receiving and refusal case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeNativeJsonOptionalPathReader as propose,proposeNativeJsonOptionalPathReaders as bulk} from '../native-json-optional-path-reader-proposals.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {prepareNativeJsonOptionalPathReaderSources} from '../prepare-native-json-optional-path-reader-sources.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';

const limits={timeout:60000},options={sourcePath:'rust/src/example.rs',function:'choose'};
const catalog=readFileSync(new URL('../../../rust/src/model_catalog_errors.rs',import.meta.url),'utf8');
function source(kind='text',name='choose',prefix='let value: serde_json::Value = serde_json::from_str(body).ok()?;\n    let error = value.get("error")?;'){
 const result={text:'String',bool:'bool',u64:'u64',i64:'i64'}[kind],accessor=kind==='text'?'as_str().map(str::to_owned)':'as_'+kind+'()';
 return 'pub fn '+name+'(body: &str) -> Option<'+result+'> {\n    '+prefix+'\n    [&["details","value"][..], &["value"][..]].into_iter().find_map(|path| path.iter().try_fold(error, |node, key| node.get(key))?.'+accessor+')\n}\n';
}
for(const kind of ['text','bool','u64','i64'])test(kind+' optional parse/required child/tail search composes actual phase chronology and whole inverses',limits,()=>{
 const before=source(kind),proposal=propose(before,options),after=proposal.files[0].after;
 assert.equal(proposal.files[0].before,before);assert.equal(proposal.files[0].inverse,before);assert.equal(proposal.files[0].history.inverse,before);
 assert.deepEqual(proposal.pipelineOrder,['literal-path-search','optional-reader-prefix']);assert.equal(proposal.pipelines.length,2);
 assert.deepEqual(proposal.pipelines.map(row=>row.ruleTrace.map(stage=>stage.phase)),[['language','repository'],['language','repository']]);
 assert.equal(proposal.pipelines[0].files[0].after,proposal.pipelines[1].before);
 for(const row of proposal.pipelines){assert.equal(transportConcreteSyntaxMeta(row.languageConcreteSyntax).source,row.languageSource);assert.deepEqual(row.concreteTrace.map(stage=>stage.phase),['language','repository']);}
 assert.equal(transportConcreteSyntaxMeta(proposal.pipelines[1].concreteSyntax).source,after);
 assert.ok(after.includes('crate::translation_core::json_parse(body)?'));
 assert.ok(after.includes('crate::translation_json_fields_core::json_field(&value, "error")?'));
 assert.ok(after.includes('crate::translation_json_fields_core::json_'+kind+'_field2(error, "details", "value")'));
 assert.equal(after.includes('serde_json::from_str'),false);assert.equal(after.includes('.get('),false);assert.equal(after.includes('.find_map('),false);
 assert.equal(proposal.requiresWholeOriginalSemanticReissue,true);
 for(const flag of ['originalBodyEquivalenceQualified','sourceInstalled','nativeInstalled','productionSelected','sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','receivingQualified','runtimeParity','wholeRouterSynchronization','runtimeExecuted','rustExecuted','crossInvocationCache'])assert.equal(proposal[flag],false);
 assert.ok(proposal.metadataTextUnits>0&&proposal.metadataTextUnits<=16777216);
});
test('actual catalog source keeps the original sibling functions and complete source history',limits,()=>{
 const proposal=propose(catalog,{sourcePath:'rust/src/model_catalog_errors.rs',function:'resource_error_code'}),after=proposal.files[0].after;
 assert.equal(proposal.pipelines[1].selections.length,2);assert.equal(proposal.files[0].history.inverse,catalog);
 const start=catalog.indexOf('/// Whether a catalog failure');assert.ok(after.endsWith(catalog.slice(start)));
 assert.ok(after.includes('let value: Value = crate::translation_core::json_parse(body)?;'));
 assert.ok(after.includes('json_text_field2(error, "details", "error_code")'));
 assert.ok(after.indexOf('"details", "error_code"')<after.indexOf('json_text_field(error, "error_code")'));
 assert.equal(proposal.productionSelected,false);
});
test('successive required child reads distinguish the owned parse from borrowed children and retain raw key spelling',limits,()=>{
 const before=source('text','choose','let value = ::serde_json::from_str(body).ok()?;\n    let first = value.get(r#"λ😀"#)?;\n    let error = first.get("error")?;'),proposal=propose(before,options),after=proposal.files[0].after;
 assert.ok(after.includes('json_field(&value, r#"λ😀"#)?'));assert.ok(after.includes('json_field(first, "error")?'));assert.equal(after.includes('json_field(&first'),false);
 assert.equal(proposal.pipelines[1].selections[1].keyLiteral,'r#"λ😀"#');assert.equal(proposal.files[0].inverse,before);
});
test('fresh reader placeholder names cannot capture original module identifiers or literal contents',limits,()=>{
 const before='const router_rule_optional_json_parse: bool = true;\n'+source().replace('"error"','"router_rule_optional_json_field"'),proposal=propose(before,options);
 assert.ok(proposal.pipelines[1].languageSource.includes('router_rule_optional_json_parse_0(body)'));
 assert.ok(proposal.files[0].after.includes('const router_rule_optional_json_parse: bool = true;'));
 assert.ok(proposal.files[0].after.includes('json_field(&value, "router_rule_optional_json_field")'));
});
test('explicit multi-function/module batches keep every complete module and child pipeline',limits,()=>{
 const first=source('bool','first')+source('u64','second'),last='pub fn untouched()->bool{true}\n',input=[{path:'rust/src/a.rs',source:first},{path:'rust/src/b.rs',source:source('text','third')},{path:'rust/src/c.rs',source:last}],selected=[{sourcePath:'rust/src/a.rs',function:'first'},{sourcePath:'rust/src/a.rs',function:'second'},{sourcePath:'rust/src/b.rs',function:'third'}],proposal=bulk(input,selected);
 assert.equal(proposal.selectedFunctions,3);assert.equal(proposal.changedFiles,2);assert.equal(proposal.steps.length,3);assert.deepEqual(proposal.ruleTrace.map(row=>row.phase),['language','repository']);
 for(let index=0;index<input.length;index++){assert.equal(proposal.files[index].before,input[index].source);assert.equal(proposal.files[index].inverse,input[index].source);assert.equal(proposal.files[index].history.inverse,input[index].source);}
 assert.equal(proposal.files[2].after,last);assert.equal(proposal.sourceInstalled,false);assert.ok(proposal.metadataTextUnits<=33554432);
});
test('ambiguous/effectful/shadowed/dynamic/escaping reader shapes remain refused',limits,()=>{
 const before=source();for(const changed of [
  before.replace('let value:','let mut value:'),before.replace('serde_json::Value','Other'),before.replace('from_str(body)','from_str(body.clone())'),
  before.replace('from_str(body)','from_str::<serde_json::Value>(body)'),before.replace('let error = value','let value = value'),
  before.replace('value.get("error")','other.get("error")'),before.replace('value.get("error")','value.get(key)'),
  before.replace('let error =','side_effect(); let error ='),before.replace('.ok()?','.unwrap()'),before.replace('let value: serde_json::Value','let body: serde_json::Value'),
  before.replace('?.as_str().map(str::to_owned)','?.as_str()').replace('Option<String>','Option<&str>'),
  before.replace('let error = value.get("error")?;','let error = value.get("error")?; let error = value.get("again")?;'),
  before.replace('\n}', '; side_effect();\n}'),'#[test]\n'+before,before+before,
 ])assert.throws(()=>propose(changed,options));
 assert.throws(()=>bulk([{path:options.sourcePath,source:before}],[options,options]));
 const prefix=['let value = serde_json::from_str(body).ok()?;'];for(let index=0;index<17;index++)prefix.push('let '+(index===16?'error':'child'+index)+' = '+(index===0?'value':'child'+(index-1))+'.get("child")?;');
 assert.throws(()=>propose(source('text','choose',prefix.join('\n')),options));
});
test('request/batch preflight never invokes caller proxies accessors coercions or sparse array reads',limits,()=>{
 const before=source();let called=0;const getter={sourcePath:options.sourcePath,get function(){called++;return 'choose';}},proxy=new Proxy(options,{get(){called++;throw Error('no read');}}),coerce={toString(){called++;return 'choose';}};
 for(const request of [getter,proxy,{...options,function:coerce}])assert.throws(()=>propose(before,request));
 assert.throws(()=>bulk(new Proxy([{path:options.sourcePath,source:before}],{get(){called++;throw Error('no read');}}),[options]));
 assert.throws(()=>bulk([,{path:options.sourcePath,source:before}],[options]));assert.throws(()=>bulk([{path:'../escaped.rs',source:before}],[options]));assert.equal(called,0);
});
test('three complete implementation source equations preserve current sources phases and inverses',limits,()=>{
 const plan=prepareNativeJsonOptionalPathReaderSources();assert.equal(plan.files.length,3);assert.equal(plan.receivingExecuted,false);
 for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
});

// This independent receiving kernel is a bounded root adaptation of the selected
// complete function, not a claim that its original parent crate is admitted.
test('the actual proposed catalog reader kernel receives through JS and strict TS with independent JSON expectations',limits,async()=>{
 const proposal=propose(catalog,{sourcePath:'rust/src/model_catalog_errors.rs',function:'resource_error_code'}),after=proposal.files[0].after,owner=sourceItems(after).find(row=>row.term==='fn'&&row.name==='resource_error_code');
 const originalKernel=after.slice(owner.start,owner.end);assert.ok(originalKernel.startsWith('pub(super)'));
 const originalDocument=transportConcreteSyntaxSource(originalKernel,{language:'Rust'}),adaptation=applyConcreteSyntaxSubstitutions(originalDocument.document,{languageRules:[],repositoryRules:[{id:'receiving-kernel:explicit-root-visibility-adaptation',edits:[{span:[0,'pub(super)'.length],expected:'pub(super)',replacement:'pub'}]}]}),kernel=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(adaptation.value)).source;
 assert.equal(transportConcreteSourceEquations([{before:originalKernel,after:kernel,language:'Rust'}])[0].inverse,originalKernel);
 const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_json_fields_core;\nuse serde_json::Value;\n'+kernel,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_json_fields_core.rs':readFileSync(new URL('../../../rust/src/translation_json_fields_core.rs',import.meta.url),'utf8')};
 const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});
 assert.ok(result.meta.executable.some(row=>row.name==='resource_error_code'));
 const cases=[['{"error":{"details":{"error_code":"nested"},"error_code":"flat","code":"last"}}','nested'],['{"error":{"details":{"error_code":""},"code":"last"}}',''],['{"error":{"details":{"error_code":false},"error_code":"λ😀"}}','λ😀'],['{"error":{"error_code":0,"code":"last"}}','last'],['{"error":{"code":"first","code":"last"}}','last'],['{"error":null}',null],['{"error":[]}',null],['{}',null],['not json',null]];
 await verifyTypedTargets(result,api=>{for(const [body,expected]of cases)assert.deepEqual(api.resource_error_code(body),expected===null?{$:'None'}:{$:'Some',field0:expected});},{childTimeoutMs:20000});
 assert.equal(proposal.receivingQualified,false);assert.equal(proposal.productionSelected,false);
});
