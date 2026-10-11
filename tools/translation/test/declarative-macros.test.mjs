import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,isDeclarativeExpansion,declarativeNamespaceObservation} from '../declarative-macros.mjs';
import {originalMacroTrees,originalMacroInvocation,originalMacroTreeText} from '../macro-token-trees.mjs';
import {loadDeclarativeSourceProof,taskLocalSourceDefinitions,standardThreadLocalSourceDefinitions,standardCfgIfSourceDefinition,declarativeStandardInvocations,isDeclarativeSourceProof} from '../declarative-source-profile.mjs';
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
    'macro_rules! example {($($($($($($name:ident)*)*)*)*)*)=>{};}',
    'macro_rules! example {($name:ident,$name:ident)=>{};}',
    'macro_rules! example {($value:expr unexpected)=>{};}',
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

test('nested source repetition shapes retain empty rows and reject unequal transcription axes',()=>{
  const nested=compile('macro_rules! example {($(($($cell:ident),*));*)=>{$($($cell),*);*};}');
  const result=expandDeclarativeMacro(nested,originalMacroTrees('(first,second);();(third)'));
  assert.equal(render(result),'first , second ; ; third');
  const bad=compile('macro_rules! example {(($($left:ident),*)($($right:ident),*))=>{$($left $right)*};}');
  assert.throws(()=>expandDeclarativeMacro(bad,originalMacroTrees('(a,b)(c)')),/arity/);
  assert.throws(()=>compile('macro_rules! example {($($name:ident)*)=>{$name};}'),/depth/);
  const grouped=compile('macro_rules! example {($tree:tt)=>{$tree};}');
  const sender=expandDeclarativeMacro(grouped,originalMacroTrees('(value)'));
  const receiver=compile('macro_rules! example {((value))=>{GROUP};}');
  assert.equal(render(expandDeclarativeMacro(receiver,declarativeSubInput(sender))),'GROUP');
});

test('source metadata keeps nested conditional grammar opaque when forwarded',()=>{
  const sender=compile('macro_rules! example {($condition:meta)=>{$condition};}');
  const value=expandDeclarativeMacro(sender,originalMacroTrees('all(target_family="wasm",not(target_feature="atomics"))'));
  const receiver=compile('macro_rules! example {(all(target_family="wasm",not(target_feature="atomics")))=>{LITERAL};($condition:meta)=>{OPAQUE};}');
  assert.equal(render(expandDeclarativeMacro(receiver,declarativeSubInput(value))),'OPAQUE');
  for(const source of ['all(unknown!())','all(name=call())','all(name + other)'])assert.throws(()=>expandDeclarativeMacro(sender,originalMacroTrees(source)),/does not match/);
});

test('actual pinned cfg_if transcribes every original std branch without selecting a platform or closing its owner',()=>{
  const proof=loadDeclarativeSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  const definition=standardCfgIfSourceDefinition(proof);
  assert.throws(()=>standardCfgIfSourceDefinition(structuredClone(proof)),/Unsealed/);
  const invocations=declarativeStandardInvocations(proof,'library/std/src/sys/thread_local/mod.rs').filter(input=>input.path.join('::')==='cfg_if::cfg_if');
  assert.equal(invocations.length,1);
  assert.equal(invocations[0].sourceFileSha256,'cc0695932796bb2997e321abcc30d55efaa710cb5c7badfbc143af84cc71daab');
  const front=expandDeclarativeMacro(definition,invocations[0].trees);
  let frame=expandDeclarativeMacro(definition,declarativeSubInput(front,invocationPath(front.trees,'cfg_if')));
  const branches=[],guards=[];
  for(let count=0;frame.trees.length;count++) {
    assert.ok(count<4,'actual finite source branch recursion stays bounded');
    const calls=[];
    for(let at=0;at<frame.trees.length;at++)if(frame.trees[at].text==='cfg_if'&&frame.trees[at+1]?.text==='!'&&frame.trees[at+2]?.kind==='group')calls.push(at+2);
    assert.equal(calls.length,2);
    guards.push(render(frame));
    const identity=expandDeclarativeMacro(definition,declarativeSubInput(frame,[calls[0]]));
    branches.push(render(identity));
    assert.equal(identity.namespaceComplete,false);assert.equal(identity.ownerVerified,false);
    frame=expandDeclarativeMacro(definition,declarativeSubInput(frame,[calls[1]]));
  }
  assert.equal(branches.length,3);
  for(const [index,name] of ['no_threads','native','os'].entries())assert.match(branches[index],new RegExp('mod '+name+' ;'));
  assert.ok(guards.every(value=>value.includes('not (any (')));
  assert.match(guards[0],/target_family/);assert.match(guards[1],/target_thread_local/);
  assert.equal(frame.namespaceComplete,false);assert.equal(frame.generatedBehavior,false);
});

