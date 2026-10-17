import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {assertDeriveFootprintCertificate} from '../derive-footprints.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {inertInnerLintItem} from '../tool-attributes.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {associatedOriginalInputs,associatedOriginalDependencyInputs} from './associated-original-context.mjs';
const root=new URL('../../../',import.meta.url),fixture=JSON.parse(readFileSync(new URL('../fixtures/derive-helper-originals.json',import.meta.url),'utf8'));
const associatedData=associatedOriginalInputs('derive-helper-originals.test.mjs');
const dependencies=loadDeriveDependencyProof(associatedOriginalDependencyInputs(associatedData)),hash=value=>createHash('sha256').update(value).digest('hex'),tag=($,fields={})=>Object.freeze({$,...fields});
function original(path) {
  const pin=fixture.entries.find(entry=>entry.path===path),source=associatedData.source(path);assert.ok(pin);assert.equal(hash(source),pin.sourceSha256);
  const methods=extractImplDeclarations(source).implementations;
  for(const method of pin.methods){
    const actual=methods.find(entry=>entry.typePath.join('::')===method.owner)?.methods.find(entry=>entry.name===method.name);
    assert.ok(actual);assert.deepEqual(actual.span,method.span);assert.equal(actual.source,source.slice(method.span.start,method.span.end));assert.equal(hash(actual.source),method.sha256);
  }
  return {pin,source,result:translateProject({entry:path,paths:[path],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE})};
}
function expose(result,names) {
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const aliases=names.map(([owner,name,alias])=>{
    const checked=result.meta.checkedMethods.find(method=>method.name===owner+'.'+name);assert.ok(checked,owner+'.'+name+' must be checked from the whole original file');
    const emitted=[...target.declarations.values()].find(entry=>entry.impl?.method===name);assert.ok(emitted);
    return `${emitted.name} as ${alias}`;
  });
  const suffix=`\nexport {${aliases.join(',')}};`;
  return {...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix};
}

test('whole original provider acceptance getter retains exact checked Copy field behavior',async()=>{
  const {pin,result}=original('src/provider_acceptance.rs');
  const method=result.meta.checkedMethods.find(method=>method.name==='ProviderProvisionFailure.kind');assert.deepEqual(method?.span,pin.methods[0].span);
  assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.length,'provider I/O and generated trait behavior remain obligations');
  await verifyTypedTargets(expose(result,[['ProviderProvisionFailure','kind','originalKind']]),(_api,_result,module)=>{
    for(const name of ['InvalidCandidate','CredentialRejected','RateLimited','Unverified','PersistenceUncertain']){
      const kind=tag(name);assert.strictEqual(module.originalKind(tag('ProviderProvisionFailure',{kind,message:'fixture'})),kind);
    }
    assert.throws(()=>module.originalKind(tag('ProviderProvisionFailure',{kind:tag('Invented'),message:'fixture'})),TypeError);
  });
});

