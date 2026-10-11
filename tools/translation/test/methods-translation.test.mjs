import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {trackedSource} from '../bulk.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {fileURLToPath} from 'node:url';
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
const load=text=>import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
function strict(result) {
  const directory=mkdtempSync(join(tmpdir(),'router-checked-methods-'));
  try {writeFileSync(join(directory,'module.ts'),result.typescript);execFileSync(process.env.ROUTER_TSC??'/Users/konard/.bun/bin/tsc',['--strict','--target','ES2022','--module','ES2022','--noEmit',join(directory,'module.ts')],{encoding:'utf8'});}finally{rmSync(directory,{recursive:true,force:true});}
}
test('associated constructors, receiver fields and method-to-method calls check across real module scopes',async()=>{
  const sources={
    'src/lib.rs':'mod counter; use crate::counter::Counter as Count; pub fn run(value:i32) -> i32 { let count = Count::new(value); count.double() }',
    'src/counter.rs':'pub struct Counter { value:i32 } impl Counter { pub fn new(value:i32) -> Self { Self { value } } fn read(&self, extra:i32) -> i32 { self.value + extra } pub fn double(&self) -> i32 { self.read(self.value) } }',
  };
  const result=project(sources);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedMethods.length,3);assert.equal(result.meta.runtimeParity,false);
  strict(result);const api=(await load(result.javascript)).translated;assert.equal(api.run(6n),12n);assert.throws(()=>api.run(2147483647n),/overflow/);
  const draft=translateSource(sources['src/lib.rs'],'src/lib.rs',{projectDeclarations:result.executableDeclarations});
  assert.equal(draft.ir.counts.executableFunctions,1);assert.equal((await load(draft.javascript)).translated.run(5n),10n);strict(draft);
});
test('checked enum methods preserve matching and scalar domain guards',async()=>{
  const result=project({'src/lib.rs':'enum Counter { Counter(i32) } impl Counter { fn read(&self,extra:i32) -> i32 { match self { Self::Counter(value) => value + extra } } } pub fn run(value:i32) -> i32 { Counter::Counter(value).read(5) }'});
  assert.deepEqual(result.meta.refused,[]);strict(result);const api=(await load(result.javascript)).translated;assert.equal(api.run(7n),12n);assert.throws(()=>api.run('7'),/domain/);
});
test('duplicate methods and calls of refused method bodies never expose a checked implementation',()=>{
  for(const implementation of [
    'fn read(&self)->i32 { self.value } fn read(&self)->i32 { self.value + 1 }',
    'fn read(&self)->i32 { missing(self.value) }',
    'fn read(&mut self)->i32 { self.value }',
  ]) {
    const result=project({'src/lib.rs':`struct Counter { value:i32 } impl Counter { ${implementation} } pub fn run(value:i32)->i32 { Counter { value }.read() }`});
    assert.ok(result.meta.refused.length);assert.equal(result.meta.executable.filter(entry=>entry.name === 'run').length,0);
  }
});
test('aggregate clone needs a checked trait or inherent body and is never erased into identity',()=>{
  const result=project({'src/lib.rs':'struct Counter { value:i32 } impl Clone for Counter { fn clone(&self)->Self { Counter { value:99 } } } pub fn run(value:i32)->i32 { let next = Counter { value }.clone(); next.value }'});
  assert.equal(result.meta.executable.filter(entry=>entry.name === 'run').length,0);assert.ok(result.meta.refused.some(entry=>/trait/.test(entry.message)));
});
test('known iterator spelling dispatches to a real custom data method before scalar adapters',async()=>{
  const result=project({'src/lib.rs':'struct Counter { value:i32 } impl Counter { fn count(&self)->i32 { self.value + 1 } } pub fn run(value:i32)->i32 { Counter { value }.count() }'});
  assert.deepEqual(result.meta.refused,[]);const api=(await load(result.javascript)).translated;assert.equal(api.run(6n),7n);strict(result);
});

test('inherent implementations resolve imported type aliases without guessing a local type',async()=>{
  const result=project({
    'src/lib.rs':'mod model; mod methods; use crate::model::Counter; pub fn run(value:i32)->i32 { Counter { value }.read() }',
    'src/model.rs':'pub struct Counter { pub value:i32 }',
    'src/methods.rs':'use crate::model::Counter as Count; impl Count { pub fn read(&self)->i32 { self.value + 2 } }',
  });
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedMethods.length,1);assert.equal((await load(result.javascript)).translated.run(7n),9n);strict(result);
});

test('module-local Option instantiations with equal type spellings retain distinct checked layouts',async()=>{
  const result=project({
    'src/lib.rs':'mod left; mod right; pub fn run(value:i32)->i32 { match left::make(value) { Some(x) => match right::make(value) { Some(y) => x.value + y.value, None => 0 }, None => 0 } }',
    'src/left.rs':'pub struct Item { pub value:i32 } pub fn make(value:i32)->Option<Item> { Some(Item { value }) }',
    'src/right.rs':'pub struct Item { pub value:i32 } pub fn make(value:i32)->Option<Item> { Some(Item { value:value + 1 }) }',
  });
  assert.deepEqual(result.meta.refused,[]);const names=result.meta.checkedSemanticProgram.program.declarations.$map.map(([name])=>name).filter(name=>name.startsWith('RouterOption'));
  assert.equal(new Set(names).size,3);assert.equal((await load(result.javascript)).translated.run(4n),9n);strict(result);
});

test('actual tracked production methods retain independent constructor and ref-update behavior',async()=>{
  const root=fileURLToPath(new URL('../../../',import.meta.url));
  const checked=async source=>{
    const result=translateProject({entry:source,paths:[source],readSource:path=>trackedSource(root,path)});
    const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
    const methods=[...program.declarations.values()].filter(entry=>entry.impl);
    const exports=methods.map(entry=>`[${JSON.stringify(entry.impl.method)}]: ${entry.name}`).join(',');
    return (await load(result.javascript+`\nexport const actualMethods = {${exports}};`)).actualMethods;
  };
  const catalog=await checked('src/lefine.rs');
  const kind=Object.freeze({$:'Unavailable'});
  const failure=catalog.new(kind,'independent production fixture');
  assert.deepEqual(failure,{$:'CatalogFailure',kind,message:'independent production fixture'});
  assert.equal(catalog.kind(failure),kind);assert.equal(Object.isFrozen(failure),true);
  const refs=await checked('src/git_proxy.rs');
  const zero='0000000000000000000000000000000000000000',ordinary='0123456789012345678901234567890123456789';
  assert.equal(refs.is_delete({$:'RefUpdate',old:ordinary,new:zero,name:'refs/heads/main'}),true);
  assert.equal(refs.is_create({$:'RefUpdate',old:ordinary,new:zero,name:'refs/heads/main'}),false);
  assert.equal(refs.is_create({$:'RefUpdate',old:zero,new:ordinary,name:'refs/heads/main'}),true);
  assert.throws(()=>refs.is_delete({$:'RefUpdate',old:ordinary,new:42,name:'refs/heads/main'}),TypeError);
});