test('checked block expressions retain opacity and refuse unsupported statements or expression grammar',()=>{
  const block=compile('macro_rules! example {($value:block)=>{$value};}');
  const receiver=compile('macro_rules! example {($value:expr)=>{$value};}');
  const first=expandDeclarativeMacro(block,originalMacroTrees('{ const VALUE:u8=7; call(VALUE) }'));
  const forwarded=expandDeclarativeMacro(receiver,declarativeSubInput(first));
  assert.equal(forwarded.trees[0].fragment,'expr');assert.equal(forwarded.trees[0].trees[0].fragment,'block');
  for(const source of ['{ let value=1;value }','{ unknown!() }','{ #[unknown] const VALUE:u8=7;VALUE }','{ const VALUE:u8=;VALUE }','{ VALUE+1 }']) {
    assert.throws(()=>expandDeclarativeMacro(block,originalMacroTrees(source)),/does not match/);
  }
  assert.throws(()=>expandDeclarativeMacro(receiver,originalMacroTrees('unsafe {7}')),/does not match/);
  assert.throws(()=>expandDeclarativeMacro(receiver,originalMacroTrees('function::<u8>()')),/does not match/);
});

function invocationPath(trees,name,prefix=[]) {
  for(let at=0;at<trees.length;at++) {
    if(trees[at].text===name&&trees[at+1]?.text==='!'&&trees[at+2]?.kind==='group')return [...prefix,at+2];
    if(trees[at].kind==='group') {
      const nested=invocationPath(trees[at].children,name,[...prefix,at]);if(nested)return nested;
    }
  }
  return null;
}

test('original std transcribers forward actual nested key expressions across every pinned leaf without a closure claim',()=>{
  const proof=loadDeclarativeSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  assert.equal(proof.standardCfgIf.version,'1.0.1');
  assert.equal(proof.standardCfgIf.sha256,'9555578bc9e57714c812a1f84e4fc5b4d21fcb063490c624de019f7464c91268');
  const definitions=standardThreadLocalSourceDefinitions(proof);
  assert.throws(()=>standardThreadLocalSourceDefinitions(structuredClone(proof)),/Unsealed/);
  for(const initializer of ['const {7}','{ call(None) }']) {
    const front=expandDeclarativeMacro(definitions.get('thread_local'),originalMacroTrees('pub static KEY:u8='+initializer+';'));
    const path=invocationPath(front.trees,'thread_local_inner');assert.ok(path);
    for(const branch of ['no_threads','native','os']) {
      const declaration=expandDeclarativeMacro(definitions.get(branch),declarativeSubInput(front,path));
      assert.deepEqual(declarativeNamespaceObservation(declaration).declarations.map(value=>[value.term,value.name]),[['const','KEY']]);
      const keyPath=invocationPath(declaration.trees,'thread_local_inner');assert.ok(keyPath);
      let key=expandDeclarativeMacro(definitions.get(branch),declarativeSubInput(declaration,keyPath));
      if(branch==='os'&&initializer.startsWith('const')) {
        const recursivePath=invocationPath(key.trees,'thread_local_inner');assert.ok(recursivePath);
        key=expandDeclarativeMacro(definitions.get(branch),declarativeSubInput(key,recursivePath));
        assert.match(render(key),/INIT_EXPR/);
      }
      assert.equal(key.ownerVerified,false);assert.equal(key.namespaceComplete,false);assert.equal(key.generatedBehavior,false);
    }
  }
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
