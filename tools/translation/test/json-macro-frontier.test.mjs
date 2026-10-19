import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSON_MACRO_SOURCE_PROFILE,createJsonMacroSourceProof,loadJsonMacroSourceProof,isJsonMacroSourceProof,jsonMacroOriginalSource,jsonMacroDependencyProfile,jsonMacroSourceDefinition,jsonMacroDefinitionSource} from '../json-macro-sources.mjs';
import {parseJsonMacroSyntax,isOriginalJsonMacroSyntax,jsonMacroSyntaxSource,captureOriginalJsonMacroInvocations} from '../json-macro-syntax.mjs';
import {planJsonMacroCandidate,isJsonMacroCandidatePlan} from '../json-macro-plans.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const inputs=()=>({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),archives:new Map(JSON_MACRO_SOURCE_PROFILE.packages.map(entry=>[entry.name+'@'+entry.version,readFileSync(new URL('../source-profiles/json-macro/'+entry.archive,import.meta.url))]))});
const dependency=()=>loadJsonMacroSourceProof(inputs());
const flags=proof=>{for(const key of ['namespaceAuthority','expansionAuthority','runtimeParity','generatedTraitBehavior'])assert.equal(proof[key],false,key);};

test('pinned original JSON macro and scalar serializers retain licenses without package-owner authority',()=>{
  const proof=dependency();assert.equal(isJsonMacroSourceProof(proof),true);assert.equal(isJsonMacroSourceProof(structuredClone(proof)),false);flags(proof);
  assert.equal(proof.sourceInputsVerified,true);assert.equal(proof.callOwnerResolved,false);assert.equal(proof.unifiedFeatureClosureVerified,false);
  for(const entry of JSON_MACRO_SOURCE_PROFILE.packages)for(const member of entry.members){const source=jsonMacroOriginalSource(proof,entry.name,member.path);assert.equal(hash(source.source),member.sha256);}
  assert.match(jsonMacroOriginalSource(proof,'serde_json','src/macros.rs').source,/\$crate::to_value\(&\$other\)\.unwrap\(\)/);
  assert.match(jsonMacroOriginalSource(proof,'serde_core','src/ser/impls.rs').source,/impl Serialize for str/);
  assert.throws(()=>jsonMacroOriginalSource(structuredClone(proof),'serde_json','src/macros.rs'),/Unsealed/);
  const definition=jsonMacroSourceDefinition(proof);assert.equal(definition.ownerVerified,false);assert.equal(jsonMacroDefinitionSource(definition).callOwnerResolved,false);
  assert.throws(()=>jsonMacroDefinitionSource(structuredClone(definition)),/Unsealed/);
});

test('changed archives manifests and unrelated feature profiles do not produce owner proof',()=>{
  const changed=inputs(),entry=JSON_MACRO_SOURCE_PROFILE.packages[0],bytes=Buffer.from(changed.archives.get(entry.name+'@'+entry.version));bytes[0]^=1;changed.archives.set(entry.name+'@'+entry.version,bytes);
  assert.throws(()=>createJsonMacroSourceProof(changed),/checksum mismatch/);
  assert.throws(()=>createJsonMacroSourceProof({...inputs(),manifest:inputs().manifest+'\n'}),/audited manifest/);
  const unavailable=jsonMacroDependencyProfile({manifest:'[dependencies]\nserde_json={version="1",features=["preserve_order"]}\n',lock:inputs().lock});assert.equal(unavailable.proof,null);assert.equal(unavailable.diagnostics[0].kind,'unsupported-profile');
});

test('literal-key original syntax preserves Unicode source order raw strings and trailing commas',()=>{
  const source='serde_json::json!({"β": [true, null, r#"💡"#,], "a": value,})',syntax=parseJsonMacroSyntax(source);
  assert.deepEqual(syntax.path,['serde_json','json']);assert.deepEqual(syntax.value.entries.map(entry=>entry.key),['β','a']);
  assert.equal(syntax.value.entries[0].value.items[2].value,'💡');assert.equal(syntax.leaves[0].source,'value');assert.equal(source.slice(syntax.leaves[0].span.start,syntax.leaves[0].span.end),'value');
  assert.equal(isOriginalJsonMacroSyntax(syntax),true);assert.equal(isOriginalJsonMacroSyntax(structuredClone(syntax)),false);assert.equal(jsonMacroSyntaxSource(syntax).source,source);
  assert.throws(()=>jsonMacroSyntaxSource(structuredClone(syntax)),/Unsealed/);assert.equal(syntax.ownerResolved,false);assert.equal(syntax.expansionAuthority,false);
});

