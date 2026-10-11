import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {HostChecker} from '../extensions/host-contracts.mjs';
import {loadJavaScript} from './artifact-loader.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
const program=result=>parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
const find=(value,predicate)=>value&&typeof value==='object'?(predicate(value)?value:Object.entries(value).filter(([key])=>!['type','copyCertificate'].includes(key)).map(([,child])=>Array.isArray(child)?child.map(item=>find(item,predicate)).find(Boolean):find(child,predicate)).find(Boolean)):null;

test('shared source receiver lowering retains original ampersand and exact receiver evidence',()=>{
  const source='impl Counter { pub fn read(&self)->u64 { self.value } }',method=extractImplDeclarations(source).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate','Counter']);
  const at=lowered.tokens.findIndex(token=>token.value==='router_self');
  assert.deepEqual(lowered.tokens.slice(at,at+4).map(token=>token.value),['router_self',':','&','crate']);
  assert.equal(source.slice(lowered.sharedReceiverSource.span.start,lowered.sharedReceiverSource.span.end),'&self');
  assert.deepEqual(lowered.sharedReceiverSource.tokens.map(token=>source.slice(token.span.start,token.span.end)),['&','self']);
  assert.equal(lowered.tokens[at+2].generated,undefined);
});

test('owned and shared actual Counter calls retain checked autoborrow and primitive Copy field reads',async()=>{
  const source='pub struct Counter{value:u64} impl Counter{pub fn read(&self)->u64{self.value} pub fn doubled(&self)->u64{self.read()+self.value}} pub fn owned(v:Counter)->u64{v.doubled()} pub fn shared(v:&Counter)->u64{v.read()} pub fn make(v:u64)->Counter{Counter{value:v}}';
  const result=project({'src/lib.rs':source});assert.deepEqual(result.meta.refused,[]);
  const checked=program(result),methods=[...checked.declarations.values()].filter(entry=>entry.impl);
  for(const entry of methods){assert.equal(entry.params[0].type.rustReference.kind,'shared');assert.equal(entry.params[0].type.rustReference.pointee.name,'Counter');assert.equal(source.slice(entry.impl.sharedReceiverSource.span.start,entry.impl.sharedReceiverSource.span.end),'&self');}
  assert.equal(find(checked.declarations.get('owned').body,node=>node.k==='routerSharedMethodReceiver').receiverProof.kind,'inherent-shared-autoborrow');
  assert.equal(find(checked.declarations.get('shared').body,node=>node.k==='routerSharedMethodReceiver').receiverProof.kind,'existing-shared-receiver');
  assert.equal(find(methods.find(entry=>entry.impl.method==='read').body,node=>node.k==='routerField').sharedProjectionProof.copy.primitive,'u64');
  const api=(await loadJavaScript(result.javascript)).translated,record=api.make(9n);
  assert.equal(api.owned(record),18n);assert.equal(api.shared(record),9n);assert.throws(()=>api.shared({$: 'Counter',value:1}),TypeError);
});

test('shared constructor-pattern bindings remain references and only checked fixed operators copy them',async()=>{
  const source='enum Counter{Counter(i32)} impl Counter{fn read(&self,extra:i32)->i32{match self{Self::Counter(value)=>value+extra}}} pub fn run(value:i32)->i32{Counter::Counter(value).read(5)}';
  const result=project({'src/lib.rs':source});assert.deepEqual(result.meta.refused,[]);
  const body=[...program(result).declarations.values()].find(entry=>entry.impl)?.body;
  const pattern=find(body,node=>node.sharedBindingProof)?.sharedBindingProof;
  assert.equal(pattern.bindings[0].type.rustReference.pointee.rustPrimitiveName,'i32');
  assert.equal(find(body,node=>node.k==='routerPrimitiveDereference').sourceFeature,'standard-fixed-operator-autoderef');
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.run(7n),12n);assert.throws(()=>api.run(2147483647n),RangeError);
  const invalid=project({'src/lib.rs':'enum Counter{Counter(u64)} impl Counter{fn read(&self)->u64{match self{Self::Counter(value)=>value}}} pub fn bad(v:Counter)->u64{v.read()}'});
  assert.equal(invalid.meta.executable.some(entry=>entry.name==='bad'),false);assert.ok(invalid.meta.refused.some(entry=>entry.term==='method'));
});

test('shared source fields never move String Vec or unchecked aggregates',()=>{
  for(const type of ['String','Vec<u8>','Payload']) {
    const source=(type==='Payload'?'struct Payload{value:u8} ':'')+`struct S{value:${type}} impl S{fn take(&self)->${type}{self.value}} pub fn bad(v:S)->${type}{v.take()}`;
    const result=project({'src/lib.rs':source});assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.term==='method'),source);
  }
  const source='enum S{Value(String)} impl S{fn take(&self)->String{match self{Self::Value(value)=>value}}} pub fn bad(v:S)->String{v.take()}';
  const result=project({'src/lib.rs':source});assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);assert.ok(result.meta.refused.some(entry=>entry.term==='method'));
});

