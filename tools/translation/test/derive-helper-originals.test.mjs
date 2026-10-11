import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),fixture=JSON.parse(readFileSync(new URL('../fixtures/derive-helper-originals.json',import.meta.url),'utf8'));
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')}),hash=value=>createHash('sha256').update(value).digest('hex'),tag=($,fields={})=>Object.freeze({$,...fields});
function original(path) {
  const pin=fixture.entries.find(entry=>entry.path===path),source=readFileSync(new URL(path,root),'utf8');assert.ok(pin);assert.equal(hash(source),pin.sourceSha256);
  const methods=extractImplDeclarations(source).implementations;
  for(const method of pin.methods){
    const actual=methods.find(entry=>entry.typePath.join('::')===method.owner)?.methods.find(entry=>entry.name===method.name);
    assert.ok(actual);assert.deepEqual(actual.span,method.span);assert.equal(actual.source,source.slice(method.span.start,method.span.end));assert.equal(hash(actual.source),method.sha256);
  }
  return {pin,result:translateProject({entry:path,paths:[path],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE})};
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

test('whole original response affinity retains unresolved inner lint attributes and selector provenance',()=>{
  const {pin,result}=original('src/response_affinity.rs');
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.meta.deriveNamespaceFootprints.certificates.length,0);
  assert.ok(result.meta.deriveNamespaceFootprints.diagnostics.some(entry=>entry.name==='ResponseNamespace'&&entry.message.includes('Sibling attribute')));
  const scope=result.sourceScopes[0].scope;assert.equal(scope.unresolvedTypeScope,true);assert.equal(scope.unresolvedAttributeMacroScope,true);
  assert.ok(scope.unresolvedImports.some(entry=>entry.span.start===84&&entry.span.end===122&&entry.message.includes('item can introduce bindings')));
  assert.ok(result.meta.refused.some(entry=>entry.name==='ResponseNamespace'&&entry.message.includes('derive(Serialize)')));
  for(const method of pin.methods) {
    assert.equal(result.meta.checkedMethods.some(entry=>entry.name===method.owner+'.'+method.name),false);
    const refusal=result.meta.refused.find(entry=>entry.term==='method'&&entry.name.endsWith('.'+method.owner+'.'+method.name));
    assert.ok(refusal);assert.match(refusal.message,/shadowed Option generic/);
    assert.ok(refusal.span.start>=method.span.start&&refusal.span.end<=method.span.end);
  }
});

test('whole original standard-default-helper selectors retain bodies and unit layout',async()=>{
  const bridge=original('src/bridge_selection.rs'),accounts=original('src/accounts.rs');
  for(const {pin,result}of [bridge,accounts]){
    for(const method of pin.methods)assert.deepEqual(result.meta.checkedMethods.find(entry=>entry.name===method.owner+'.'+method.name)?.span,method.span);
    assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.length);
    assert.ok(result.meta.deriveNamespaceFootprints.certificates.some(entry=>entry.builtinDefault?.generatedImplBehavior===false));
  }
  await verifyTypedTargets(expose(bridge.result,[['BridgeModelPolicy','name','originalPolicyName']]),(_api,_result,module)=>{
    assert.equal(module.originalPolicyName(tag('FirstAdvertised')),'first-advertised');
    assert.equal(module.originalPolicyName(tag('LastAdvertised')),'last-advertised');
    assert.throws(()=>module.originalPolicyName(tag('Invented')),TypeError);
  });
  await verifyTypedTargets(expose(accounts.result,[['SelectionStrategy','from_str_opt','originalStrategy']]),(_api,_result,module)=>{
    for(const [value,name]of [['rr','RoundRobin'],[' roundrobin ','RoundRobin'],['WEIGHTED_ROUND_ROBIN','WeightedRoundRobin'],['fillfirst','Priority'],['quota-first','LeastUsed']])assert.deepEqual(module.originalStrategy(value),tag('Some',{field0:tag(name)}));
    for(const value of ['','unsupported'])assert.deepEqual(module.originalStrategy(value),tag('None'));
    assert.throws(()=>module.originalStrategy(null),TypeError);
  });
});
