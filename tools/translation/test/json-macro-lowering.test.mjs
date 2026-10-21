import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from '../json-macro-features.mjs';
import {createJsonMacroContext,isJsonMacroContext,configureJsonMacroParser,sealJsonMacroCall} from '../json-macro-context.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {parseJsonMacroSyntax} from '../json-macro-syntax.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,jsonMacroDependencies:dependencies()});
const native=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};
const canonical=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
const collect=(node,predicate,result=[])=>{if(node&&typeof node==='object'){if(predicate(node))result.push(node);for(const [key,value]of Object.entries(node))if(!['type','jsonMacroProof','contract'].includes(key)){if(Array.isArray(value))value.forEach(item=>collect(item,predicate,result));else collect(value,predicate,result);}}return result;};

test('actual locked incoming feature closure includes float_roundtrip without changing numeric parsing authority',()=>{
  const proof=proveJsonMacroFeatures(dependencies());assert.equal(isJsonMacroFeatureProof(proof),true);assert.equal(isJsonMacroFeatureProof(structuredClone(proof)),false);
  assert.equal(proof.features.includes('std'),true);assert.equal(proof.features.includes('float_roundtrip'),true);assert.equal(proof.features.includes('arbitrary_precision'),false);assert.equal(proof.features.includes('preserve_order'),false);
  assert.equal(proof.numericDeserializeAuthority,false);assert.equal(proof.runtimeParity,false);assert.equal(proof.generatedTraitBehavior,false);
  assert.equal(proof.activePackages.find(entry=>entry.name==='serde_core').features.includes('std'),true);
  assert.throws(()=>proveJsonMacroFeatures(structuredClone(dependencies())),/sealed/);assert.throws(()=>proveJsonMacroFeatures(dependencies(),{includeDev:true}),/production/);
});

test('real macro aliases literal keys nested objects and static scalars execute both targets',async()=>{
  const source='use serde_json::{Value,json as literal}; pub fn sample()->Value{literal!({"β":{"flag":true,"empty":null,"text":"💡"},"a":{"value":"static"}})}';
  const result=project(source);assert.equal(result.meta.refused.some(item=>item.name==='sample'),false);
  await verifyTypedTargets(result,translated=>assert.deepEqual(native(translated.sample()),{a:{value:'static'},β:{flag:true,empty:null,text:'💡'}}));
  const nodes=collect(result.meta.checkedSemanticProgram.program,node=>node.k==='routerJsonMacro');assert.equal(nodes.length>0,true);for(const node of nodes){assert.equal(node.jsonMacroProof.macroOwnerResolved,true);assert.equal(node.jsonMacroProof.loweringEligible,true);assert.equal(node.jsonMacroProof.runtimeParity,false);}
});

test('source scalar and canonical Value Serialize adapters preserve original typed inputs both targets',async()=>{
  const source='use serde_json::{Value,json}; pub fn scalar(text:&str,value:u64)->Value{json!({"text":text,"value":value})} pub fn copied(value:&Value)->Value{json!(value)}';
  const result=project(source);assert.equal(result.meta.refused.some(item=>['scalar','copied'].includes(item.name)),false);
  await verifyTypedTargets(result,translated=>{const scalar=translated.scalar('α💡',(1n<<64n)-1n);assert.deepEqual(scalar.field0.entries.find(entry=>entry.key==='text').value,{$:'String',field0:'α💡'});assert.deepEqual(scalar.field0.entries.find(entry=>entry.key==='value').value,{$:'Number',field0:{$:'PosInt',field0:(1n<<64n)-1n}});const original=canonical({x:[true,'💡',null]});const value=translated.copied(original);assert.deepEqual(value,original);assert.notEqual(value,original);});
});

