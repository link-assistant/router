import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {certifyCopyType,lowerCopyMethodTokens,extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {macroProvenance} from '../macro-provenance.mjs';
import {sourceItems} from '../rust-structure.mjs';
const U8={kind:'fixed',bits:8,signed:false},span={start:31,end:55};
function context(source='#[derive(Clone, Copy)] enum Kind { A, B(u8) }') {
  const checked=checkProgram(parseRust(source+'\nfn main() {}'));
  return {declarations:checked.declarations,implementations:[],macroProvenance:macroProvenance(source),span};
}
const kind={kind:'data',name:'Kind'};

test('checked Rust primitives and recursive source-derived layouts produce serializable evidence',()=>{
  const source='#[derive(Clone, Copy)] struct Inner { value: u8 } #[derive(Clone, Copy)] enum Kind { A, B(Inner, bool) }',options=context(source);
  const proof=certifyCopyType(kind,options);
  assert.equal(proof.verified,true);assert.deepEqual(proof.diagnostics,[]);
  assert.deepEqual(proof.proofs.map(proof=>proof.kind),['standard-primitive','source-derived','standard-primitive','source-derived']);
  assert.deepEqual(JSON.parse(JSON.stringify(proof)),proof);assert.ok(Object.isFrozen(proof.proofs));
  assert.equal(Object.isFrozen(options.span),false,'certification never freezes borrowed source spans');
  for(const type of [U8,{kind:'bool'},{kind:'unit'},{kind:'float'}])assert.equal(certifyCopyType(type,options).verified,true);
  for(const type of [{kind:'string'},{kind:'array',element:U8},{kind:'fixed',bits:7,signed:false},{kind:'named',path:['Kind']},{kind:'int'},{kind:'nat'}])assert.equal(certifyCopyType(type,options).verified,false);
});

test('actual standard Option and Result layouts require Copy evidence for every generic argument',()=>{
  const options=context('#[derive(Clone, Copy)] enum Kind { A } fn option(value: Option<u8>) -> Option<u8> { value } fn result(value: Result<u8, bool>) -> Result<u8, bool> { value } fn owned(value: Option<String>) -> Option<String> { value }');
  for(const name of ['option','result'])assert.equal(certifyCopyType(options.declarations.get(name).params[0].type,options).verified,true);
  assert.equal(certifyCopyType(options.declarations.get('owned').params[0].type,options).verified,false);
  const type=options.declarations.get('option').params[0].type,entry=options.declarations.get(type.name);
  for(const corrupted of [{...entry,standardGeneric:{kind:'Option',arguments:[{kind:'bool'}]}},{...entry,ctors:[entry.ctors[0]]},{...entry,standardGeneric:{kind:'Fake',arguments:[U8]}}]) {
    const declarations=new Map(options.declarations);declarations.set(type.name,corrupted);
    assert.equal(certifyCopyType(type,{...options,declarations}).verified,false);
  }
});

test('source ownership wrappers cannot acquire Copy through erased portable field types',()=>{
  for(const source of ['#[derive(Clone, Copy)] struct Kind(Box<u8>);','#[derive(Clone, Copy)] struct Kind(String);','#[derive(Clone, Copy)] struct Kind(Vec<u8>);','struct Kind(u8);','#[derive(Copy)] struct Kind(u8);']) {
    const proof=certifyCopyType(kind,context(source));assert.equal(proof.verified,false,source);assert.ok(proof.diagnostics.length);
  }
  const options=context();
  const entry=structuredClone(options.declarations.get('Kind'));delete entry.ctors[1].fields[0].rustTypeSyntax;
  const declarations=new Map(options.declarations);declarations.set('Kind',entry);
  assert.equal(certifyCopyType(kind,{...options,declarations}).verified,false);
});

test('shadowed derives, unknown import scopes and absent checked metadata retain refusals',()=>{
  const options=context();
  for(const evidence of [null,macroProvenance('use custom::Copy;'),macroProvenance('use custom::Clone;'),macroProvenance('use custom::*;'),macroProvenance('macro_rules! Copy { () => {} }')])assert.equal(certifyCopyType(kind,{...options,macroProvenance:evidence}).verified,false);
  const entry=options.declarations.get('Kind');
  for(const corrupted of [{...entry,fullName:'other.Kind'},{...entry,modulePath:null},{...entry,ctors:null}]) {
    const declarations=new Map(options.declarations);declarations.set('Kind',corrupted);
    assert.equal(certifyCopyType(kind,{...options,declarations}).verified,false);
  }
  assert.equal(certifyCopyType(kind).verified,false);
});

test('resolved implementation evidence rejects manual traits, Drop, conditional and unsafe targets',()=>{
  const options=context();
  for(const source of ['impl Drop for Kind { fn drop(&mut self) {} }','impl Copy for Kind {}','unsafe impl Send for Kind {}','#[cfg(feature="x")] impl Kind {}']) {
    const implementations=extractImplDeclarations(source).implementations.map(implementation=>({...implementation,resolvedType:kind}));
    assert.equal(certifyCopyType(kind,{...options,implementations}).verified,false,source);
  }
  const unrelated=extractImplDeclarations('impl Drop for Unrelated { fn drop(&mut self) {} }').implementations;
  assert.equal(certifyCopyType(kind,{...options,implementations:unrelated}).verified,false,'unresolved trait targets cannot be guessed unrelated');
  assert.equal(certifyCopyType(kind,{...options,implementations:unrelated.map(implementation=>({...implementation,resolvedType:{kind:'data',name:'Unrelated'}}))}).verified,true);
});

test('recursive value layouts cannot pass by coinductive assumption',()=>{
  const options=context(),entry=structuredClone(options.declarations.get('Kind'));
  entry.ctors[1].fields[0]={name:'field0',type:kind,rustTypeSyntax:['Kind']};
  const declarations=new Map(options.declarations);declarations.set('Kind',entry);
  const proof=certifyCopyType(kind,{...options,declarations});assert.equal(proof.verified,false);assert.match(proof.diagnostics.at(-1).message,/recursive/u);
});

test('by-value lowering discharges only the original plain self obligation and preserves const qualification',()=>{
  const options=context(),proof=certifyCopyType(kind,options),source='impl Kind { const fn message(self) -> &\'static str { match self { Self::A => "self Self", Self::B(_) => "b" } } }';
  const method=extractImplDeclarations(source).implementations[0].methods[0];
  assert.throws(()=>lowerSharedMethodTokens(method),error=>error.kind==='unsupported');
  const lowered=lowerCopyMethodTokens(method,kind,proof);
  assert.equal(lowered.receiver,'value');assert.equal(lowered.rewrites[0].kind,'copy-receiver');assert.equal(lowered.tokens[0].value,'const');
  assert.deepEqual(lowered.discharged,method.diagnostics);assert.ok(lowered.tokens.some(token=>token.kind==='string' && token.value==='self Self'));
  assert.ok(lowered.tokens.every(token=>token.start>=method.span.start && token.end<=method.span.end));
  assert.ok(lowered.assumptions.some(assumption=>/alias safety/u.test(assumption)));
  const serialized=JSON.parse(JSON.stringify(proof));assert.equal(lowerCopyMethodTokens(method,kind,serialized).copyCertificate.digest,proof.digest);
  serialized.verified=false;assert.throws(()=>lowerCopyMethodTokens(method,kind,serialized),/certificate/u);
  assert.throws(()=>lowerCopyMethodTokens(method,{kind:'data',name:'Wrong'},proof),/certificate/u);
});

test('Copy evidence never permits mutable, typed, unsafe, generic, conditional or trait methods',()=>{
  const proof=certifyCopyType(kind,context());
  for(const source of ['impl Kind { fn bad(&mut self) {} }','impl Kind { fn bad(mut self) {} }','impl Kind { fn bad(self: Kind) {} }','impl Kind { unsafe fn bad(self) {} }','impl Kind { fn bad<T>(self) {} }','#[cfg(feature="x")] impl Kind { fn bad(self) {} }','impl Kind { #[cfg(feature="x")] fn bad(self) {} }','impl Trait for Kind { fn bad(self) {} }']) {
    const method=extractImplDeclarations(source).implementations[0].methods[0];
    assert.throws(()=>lowerCopyMethodTokens(method,kind,proof),error=>error.kind==='unsupported',source);
  }
  const method=extractImplDeclarations('impl Kind { fn read(self) {} }').implementations[0].methods[0],corrupted=JSON.parse(JSON.stringify(proof));corrupted.proofs=[];
  assert.throws(()=>lowerCopyMethodTokens(method,kind,corrupted),/integrity/u);
  const collision=extractImplDeclarations('impl Kind { fn read(self,router_self:u8) {} }').implementations[0].methods[0];
  assert.throws(()=>lowerCopyMethodTokens(collision,kind,proof),/collides/u);
});

test('original FailureKind enum and original message method acquire a narrow checked Copy lowering',()=>{
  const source=readFileSync(new URL('../../../rust/src/stream_termination.rs',import.meta.url),'utf8'),item=sourceItems(source).find(item=>item.term==='enum' && item.name==='FailureKind');
  const options=context(source.slice(item.start,item.end)),type={kind:'data',name:'FailureKind'};
  const implementation=extractImplDeclarations(source).implementations.find(implementation=>implementation.typePath.join('::')==='FailureKind');
  options.implementations=[{...implementation,resolvedType:type}];
  const proof=certifyCopyType(type,options);assert.equal(proof.verified,true);
  const method=implementation.methods.find(method=>method.name==='message'),lowered=lowerCopyMethodTokens(method,type,proof);
  assert.equal(source.slice(method.span.start,method.span.end),method.source);assert.equal(method.const,true);
  assert.equal(lowered.tokens.find(token=>token.value==='INCOMPLETE_STREAM_MESSAGE').value,'INCOMPLETE_STREAM_MESSAGE');
  assert.deepEqual(proof.proofs[0].constructors.map(ctor=>[ctor.name,ctor.fields.length]),[['Stalled',0],['Interrupted',0],['Truncated',0]]);
});