test('whole original response affinity selectors retain certified source and literal prefix routing',async()=>{
  const {pin,source,result}=original('src/response_affinity.rs');
  assert.equal(result.meta.runtimeParity,false);
  const footprints=result.meta.deriveNamespaceFootprints;
  assert.deepEqual(footprints.diagnostics,[]);
  assert.deepEqual(footprints.certificates.map(entry=>entry.name),['ResponseNamespace','ResponseOwner','AffinityDestination','ResponseAffinity','RecordOutcome','StoreError','AffinityFile','ResponseAffinityStore']);
  const standard=footprints.certificates.filter(certificate=>certificate.standardInput);assert.deepEqual(standard.map(certificate=>certificate.name),['RecordOutcome','StoreError','ResponseAffinityStore']);for(const certificate of standard){assert.equal(certificate.sourceSha256,pin.sourceSha256);assert.equal(certificate.itemSha256,hash(source.slice(certificate.span.start,certificate.span.end)));assert.deepEqual(certificate.owners,[]);assert.equal(certificate.generatedImplBehavior,false);assert.deepEqual(certificate.dimensions,{typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:true,bangMacroComplete:false});assert.equal(certificate.standardInput.namespaceAuthority,false);assert.equal(certificate.standardInput.runtimeAuthority,false);}
  for(const certificate of footprints.certificates.filter(certificate=>!certificate.standardInput)){
    assert.equal(certificate.source,pin.path);assert.equal(certificate.sourceSha256,pin.sourceSha256);
    assert.equal(certificate.itemSha256,hash(source.slice(certificate.span.start,certificate.span.end)));
    assert.strictEqual(assertDeriveFootprintCertificate(certificate,source.slice(certificate.span.start,certificate.span.end),certificate.span.start),certificate);
    assert.deepEqual(certificate.compilationProfile,PRODUCTION_PROFILE);
    assert.deepEqual(certificate.owners.map(owner=>owner.target),[['serde','Serialize'],['serde','Deserialize']]);
    for(const owner of certificate.owners){
      assert.equal(owner.via,'named-import');assert.deepEqual(owner.sourceSpan,{start:209,end:245});
      assert.equal(source.slice(owner.sourceSpan.start,owner.sourceSpan.end),'use serde::{Deserialize, Serialize};');
      assert.equal(owner.dependencyDigest,dependencies.digest);
    }
    assert.equal(certificate.dependenciesDigest,dependencies.digest);
    assert.deepEqual(certificate.coreOwner.target,['core','compile_error']);
    assert.deepEqual(certificate.coreOwner.source,dependencies.standardCore);
    assert.deepEqual(certificate.dimensions,{typeNamespaceComplete:true,valueNamespaceComplete:true,attributeMacroComplete:true,bangMacroComplete:false});
    assert.equal(certificate.generatedImplBehavior,false);
    assert.ok(certificate.obligations.includes('generated trait implementations are not lowered'));
    assert.ok(certificate.obligations.includes('fixed successful-expansion bang macro closure remains unproved'));
  }
  const innerItem=sourceItems(source).find(item=>item.start===84&&item.end===122),inner=inertInnerLintItem(innerItem,source);
  assert.ok(inner);assert.equal(inner.sourceInputsVerified,true);assert.equal(inner.sourceSha256,pin.sourceSha256);
  assert.equal(source.slice(84,122),'#![allow(clippy::redundant_pub_crate)]');
  assert.deepEqual(inner.attributes[0].tokens,['#','!','[','allow','(','clippy','::','redundant_pub_crate',')',']']);
  assert.equal(inner.runtimeBehavior,false);
  const scope=result.sourceScopes[0].scope;
  assert.equal(scope.unresolvedTypeScope,false);assert.equal(scope.unresolvedAttributeMacroScope,false);assert.equal(scope.unresolvedBangMacroScope,true);
  assert.equal(scope.unresolvedImports.some(entry=>entry.span.start===84&&entry.span.end===122),false);
  const layout=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('ResponseNamespace');
  assert.ok(layout);assert.deepEqual(layout.rustAttributes.find(attribute=>attribute.kind==='derive').unimplementedDerives,[['Serialize'],['Deserialize']]);
  assert.deepEqual(layout.rustAttributes.find(attribute=>attribute.name==='serde').tokens,['#','[','serde','(','rename_all','=','"snake_case"',')',']']);
  for(const method of pin.methods)assert.deepEqual(result.meta.checkedMethods.find(entry=>entry.name===method.owner+'.'+method.name)?.span,method.span);
  assert.ok(result.meta.refused.some(entry=>entry.name==='StoreError.fmt'&&entry.message.includes('trait implementation')));
  assert.ok(result.meta.refused.some(entry=>entry.name==='ResponseAffinityStore.open_with_limits'&&entry.kind==='unsupported'));
  await verifyTypedTargets(expose(result,[['ResponseNamespace','from_path','originalResponseNamespace'],['ResponseNamespace','conversations_from_path','originalConversationNamespaces']]),(_api,_result,module)=>{
    const responses=[
      ['/api/services/openai/v1/responses','OpenAiResponses'],['/api/services/codex/v1/responses','CodexResponses'],['/api/services/qwen/v1/responses','QwenResponses'],
      ['/api/services/openai/v1/chat/completions','OpenAiChat'],['/api/services/codex/v1/chat/completions','CodexChat'],['/api/services/qwen/v1/chat/completions','QwenChat'],
    ];
    for(const [prefix,name]of responses)for(const suffix of ['','/res_1','?stream=true','XYZ/🧪'])assert.deepEqual(module.originalResponseNamespace(prefix+suffix),tag('Some',{field0:tag(name)}));
    for(const path of ['','/v1/responses','/api/services/anthropic/v1/responses','/api/services/openai/v1/response','/api/services/openai/v1/chat/completion','/api/services/OpenAI/v1/responses',' /api/services/openai/v1/responses','https://router.example/api/services/openai/v1/responses','/api/services/openai/v1/conversations','/api/services/openai/v1/files'])assert.deepEqual(module.originalResponseNamespace(path),tag('None'));
    const conversations=[
      ['/api/services/openai/v1/conversations','OpenAiConversations','OpenAiConversationItems'],
      ['/api/services/codex/v1/conversations','CodexConversations','CodexConversationItems'],
      ['/api/services/qwen/v1/conversations','QwenConversations','QwenConversationItems'],
    ];
    for(const [prefix,name,items]of conversations)for(const suffix of ['','/conv_1/items','?limit=2','Anything/🧪'])assert.deepEqual(module.originalConversationNamespaces(prefix+suffix),tag('Some',{field0:tag('Tuple',{field0:tag(name),field1:tag(items)})}));
    for(const path of ['','/v1/conversations','/api/services/anthropic/v1/conversations','/api/services/openai/v1/conversation','/api/services/OpenAI/v1/conversations','/api/services/openai/v1/responses','/api/services/openai/v1/chat/completions','/api/services/qwen/v1/conversation_items'])assert.deepEqual(module.originalConversationNamespaces(path),tag('None'));
    let reads=0;const hostile=new Proxy(Object.create(null),{get(){reads++;throw new Error('input must not be inspected');}});
    for(const selector of [module.originalResponseNamespace,module.originalConversationNamespaces])for(const value of [null,0,[],tag('None'),hostile])assert.throws(()=>selector(value),TypeError);
    assert.equal(reads,0);
  });
});