test('complete unchanged bridge file executes original tool-choice body with independent twelve outcomes',async()=>{
  const receipt=JSON.parse(readFileSync(new URL('../fixtures/json-macro-frontier/original-anchor.json',import.meta.url),'utf8')),source=readFileSync(repositorySourceURL(receipt.file,root),'utf8');
  assert.equal(hash(source),receipt.fileSha256);assert.equal(hash(source.slice(receipt.functionSpan.start,receipt.functionSpan.end)),receipt.functionSha256);
  const sources=new Map([['src/lib.rs','mod bridge_request_tools;'],[receipt.file,source]]),result=translateProject({entry:'src/lib.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE,jsonMacroDependencies:dependencies()});
  const entry=result.meta.executable.find(item=>item.name==='bridge_request_tools.translate_tool_choice');assert.deepEqual(entry?.span,{start:receipt.functionSpan.start,end:receipt.functionSpan.end});
  await verifyTypedTargets(result,translated=>{
    const fn=translated['bridge_request_tools.translate_tool_choice'];assert.equal(typeof fn,'function');
    for(const row of receipt.expectedCases){const value=fn(canonical(row.choice));if(row.expected.none)assert.deepEqual(value,{$:'None'});else{assert.equal(value.$,'Some');assert.deepEqual(native(value.field0),row.expected.some);}}
  });
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.meta.sources.find(item=>item.source===receipt.file).sha256,receipt.fileSha256);
  // The full child source is unchanged. The root is an authored module carrier;
  // this is one original body proof, not an admission of the full Router crate.
});

test('custom Serialize scalar floats dynamic duplicate keys mutation and effectful interpolation remain refused',()=>{
  for(const body of [
    'json!([true])','json!(1.5f64)','json!({"same":true,"same":false})','json!({key:true})','json!({"value":{let mut n=0u64;n+=1;n}})','json!({"value":std::env::var("X")})','json!(String::from("owned"))',
  ]){const result=project('use serde_json::{Value,json}; pub fn rejected()->Value{'+body+'}');assert.equal(result.meta.executable.some(item=>item.name==='rejected'),false,body);assert.equal(result.meta.refused.some(item=>item.name==='rejected'),true,body);}
  const custom=project('use serde_json::{Value,json}; struct Item{field:u8} pub fn rejected(value:Item)->Value{json!(value)}');assert.equal(custom.meta.executable.some(item=>item.name==='rejected'),false);
});

test('unknown/custom macros namespaces trait candidates and cfg do not grant literal-key conversion',()=>{
  for(const source of [
    'mod serde_json {} pub fn rejected()->serde_json::Value{serde_json::json!({"x":true})}',
    'use unknown::json; use serde_json::Value; pub fn rejected()->Value{json!({"x":true})}',
    'use serde_json::{Value,json}; trait IntoLike{fn into(self)->String;} pub fn rejected()->Value{json!({"x":true})}',
    '#![no_implicit_prelude] use serde_json::{Value,json}; pub fn rejected()->Value{json!({"x":true})}',
    '#[unknown] struct Inject; use serde_json::{Value,json}; pub fn rejected()->Value{json!({"x":true})}',
    '#[cfg(unix)] mod std {} use serde_json::{Value,json}; pub fn rejected()->Value{json!({"x":true})}',
    'use serde_json::{Value,json}; macro_rules! json{($($t:tt)*)=>{false}} pub fn rejected()->Value{json!({"x":true})}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='rejected'),false,source);}
});

test('original parser context rejects cloned proofs stale source slices and counterfeit caller flags',()=>{
  const source='use serde_json::{Value,json}; pub fn sample()->Value{json!(null)}',context=createJsonMacroContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies:dependencies(),compilationProfile:PRODUCTION_PROFILE});
  assert.equal(isJsonMacroContext(context),true);assert.equal(isJsonMacroContext(structuredClone(context)),false);
  assert.throws(()=>configureJsonMacroParser(new HostRustParser(tokenizeRust(source)),structuredClone(context),{file:'src/lib.rs'}),/original/);
  assert.throws(()=>configureJsonMacroParser(new HostRustParser(tokenizeRust(source+' ')),context,{file:'src/lib.rs'}),/original/);
  assert.throws(()=>createJsonMacroContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies:{...dependencies(),callOwnerResolved:true,unifiedFeatureClosureVerified:true}}),/sealed/);
});


