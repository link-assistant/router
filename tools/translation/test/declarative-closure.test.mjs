import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeclarativeSourceProof,taskLocalSourceDefinitions,standardThreadLocalSourceDefinitions,standardCfgIfSourceDefinition,declarativeStandardInvocations,declarativeDefinitionSource} from '../declarative-source-profile.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeExpansionLineage} from '../declarative-macros.mjs';
import {originalMacroTrees,originalMacroInvocation} from '../macro-token-trees.mjs';
import {inspectDeclarativeExpansionClosure,isDeclarativeClosureEvidence,proveDeclarativeBranchPartition,isDeclarativeBranchPartition} from '../declarative-closure.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=()=>loadDeclarativeSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
function calls(expansion,name) {
  const result=[];
  function walk(trees,path=[]) {
    for(let at=0;at<trees.length;at++){
      if(trees[at].text===name&&trees[at+1]?.text==='!'&&trees[at+2]?.kind==='group')result.push([...path,at+2]);
      if(trees[at].kind==='group')walk(trees[at].children,[...path,at]);
    }
  }
  walk(expansion.trees);return result;
}
function attributePath(expansion) {
  const at=expansion.trees.findIndex(tree=>tree.text==='#');assert.ok(at>=0);return [at+1];
}

test('profile source origin and forwarding lineage reject caller-created clones and definitions',()=>{
  const proof=dependencies(),definition=taskLocalSourceDefinitions(proof).get('task_local');
  const source=declarativeDefinitionSource(proof,definition);assert.equal(source.source,'tokio/src/task/task_local.rs');assert.equal(source.sourceVerified,true);assert.equal(source.callOwnerResolved,false);
  assert.throws(()=>declarativeDefinitionSource(structuredClone(proof),definition),/sealed source profile/);
  assert.throws(()=>declarativeDefinitionSource(proof,structuredClone(definition)),/sealed source profile/);
  const invented=compileDeclarativeMacro('macro_rules! task_local {()=>{}}',{name:'task_local',owner:['tokio']});
  assert.throws(()=>declarativeDefinitionSource(proof,invented),/sealed source profile/);
  const expansion=expandDeclarativeMacro(definition,originalMacroTrees('static VALUE:u8;'));
  assert.strictEqual(declarativeExpansionLineage(expansion).definition,definition);
  assert.throws(()=>declarativeExpansionLineage(structuredClone(expansion)),/Unsealed/);
});

test('all pinned Router task-local chains retain call-site standard owner and generated attribute obligations',()=>{
  const proof=dependencies(),defs=taskLocalSourceDefinitions(proof),pins=JSON.parse(readFileSync(new URL('../fixtures/task-local-originals.json',import.meta.url),'utf8'));
  for(const pin of pins.invocations) {
    const source=readFileSync(new URL(pin.file,root),'utf8');assert.equal(hash(source),pin.sourceSha256);
    const original=source.slice(pin.span.start,pin.span.end);assert.equal(original,pin.original);assert.equal(hash(original),pin.invocationSha256);
    const input=originalMacroInvocation(original),front=expandDeclarativeMacro(defs.get('task_local'),input.trees);
    const inner=expandDeclarativeMacro(defs.get('__task_local_inner'),declarativeSubInput(front,calls(front,'__task_local_inner')[0]));
    const closure=inspectDeclarativeExpansionClosure({dependencies:proof,root:front,expansions:[front,inner]});
    assert.equal(isDeclarativeClosureEvidence(closure),true);assert.equal(isDeclarativeClosureEvidence(structuredClone(closure)),false);
    assert.equal(closure.frames[0].calls[0].hygiene,'definition-site-dollar-crate');
    const standard=closure.frames[1].calls.find(call=>call.writtenPath.join('::')==='std::thread_local');
    assert.deepEqual(standard.children,[]);assert.equal(standard.hygiene,'template-call-site-path');
    assert.equal(standard.sourceSyntax.sourceSha256,closure.frames[1].origin.sourceSha256);
    assert.ok(closure.obligations.some(entry=>entry.kind==='unexpanded-call'));
    assert.equal(closure.ownerVerified,false);assert.equal(closure.generatedBehavior,false);assert.ok(Object.values(closure.dimensions).every(value=>value===false));
    assert.throws(()=>inspectDeclarativeExpansionClosure({dependencies:proof,root:inner,expansions:[front,inner]}),/disconnected/);
    assert.throws(()=>inspectDeclarativeExpansionClosure({dependencies:proof,root:structuredClone(front)}),/privately checked/);
  }
});