test('derived Copy field reads consume verified source certificates and preserve exact production getter',async()=>{
  const source=readFileSync(new URL('../../../src/lefine.rs',import.meta.url),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
  assert.equal(hash(source),'bb07ea2db551cc85bc19403bfd2c160f439d6c48fe7ffc49a1e0cad249dc2093');
  const pins=[['enum','CatalogFailureKind',347,481,'ba2154daf3f33a700df7129835eb5b4760093a430d1315a140e03ba13fafeb14'],['struct','CatalogFailure',483,586,'6c707cf7b2b840df15afcae49444abd626dc380d6cece9015f7569f1273442a3'],['impl','CatalogFailure',588,818,'da84707a093a370174b5bfa6ea0c4a25768c13ae1c162738e43f2e3f31d4bde5']];
  const declarations=pins.map(([term,name,start,end,digest])=>{assert.ok(sourceItems(source).some(item=>item.term===term&&item.name===name&&item.start===start&&item.end===end));const text=source.slice(start,end);assert.equal(hash(text),digest);return text;});
  const full=project({'src/lib.rs':source});assert.equal(full.meta.checkedMethods.some(method=>method.name==='CatalogFailure.kind'),false,'unresolved imports cannot supply derive provenance');
  const result=project({'src/lib.rs':declarations.join('\n')});
  const checked=program(result),getter=[...checked.declarations.values()].find(entry=>entry.impl?.method==='kind');assert.ok(getter);
  const projection=find(getter.body,node=>node.k==='routerField');assert.equal(projection.sharedProjectionProof.copy.kind,'source-layout-copy');assert.equal(projection.sharedProjectionProof.copy.copyCertificate.verified,true);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),emitted=[...target.declarations.values()].find(entry=>entry.impl?.method==='kind'),module=await loadJavaScript(result.javascript+`\nexport {${emitted.name} as productionKind};`);
  const kind=Object.freeze({$:'Unavailable'});assert.strictEqual(module.productionKind(Object.freeze({$:'CatalogFailure',kind,message:'fixture'})),kind);
  const field=checked.declarations.get('CatalogFailure').ctors[0].fields.find(field=>field.name==='kind'),pointee=getter.params[0].type.rustReference.pointee;
  for(const mutate of [proof=>{proof.digest='0'.repeat(64)},proof=>{proof.type.name='wrong'}]){
    const forged=structuredClone(pointee),copy=forged.rustSharedFieldCopies.find(entry=>entry.field==='kind');mutate(copy.copyCertificate);
    assert.throws(()=>new HostChecker('Rust',[]).sharedFieldCopy(field,{name:'CatalogFailure'},forged,{start:0,end:1}),/matching verified layout evidence/);
  }
});

test('reference-typed fields copy the reference itself without inventing another borrow',async()=>{
  const result=project({'src/lib.rs':"struct S{value:&'static u64} impl S{fn read(&self)->&'static u64{self.value}} pub fn run(v:S)->&'static u64{v.read()}"});
  assert.deepEqual(result.meta.refused,[]);
  const getter=[...program(result).declarations.values()].find(entry=>entry.impl?.method==='read'),projection=find(getter.body,node=>node.k==='routerField');
  assert.equal(projection.sharedProjectionProof.copy.kind,'source-shared-reference-copy');assert.equal(projection.type.rustReference.pointee.rustReference,undefined);
  assert.equal((await loadJavaScript(result.javascript)).translated.run(Object.freeze({$:'S',value:7n})),7n);
});

test('shared receiver evaluates once and cross-module Copy certificates retain their original digest',async()=>{
  const source='mod model; pub fn build()->model::Counter{model::Counter::new(4)} pub fn run()->u64{build().read()}';
  const model='#[derive(Clone,Copy)] pub enum Kind{Ready} pub struct Counter{value:u64,kind:Kind} impl Counter{pub fn new(value:u64)->Self{Self{value,kind:Kind::Ready}} pub fn read(&self)->u64{self.value} pub fn kind(&self)->Kind{self.kind}}';
  const result=project({'src/lib.rs':source,'src/model.rs':model});assert.deepEqual(result.meta.refused,[]);
  const checked=program(result),getter=[...checked.declarations.values()].find(entry=>entry.impl?.method==='kind'),projection=find(getter.body,node=>node.k==='routerField');
  assert.equal(projection.sharedProjectionProof.copy.copyCertificate.verified,true);
  const certificate=projection.sharedProjectionProof.copy.copyCertificate,{digest,...evidence}=certificate;
  assert.equal(createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),digest);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),build=[...target.declarations.values()].find(entry=>entry.name===`rp_${Buffer.from('build').toString('hex')}`);
  const api=await loadJavaScript(result.javascript+`\nlet evaluations=0; const originalBuild=${build.name}; ${build.name}=()=>{evaluations++;return originalBuild();}; export const count=()=>evaluations;`);
  assert.equal(api.translated.run(),4n);assert.equal(api.count(),1);
});

test('checked shared receiver and pattern forwarding execute independently compiled TypeScript',async()=>{
  const source='struct Counter{value:u64} impl Counter{fn read(&self)->u64{self.value}} enum Amount{Amount(i32)} impl Amount{fn plus(&self,extra:i32)->i32{match self{Self::Amount(value)=>value+extra}}} pub fn read(v:&Counter)->u64{v.read()} pub fn own(v:Counter)->u64{v.read()} pub fn amount(v:i32)->i32{Amount::Amount(v).plus(5)}';
  const result=project({'src/lib.rs':source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{const record=Object.freeze({$:'Counter',value:12n});assert.equal(api.read(record),12n);assert.equal(api.own(record),12n);assert.equal(api.amount(7n),12n);assert.throws(()=>api.amount(2147483647n),RangeError);});
});