const viewedModules=(source,profile=PRODUCTION_PROFILE)=>captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:profile}).views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,compilationProfile:profile,configurationCondition:sourceView.configurationCondition}));

test('same-file JSON sibling aliases retain genuine original views and execute distinct bodies in both targets',async()=>{
  const source='mod left {use serde_json::{Value,json as literal};pub fn sample()->Value{literal!({"side":"left"})}} mod right {use serde_json::{Value,json as literal};pub fn sample()->Value{literal!({"side":"right"})}}',result=project(source);
  assert.equal(result.meta.jsonMacroDiagnostic,undefined);assert.equal(result.meta.refused.some(item=>['left.sample','right.sample'].includes(item.name)),false);
  const context=result.meta.jsonMacroContext;assert.equal(context.originalModules.length,3);assert.equal(new Set(context.originalModules.map(module=>module.sourceViewDigest)).size,3);assert.ok(context.originalModules.every(module=>module.sha256===hash(source)&&module.configurationCondition==='active'));
  await verifyTypedTargets(result,api=>{assert.deepEqual(native(api['left.sample']()),{side:'left'});assert.deepEqual(native(api['right.sample']()),{side:'right'});});
});

test('same-file local macro shadow remains refused without leaking into an unrelated sibling JSON owner',async()=>{
  const source='mod left {use serde_json::{Value,json};pub fn sample()->Value{json!({"side":"left"})}} mod right {use serde_json::Value;macro_rules! json{($($tt:tt)*)=>{false}}pub fn rejected()->Value{json!(null)}}',result=project(source);
  assert.equal(result.meta.executable.some(item=>item.name==='right.rejected'),false);assert.equal(result.meta.refused.some(item=>item.name==='rejected'&&item.module?.join('.')==='right'&&item.term==='fn'&&/resolved original bang|actual locked|owner|shadow/u.test(item.message)),true);assert.equal(result.meta.executable.some(item=>item.name==='left.sample'),true);
  await verifyTypedTargets(result,api=>{assert.deepEqual(native(api['left.sample']()),{side:'left'});assert.equal(api['right.rejected'],undefined);});
});

test('JSON module snapshots reject forged sibling/root views stale whole bytes profile mismatches and missing ancestors',()=>{
  const source='mod left {use serde_json::{Value,json};pub fn sample()->Value{json!(null)}}mod right {}',modules=viewedModules(source),create=rows=>createJsonMacroContext({modules:rows,dependencies:dependencies(),compilationProfile:PRODUCTION_PROFILE}),context=create(modules);
  assert.equal(context.originalModules[1].sourceViewDigest,modules[1].sourceView.digest);
  for(const change of [{sourceView:structuredClone(modules[1].sourceView)},{sourceView:modules[0].sourceView},{sourceView:modules[2].sourceView},{source:source+' '},{compilationProfile:null},{configurationCondition:'invented'}])assert.throws(()=>create(modules.map((module,index)=>index===1?{...module,...change}:module)),TypeError);
  assert.throws(()=>create([modules[1]]),/ancestor/);assert.throws(()=>create(modules.map(module=>{const {sourceView,...bare}=module;return bare;})),/genuine original source views/);
  const genuine=create(modules.map(module=>({...module,items:[],allItems:[]})));assert.equal(genuine.originalModules.length,3);
});

test('JSON parser slices cannot cross sibling bodies despite matching bytes in the same complete file',()=>{
  const source='mod left {use serde_json::{Value,json};pub fn sample()->Value{json!(null)}}mod right {use serde_json::{Value,json};pub fn sample()->Value{json!(true)}}',modules=viewedModules(source),context=createJsonMacroContext({modules,dependencies:dependencies(),compilationProfile:PRODUCTION_PROFILE}),item=originalSourceModuleItems(modules[1]).find(item=>item.name==='sample'),body=source.slice(item.start,item.end);
  configureJsonMacroParser(new HostRustParser(tokenizeRust(body)),context,{file:'src/lib.rs',modulePath:['left'],offset:item.start});
  assert.throws(()=>configureJsonMacroParser(new HostRustParser(tokenizeRust(body)),context,{file:'src/lib.rs',modulePath:['right'],offset:item.start}),/escapes.*view/);
  assert.throws(()=>configureJsonMacroParser(new HostRustParser(tokenizeRust(body)),structuredClone(context),{file:'src/lib.rs',modulePath:['left'],offset:item.start}),/original/);
});