test('actual exhaustive cfg_if branches have a symbolic partition without authorizing macro owners',()=>{
  const proof=dependencies(),definition=standardCfgIfSourceDefinition(proof),invocation=declarativeStandardInvocations(proof,'library/std/src/sys/thread_local/mod.rs').find(entry=>entry.path.join('::')==='cfg_if::cfg_if');
  const front=expandDeclarativeMacro(definition,invocation.trees),trace=[front],branches=[];
  let frame=expandDeclarativeMacro(definition,declarativeSubInput(front,calls(front,'cfg_if')[0]));trace.push(frame);
  while(frame.trees.length) {
    assert.ok(branches.length<4);branches.push({expansion:frame,attributePath:attributePath(frame)});
    const paths=calls(frame,'cfg_if');assert.equal(paths.length,2);
    trace.push(expandDeclarativeMacro(definition,declarativeSubInput(frame,paths[0])));
    frame=expandDeclarativeMacro(definition,declarativeSubInput(frame,paths[1]));trace.push(frame);
  }
  assert.equal(branches.length,3);
  const partition=proveDeclarativeBranchPartition({dependencies:proof,branches});
  assert.equal(isDeclarativeBranchPartition(partition),true);assert.equal(isDeclarativeBranchPartition(structuredClone(partition)),false);
  assert.equal(partition.exhaustive,true);assert.equal(partition.disjoint,true);assert.equal(partition.platformSelected,false);assert.equal(partition.ownerVerified,false);assert.equal(partition.namespaceComplete,false);
  assert.throws(()=>proveDeclarativeBranchPartition({dependencies:proof,branches:branches.slice(0,2)}),/not an exhaustive disjoint/);
  assert.throws(()=>proveDeclarativeBranchPartition({dependencies:proof,branches:[...branches,branches[0]]}),/not an exhaustive disjoint/);
  const closure=inspectDeclarativeExpansionClosure({dependencies:proof,root:front,expansions:trace});assert.equal(closure.frames.length,trace.length);assert.equal(closure.dimensions.bangMacroComplete,false);
});

test('every original standard leaf keeps generated attribute and nested owner obligations with its actual lineage',()=>{
  const proof=dependencies(),defs=standardThreadLocalSourceDefinitions(proof);
  const front=expandDeclarativeMacro(defs.get('thread_local'),originalMacroTrees('pub static VALUE:u8=const {7};'));
  for(const branch of ['no_threads','native','os']) {
    const declaration=expandDeclarativeMacro(defs.get(branch),declarativeSubInput(front,calls(front,'thread_local_inner')[0]));
    const key=expandDeclarativeMacro(defs.get(branch),declarativeSubInput(declaration,calls(declaration,'thread_local_inner')[0])),trace=[front,declaration,key];
    if(branch==='os')trace.push(expandDeclarativeMacro(defs.get(branch),declarativeSubInput(key,calls(key,'thread_local_inner')[0])));
    const closure=inspectDeclarativeExpansionClosure({dependencies:proof,root:front,expansions:trace});
    assert.deepEqual(closure.frames[1].declarations.map(entry=>[entry.term,entry.name]),[['const','VALUE']]);
    assert.equal(closure.ownerVerified,false);assert.equal(closure.dimensions.valueNamespaceComplete,false);
    if(branch==='native')assert.ok(closure.obligations.some(entry=>entry.kind==='attribute-owner'&&entry.name==='thread_local'));
  }
});