test('duplicate and dynamic keys nested macros expressions and budgets retain explicit refusal',()=>{
  for(const source of ['json!({"x":true,"x":false})','json!({key:true})','json!({"x":custom!()})','json!({"x":{return true;}})','json!({"x":|v|v})','json!({"x":value[0]})','json!([true,,false])'])assert.throws(()=>parseJsonMacroSyntax(source),/JSON macro syntax/);
  assert.throws(()=>parseJsonMacroSyntax('json!([[[true]]])',{maxDepth:1}),/budget/);
  assert.throws(()=>parseJsonMacroSyntax('json!(true)',{maxBytes:4}),/budget/);
  const flow=parseJsonMacroSyntax('json!({"x":call(value?)})');assert.equal(flow.leaves[0].requiresQuestionMarkFlow,true);
});

test('scalar interpolation remains a non-admitting plan and never invents custom Serialize or shadowed owners',()=>{
  const syntax=parseJsonMacroSyntax('json!({"x":value})'),dependencies=dependency();
  const str={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'}},value={k:'var',name:'value',type:str};
  const plan=planJsonMacroCandidate({syntax,dependencies,checkedExpressions:[value]});assert.equal(isJsonMacroCandidatePlan(plan),true);assert.equal(isJsonMacroCandidatePlan(structuredClone(plan)),false);flags(plan);assert.equal(plan.loweringEligible,false);assert.equal(plan.callOwnerResolved,false);
  for(const type of [{kind:'string'}, {...str,rustOwnership:{kind:'owned',source:'String'}},{kind:'float',rustSourceType:true},{kind:'data',name:'serde_json.Value',rustSourceType:true},{kind:'fixed',bits:64,signed:false,rustPrimitiveName:'usize',rustSourceType:true},{...str,rustBorrowingUnresolved:'borrow of owned String'}])assert.throws(()=>planJsonMacroCandidate({syntax,dependencies,checkedExpressions:[{...value,type}]}),/Serialize/);
  assert.throws(()=>planJsonMacroCandidate({syntax,dependencies,checkedExpressions:[{...value,k:'call'}]}),/effect/);
  assert.throws(()=>planJsonMacroCandidate({syntax:parseJsonMacroSyntax('json!(value?)'),dependencies,checkedExpressions:[value]}),/nonlocal/);
  for(const path of ['custom::json!("x")','shadow::json!({"x":true})']){const shadow=planJsonMacroCandidate({syntax:parseJsonMacroSyntax(path),dependencies});assert.equal(shadow.loweringEligible,false);assert.equal(shadow.callOwnerResolved,false);}
});

test('unchanged full bridge source retains the four anchor invocations and nonlocal-flow frontier',()=>{
  const receipt=JSON.parse(readFileSync(new URL('../fixtures/json-macro-frontier/original-anchor.json',import.meta.url),'utf8'));
  const source=readFileSync(new URL(receipt.file,root),'utf8');assert.equal(hash(source),receipt.fileSha256);assert.equal(hash(source.slice(receipt.functionSpan.start,receipt.functionSpan.end)),receipt.functionSha256);
  const invocations=captureOriginalJsonMacroInvocations(source),anchor=invocations.filter(item=>item.span.start>=receipt.functionSpan.start&&item.span.end<=receipt.functionSpan.end);
  assert.equal(anchor.length,4);assert.equal(anchor.every(item=>item.syntax!==null),true);assert.deepEqual(anchor.slice(0,3).map(item=>item.syntax.value.value),['auto','required','none']);
  const tool=anchor[3].syntax;assert.equal(tool.value.entries[1].value.entries[0].value.source,'choice.get("name").and_then(Value::as_str)?');assert.equal(tool.leaves[0].requiresQuestionMarkFlow,true);
  assert.equal(invocations.some(item=>item.syntax===null),true);for(const item of anchor){assert.equal(source.slice(item.span.start,item.span.end),item.source);assert.equal(item.syntax.expansionAuthority,false);}
  assert.equal(receipt.compilerCasesExecuted,0);assert.equal(receipt.originalBodiesExecuted,0);assert.equal(receipt.runtimeParity,false);
});