function checkedOriginalHelper(path) {
  const value=original(path),{pin,result}=value;
  {
    for(const method of pin.methods)assert.deepEqual(result.meta.checkedMethods.find(entry=>entry.name===method.owner+'.'+method.name)?.span,method.span);
    assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.length);
    assert.ok(result.meta.deriveNamespaceFootprints.certificates.some(entry=>entry.builtinDefault?.generatedImplBehavior===false));
  }
  return value;
}
test('whole original bridge standard-default-helper selector retains body and unit layout',async()=>{
  const bridge=checkedOriginalHelper('src/bridge_selection.rs');
  await verifyTypedTargets(expose(bridge.result,[['BridgeModelPolicy','name','originalPolicyName']]),(_api,_result,module)=>{
    assert.equal(module.originalPolicyName(tag('FirstAdvertised')),'first-advertised');
    assert.equal(module.originalPolicyName(tag('LastAdvertised')),'last-advertised');
    assert.throws(()=>module.originalPolicyName(tag('Invented')),TypeError);
  });
});
test('whole original account standard-default-helper selector retains body and unit layout',async()=>{
  const accounts=checkedOriginalHelper('src/accounts.rs');
  await verifyTypedTargets(expose(accounts.result,[['SelectionStrategy','from_str_opt','originalStrategy']]),(_api,_result,module)=>{
    for(const [value,name]of [['rr','RoundRobin'],[' roundrobin ','RoundRobin'],['WEIGHTED_ROUND_ROBIN','WeightedRoundRobin'],['fillfirst','Priority'],['quota-first','LeastUsed']])assert.deepEqual(module.originalStrategy(value),tag('Some',{field0:tag(name)}));
    for(const value of ['','unsupported'])assert.deepEqual(module.originalStrategy(value),tag('None'));
    assert.throws(()=>module.originalStrategy(null),TypeError);
  });
});
