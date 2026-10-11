import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,isDeclarativeExpansion,declarativeNamespaceObservation} from '../declarative-macros.mjs';
import {originalMacroTrees,originalMacroInvocation,originalMacroTreeText} from '../macro-token-trees.mjs';
import {loadDeclarativeSourceProof,taskLocalSourceDefinitions,isDeclarativeSourceProof} from '../declarative-source-profile.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const compile=source=>compileDeclarativeMacro(source,{name:'example',owner:['fixture']});
const render=proof=>proof.trees.map(originalMacroTreeText).join(' ');

test('bounded declarative rules retain source order groups repetitions and definition-site owner',()=>{
  const definition=compile('macro_rules! example {()=>{}; ($($name:ident),+) => {$crate::call!($($name),*);};}');
  const empty=expandDeclarativeMacro(definition,originalMacroTrees(''));assert.deepEqual(empty.trees,[]);
  const result=expandDeclarativeMacro(definition,originalMacroTrees('first,second'));
  assert.equal(isDeclarativeExpansion(result),true);assert.equal(isDeclarativeExpansion(structuredClone(result)),false);
  assert.equal(render(result),'fixture :: call ! (first , second) ;');
  assert.equal(result.ownerVerified,false);assert.equal(result.namespaceComplete,false);assert.equal(result.generatedBehavior,false);
  assert.throws(()=>expandDeclarativeMacro(structuredClone(definition),originalMacroTrees('first')),/sealed/);
  assert.throws(()=>expandDeclarativeMacro(definition,structuredClone(originalMacroTrees('first'))),/original/);
});

test('forwarded type fragments remain opaque to literal matching',()=>{
  const sender=compile('macro_rules! example {($type:ty)=>{$type};}');
  const receiver=compile('macro_rules! example {(u8)=>{LITERAL};($type:ty)=>{OPAQUE};}');
  const first=expandDeclarativeMacro(sender,originalMacroTrees('u8'));
  const result=expandDeclarativeMacro(receiver,declarativeSubInput(first));
  assert.equal(render(result),'OPAQUE');assert.equal(result.input.parentDigest,first.digest);
  const tokenReceiver=compile('macro_rules! example {($tree:tt)=>{TOKEN};}');
  assert.throws(()=>expandDeclarativeMacro(tokenReceiver,declarativeSubInput(first)),/same checked fragment kind/);
  const identSender=compile('macro_rules! example {($name:ident)=>{$name};}');
  const name=expandDeclarativeMacro(identSender,originalMacroTrees('u8'));
  assert.equal(render(expandDeclarativeMacro(receiver,declarativeSubInput(name))),'LITERAL');
  assert.throws(()=>declarativeSubInput(structuredClone(first)),/Unsealed/);
});

test('ambiguity capture arity unsupported fragments and recursive resource excess remain explicit',()=>{
  for(const source of [
    'macro_rules! example {($($($name:ident)*)*)=>{};}',
    'macro_rules! example {($name:ident,$name:ident)=>{};}',
    'macro_rules! example {($value:expr)=>{};}',
    'macro_rules! example {($type:ty trailing)=>{};}',
    'macro_rules! example {($visibility:vis ;)=>{};}',
    'macro_rules! example {($visibility:vis priv)=>{};}',
    'macro_rules! example {($name:ident)=>{$missing};}',
  ])assert.throws(()=>compile(source),/Declarative|declarative|Nested|Duplicate|Unbound/);
  const ambiguous=compile('macro_rules! example {($($name:ident)* ending)=>{};}');
  assert.throws(()=>expandDeclarativeMacro(ambiguous,originalMacroTrees('ending')),/ambiguous/);
  const repeat=compile('macro_rules! example {($($name:ident),*)=>{$($name)*};}');
  assert.throws(()=>expandDeclarativeMacro(repeat,originalMacroTrees('a,b,c'),{repetitions:2}),/budget/);
  assert.throws(()=>expandDeclarativeMacro(repeat,originalMacroTrees('a'),{steps:1}),/budget/);
  assert.throws(()=>expandDeclarativeMacro(repeat,originalMacroTrees('a'),{output:1}),/budget/);
  const cycle=compile('macro_rules! example {($($item:tt)*)=>{$($item)*};}');
  let current=expandDeclarativeMacro(cycle,originalMacroTrees('same'));
  for(let at=0;at<32;at++)current=expandDeclarativeMacro(cycle,declarativeSubInput(current));
  assert.throws(()=>expandDeclarativeMacro(cycle,declarativeSubInput(current)),/depth budget/);
});

test('all original pinned task-local invocations use actual locked transcribers without runtime or namespace admission',()=>{
  const proof=loadDeclarativeSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  assert.equal(isDeclarativeSourceProof(proof),true);assert.equal(isDeclarativeSourceProof(structuredClone(proof)),false);
  assert.throws(()=>taskLocalSourceDefinitions(structuredClone(proof)),/Unsealed/);
  const definitions=taskLocalSourceDefinitions(proof),fixture=JSON.parse(readFileSync(new URL('../fixtures/task-local-originals.json',import.meta.url),'utf8'));
  assert.equal(fixture.invocations.length,7);
  for(const pin of fixture.invocations) {
    const source=readFileSync(new URL(pin.file,root),'utf8');assert.equal(hash(source),pin.sourceSha256);
    const original=source.slice(pin.span.start,pin.span.end);assert.equal(original,pin.original);assert.equal(hash(original),pin.invocationSha256);
    const input=originalMacroInvocation(original);assert.deepEqual(input.path,['tokio','task_local']);
    const first=expandDeclarativeMacro(definitions.get('task_local'),input.trees);
    const at=first.trees.findIndex(tree=>tree.text==='__task_local_inner');assert.ok(at>=0);
    assert.equal(first.trees[at+2].kind,'group');
    const inner=expandDeclarativeMacro(definitions.get('__task_local_inner'),declarativeSubInput(first,[at+2]));
    const staticAt=inner.trees.findIndex(tree=>tree.text==='static');assert.ok(staticAt>=0);
    const name=originalMacroTreeText(inner.trees[staticAt+1]);assert.match(name,/^[A-Z_]+$/);
    const observation=declarativeNamespaceObservation(inner);
    assert.deepEqual(observation.declarations.map(entry=>[entry.term,entry.name]),[['static',name]]);
    assert.equal(observation.dimensions.bangMacroComplete,false);
    assert.match(render(inner),/std :: thread_local !/);
    assert.equal(inner.namespaceComplete,false);assert.equal(inner.generatedBehavior,false);
    assert.ok(proof.outstandingClosure.some(obligation=>obligation.includes('cfg_if')));
  }
});
