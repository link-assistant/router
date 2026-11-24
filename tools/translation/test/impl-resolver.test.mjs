import test from 'node:test';
import assert from 'node:assert/strict';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {RustParser} from '../extensions/core.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/strings.mjs';

test('implementation extraction records actual static, shared, async and refused ownership receivers',()=>{
  const source=`// No implementation is hidden in a literal.
impl crate::Counter {
  pub const fn new(value: i32) -> Self { Self::Counter(value) }
  pub fn read(&self) -> i32 { match self { Self::Counter(value) => value } }
  async fn load(&self) -> i32 { 1 }
  fn consume(self) -> i32 { 1 }
  fn mutate(&mut self) -> i32 { 1 }
}`;
  const result=extractImplDeclarations(source,{sourcePath:'src/counter.rs',modulePath:['counter']});
  assert.equal(result.implementations.length,1);const implementation=result.implementations[0];
  assert.deepEqual(implementation.typePath,['crate','Counter']);assert.deepEqual(implementation.modulePath,['counter']);
  assert.deepEqual(implementation.methods.map(method=>[method.name,method.receiver,method.async,method.loweringReady]),[
    ['new',null,false,true],['read','shared',false,true],['load','shared',true,true],['consume','value',false,false],['mutate','mutable',false,false],
  ]);
  assert.equal(implementation.methods[0].const,true);assert.equal(result.diagnostics.length,2);
  for (const method of implementation.methods) {assert.equal(source.slice(method.span.start,method.span.end),method.source);assert.ok(source.slice(method.bodySpan.start,method.bodySpan.end).startsWith('{'));}
});
test('nested comments, raw strings and nested method groups preserve exact source spans',()=>{
  const source='/* 🦀 /* impl Fake {} */ */ impl Real { fn text() -> String { let s = r###"} impl Fake { Self self"###; s.to_string() } fn other(x: [i32; 2]) -> i32 { x[0] } }';
  const result=extractImplDeclarations(source);assert.equal(result.implementations.length,1);
  const [text,other]=result.implementations[0].methods;assert.equal(text.name,'text');assert.equal(other.name,'other');
  assert.equal(source.slice(text.bodySpan.start,text.bodySpan.end),'{ let s = r###"} impl Fake { Self self"###; s.to_string() }');
  const lowered=lowerSharedMethodTokens(text,['Real']);assert.equal(lowered.tokens.filter(token=>token.kind === 'string')[0].value,'} impl Fake { Self self');
});
test('generic targets, trait dispatch, unsafe code, cfg and mutable receivers remain explicit obligations',()=>{
  const source=`impl<T> Holder<T> { fn value(&self) -> i32 { 1 } }
impl Display for Holder { fn fmt(&self) -> i32 { 1 } }
unsafe impl Send for Holder { }
#[cfg(feature = "enabled")] impl Holder { fn feature(&self) -> i32 { 1 } }
impl Holder { fn generic<T>(&self, value:T) -> T { value } unsafe fn raw(&self) -> i32 { 1 } fn hidden(&self) -> i32 { unsafe { 1 } } }
impl Holder { const COUNT:i32 = 1; type Alias = i32; }`;
  const result=extractImplDeclarations(source);assert.equal(result.implementations.length,6);
  for (const method of result.implementations.flatMap(implementation=>implementation.methods)) {
    assert.equal(method.loweringReady,false);assert.throws(()=>lowerSharedMethodTokens(method),error=>error.kind === 'unsupported');
  }
  assert.ok(result.diagnostics.some(diagnostic=>/monomorphization/.test(diagnostic.message)));
  assert.ok(result.diagnostics.some(diagnostic=>/dispatch/.test(diagnostic.message)));
  assert.ok(result.diagnostics.some(diagnostic=>/unsafe/.test(diagnostic.message)));
  assert.ok(result.diagnostics.some(diagnostic=>/compilation-condition/.test(diagnostic.message)));
  assert.ok(result.diagnostics.some(diagnostic=>/associated item/.test(diagnostic.message)));
});
test('self/Self lowering changes semantic tokens while preserving module self paths and literals',()=>{
  const source='impl Counter { fn read(&self) -> i32 { let message = "self Self"; self::offset() + self.value + Self::offset() } }';
  const method=extractImplDeclarations(source).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate','counter','Counter']);
  const tokens=lowered.tokens;
  assert.equal(tokens.find(token=>token.kind === 'string').value,'self Self');
  assert.ok(tokens.some((token,index)=>token.value === 'self' && tokens[index+1]?.value === '::'));
  assert.ok(tokens.some((token,index)=>token.value === 'router_self' && tokens[index+1]?.value === '.'));
  assert.equal(lowered.receiverName,'router_self');assert.deepEqual(lowered.rewrites[0].typePath,['crate','counter','Counter']);
  assert.ok(tokens.every(token=>token.start >= method.span.start && token.end <= method.span.end));
  const collision=extractImplDeclarations('impl Counter { fn read(&self,router_self:i32)->i32 { router_self } }').implementations[0].methods[0];
  assert.throws(()=>lowerSharedMethodTokens(collision),/collides/);
});
test('lowered shared method checks and executes through the copied meta-language pipeline',async()=>{
  const source='impl Counter { fn read(&self, extra:i32) -> i32 { match self { Self::Counter(value) => value + extra } } }';
  const method=extractImplDeclarations(source).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['Counter']);
  const parser=new RustParser(lowered.tokens);parser.attributes();parser.visibility();
  const methodSurface=parser.fn([]),dataSurface=parseRust('enum Counter { Counter(i32) } fn main() {}');
  const checked=checkProgram({language:'Rust',items:[...dataSurface.items,methodSurface],main:null});
  const module=await import('data:text/javascript;base64,'+Buffer.from(emitJavaScript(checked).text+'\nexport {read};').toString('base64'));
  assert.equal(module.read(Object.freeze({$:'Counter',field0:7n}),5n),12n);
  assert.throws(()=>module.read(Object.freeze({$:'Counter',field0:2147483647n}),1n),/overflow/);
  assert.throws(()=>module.read(Object.freeze({$:'Counter',field0:'7'}),5n),/domain/);
});