test('actual unknown/inactive view conditions and procedural ancestors cannot become closed JSON macro scopes',()=>{
  for(const attribute of ['#[cfg(unix)]','#[cfg(test)]','#[unknown]']) {
    const source=attribute+' mod child {use serde_json::{Value,json};pub fn sample()->Value{json!(null)}}',modules=viewedModules(source),context=createJsonMacroContext({modules,dependencies:dependencies(),compilationProfile:PRODUCTION_PROFILE}),child=modules[1];
    const record=context.originalModules.find(module=>module.path.join('.')==='child');assert.equal(record.configurationCondition,child.sourceView.configurationCondition);
    if(record.configurationCondition!=='active')assert.throws(()=>createJsonMacroContext({modules:modules.map((module,index)=>index===1?{...module,configurationCondition:'active'}:module),dependencies:dependencies(),compilationProfile:PRODUCTION_PROFILE}),/contradicts/);
    const item=originalSourceModuleItems(child).find(item=>item.name==='sample'),body=source.slice(item.start,item.end),parser=configureJsonMacroParser(new HostRustParser(tokenizeRust(body)),context,{file:'src/lib.rs',modulePath:['child'],offset:item.start}),start=body.indexOf('json!'),end=body.lastIndexOf(')')+1;
    assert.throws(()=>sealJsonMacroCall(parser,{segments:['json'],start,end,syntax:parseJsonMacroSyntax(body.slice(start,end))}),/unknown|resolved original bang|owner|actual locked|configuration condition/);
  }
});


test('original attached and separated bang tokens retain qualified and aliased JSON owners in both targets',async()=>{
  const source='use serde_json::{Value,json as literal}; pub fn adjacent()->Value{serde_json::json!({"owner":"qualified"})} pub fn separated()->Value{serde_json::json ! ({"owner":"qualified-spaced"})} pub fn alias()->Value{literal!({"owner":"alias"})} pub fn alias_spaced()->Value{literal ! ({"owner":"alias-spaced"})}';
  const result=project(source);assert.equal(result.meta.refused.some(item=>['adjacent','separated','alias','alias_spaced'].includes(item.name)),false);
  await verifyTypedTargets(result,api=>{for(const [name,owner] of [['adjacent','qualified'],['separated','qualified-spaced'],['alias','alias'],['alias_spaced','alias-spaced']])assert.deepEqual(native(api[name]()),{owner});});
  const nodes=collect(result.meta.checkedSemanticProgram.program,node=>node.k==='routerJsonMacro');
  const occurrences=new Map();
  for(const node of nodes){
    const proof=node.jsonMacroProof;assert.equal(source.slice(node.span.start,node.span.end),proof.originalSource);assert.deepEqual(node.span,proof.originalSpan);assert.equal(proof.macroOwnerResolved,true);assert.equal(proof.runtimeParity,false);assert.equal(proof.applicationEffectCompleteness,false);
    const identity=JSON.stringify([proof.file,proof.modulePath,proof.originalSpan,proof.resolved]);
    if(occurrences.has(identity))assert.deepEqual(proof,occurrences.get(identity));else occurrences.set(identity,proof);
  }
  assert.equal(occurrences.size,4);assert.equal(new Set([...occurrences.values()].map(proof=>proof.originalSha256)).size,4);
  for(const source of ['mod serde_json {} pub fn rejected()->serde_json::Value{serde_json::json ! (null)}','use serde_json::{Value,json as literal}; macro_rules! literal{()=>{false}} pub fn rejected()->Value{literal ! (null)}'])assert.equal(project(source).meta.executable.some(item=>item.name==='rejected'),false);
});
