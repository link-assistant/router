import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fixedIntegerContracts} from '../extensions/fixed-integer-contracts.mjs';
import {createFixedIntegerRuntime} from '../extensions/fixed-integer-runtime.mjs';
import {pinnedFixedWrapping,requireFixedWrappingProof,FIXED_WRAPPING_SOURCE_PROFILE} from '../extensions/fixed-wrapping-source.mjs';
import {translateProject} from '../project.mjs';
import {loadJavaScript} from './artifact-loader.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {numericSourceInputsFromFiles,compileNumericSourceStages,emitNumericSourceStage} from '../serialization-schema/numeric-source-stage.mjs';
const type=(bits,signed)=>({kind:'fixed',bits,signed,rustPrimitiveName:(signed?'i':'u')+bits}),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const max64=(1n<<64n)-1n;
let actualStage;
function original(){if(actualStage)return actualStage;const inputs=numericSourceInputsFromFiles({manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')});return actualStage=compileNumericSourceStages(inputs,{candidateConfiguration:{flags:{test:false},values:{feature:[]},closedKeys:['feature']}});}

test('complete Rust1.89 macro intrinsic primitive-owner and license pins remain exact',()=>{
  const root=new URL('../source-profiles/fixed-wrapping/',import.meta.url);
  for(const pin of FIXED_WRAPPING_SOURCE_PROFILE.sources){const encoded=readFileSync(new URL(pin.file,root)),raw=gunzipSync(encoded);assert.equal(encoded.length,pin.compressedBytes);assert.equal(hash(encoded),pin.compressedSha256);assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),pin.gitBlobSha);}
  assert.equal(FIXED_WRAPPING_SOURCE_PROFILE.wholeMacroExpansion,false);assert.equal(FIXED_WRAPPING_SOURCE_PROFILE.traitComplete,false);assert.equal(FIXED_WRAPPING_SOURCE_PROFILE.formatterEquivalence,false);
});

test('primitive wrapping specialization consumes actual Self width signature body and generic intrinsic',()=>{
  for(const bits of [8,16,32,64,128])for(const signed of [false,true])for(const method of ['wrapping_add','wrapping_sub']){
    const fixed=type(bits,signed),proof=pinnedFixedWrapping(fixed,method),contract=fixedIntegerContracts(fixed).contracts.find(entry=>entry.rustPath.at(-1)===method);
    assert.equal(requireFixedWrappingProof(proof,fixed,method),proof);assert.equal(contract.sourceWrappingProof,proof);assert.equal(proof.checkedBody.width,bits);assert.equal(proof.checkedBody.signed,signed);assert.equal(proof.checkedBody.parameters.every(parameter=>parameter.type===fixed.rustPrimitiveName),true);assert.equal(proof.checkedBody.ret,fixed.rustPrimitiveName);
    assert.equal(contract.constSince,'1.32.0');assert.equal(contract.constEligible,true);assert.equal(contract.ret.kind,'fixed');assert.equal(proof.runtimeParity,false);
  }
});

test('copied source proofs forged widths and unsupported methods cannot acquire checked specialization',()=>{
  const fixed=type(64,false),proof=pinnedFixedWrapping(fixed,'wrapping_add');
  assert.throws(()=>requireFixedWrappingProof(structuredClone(proof),fixed,'wrapping_add'),/private original/);
  assert.throws(()=>requireFixedWrappingProof(proof,type(32,false),'wrapping_add'),/private original/);
  for(const bad of [{...fixed,rustPrimitiveName:'i64'},{...fixed,rustPrimitiveName:'Custom'},{...fixed,rustPrimitiveName:'usize'},{...fixed,bits:7},{kind:'float'}])assert.throws(()=>pinnedFixedWrapping(bad,'wrapping_add'));
  assert.throws(()=>pinnedFixedWrapping(fixed,'wrapping_mul'));
  // Existing pointer-width arithmetic still works; the new feature refuses it.
  const pointer=fixedIntegerContracts({...fixed,rustPrimitiveName:'usize'});assert.equal(pointer.contracts.some(entry=>entry.rustPath.at(-1)==='checked_add'),true);assert.equal(pointer.contracts.some(entry=>entry.rustPath.at(-1)==='wrapping_add'),false);
});

test('signed and unsigned literal modular boundaries retain independent exact expectations',()=>{
  const unsigned=createFixedIntegerRuntime(type(8,false)),signed=createFixedIntegerRuntime(type(8,true));
  for(const [method,left,right,expected] of [['wrapping_add',255n,1n,0n],['wrapping_add',200n,255n,199n],['wrapping_sub',0n,1n,255n],['wrapping_sub',100n,255n,101n]])assert.equal(unsigned['rust_fixed_'+method](left,right),expected);
  for(const [method,left,right,expected] of [['wrapping_add',127n,1n,-128n],['wrapping_add',-128n,-1n,127n],['wrapping_sub',-128n,1n,127n],['wrapping_sub',-2n,127n,127n],['wrapping_sub',127n,-1n,-128n]])assert.equal(signed['rust_fixed_'+method](left,right),expected);
});

test('all primitive widths including128 preserve two-complement residue without IEEE rounding',()=>{
  for(const bits of [8,16,32,64,128])for(const signed of [false,true]){
    const minimum=signed?-(1n<<BigInt(bits-1)):0n,maximum=(1n<<BigInt(signed?bits-1:bits))-1n,api=createFixedIntegerRuntime(type(bits,signed));
    assert.equal(api.rust_fixed_wrapping_add(maximum,1n),minimum);assert.equal(api.rust_fixed_wrapping_sub(minimum,1n),maximum);assert.equal(api.rust_fixed_wrapping_sub(maximum,maximum),0n);
  }
  const wide=createFixedIntegerRuntime(type(128,false));assert.equal(wide.rust_fixed_wrapping_add(340282366920938463463374607431768211455n,1n),0n);assert.equal(wide.rust_fixed_wrapping_sub(0n,1n),340282366920938463463374607431768211455n);
  assert.equal(createFixedIntegerRuntime(type(64,false)).rust_fixed_wrapping_add(9007199254740993n,2n),9007199254740995n);
});

test('invalid operands fail at their checked width before modular arithmetic can hide them',()=>{
  const api=createFixedIntegerRuntime(type(8,false));for(const value of [-1n,256n,0,'0',true,null,undefined])for(const method of ['rust_fixed_wrapping_add','rust_fixed_wrapping_sub']){assert.throws(()=>api[method](value,1n),TypeError);assert.throws(()=>api[method](1n,value),TypeError);}
});

test('ordinary Rust method callers execute generic modular arithmetic through shared JS and strict TS',async()=>{
  const result=project('pub fn add(x:u64,y:u64)->u64{x.wrapping_add(y)}pub fn sub(x:i8,y:i8)->i8{x.wrapping_sub(y)}pub const fn narrow(x:u8)->u8{x.wrapping_add(1)}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.add(max64,1n),0n);assert.equal(api.add(9007199254740993n,2n),9007199254740995n);assert.equal(api.sub(-128n,1n),127n);assert.equal(api.narrow(255n),0n);assert.throws(()=>api.add(-1n,1n));},{childTimeoutMs:30000});
});

test('actual shared primitive receivers copy values without admitting custom Deref or mutable loans',async()=>{
  const result=project('pub fn shared(x:&u64,y:u64)->u64{x.wrapping_add(y)}pub fn nested(x:&&u64)->u64{x.wrapping_sub(1)}');assert.deepEqual(result.meta.refused,[]);
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.shared(max64,1n),0n);assert.equal(api.nested(0n),max64);
  const mutable=project('pub fn invalid(x:&mut u64)->u64{x.wrapping_add(1)}');assert.equal(mutable.meta.executable.some(entry=>entry.name==='invalid'),false);
});

test('first-class original primitive function items retain source-owner and checked parameter identity',async()=>{
  const result=project('pub fn carried()->Vec<u8>{[255u8,0u8].into_iter().map(u8::wrapping_add).collect()}pub fn named()->u8{[255u8,1u8].iter().copied().fold(0u8,u8::wrapping_add)}');
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.named(),0n);
  // The two-argument function cannot pretend to be a one-item iterator callback.
  assert.equal(result.meta.executable.some(entry=>entry.name==='carried'),false);
});

test('mixed widths nominal numeric types floats and pointer profiles remain genuine source refusals',()=>{
  for(const source of ['pub fn bad(x:u64,y:u32)->u64{x.wrapping_add(y)}','pub fn bad(x:u64,y:i64)->u64{x.wrapping_sub(y)}','struct Custom{value:u64}pub fn bad(x:Custom)->Custom{x.wrapping_add(x)}','pub fn bad(x:f64)->f64{x.wrapping_add(1.0)}','pub fn bad(x:usize)->usize{x.wrapping_add(1)}']){
    const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);assert.notEqual(result.meta.refused.length,0);
  }
});

test('late source type aliases determine real width and shadowed associated owners cannot hijack primitive contracts',async()=>{
  const result=project('pub fn actual(x:u64)->u64{x.wrapping_add(1)}type u64=u8;'),api=(await loadJavaScript(result.javascript)).translated;
  assert.equal(api.actual(255n),0n);assert.throws(()=>api.actual(256n));
  const forged=project('struct u64{value:u8}pub fn fake(x:u64)->u64{u64::wrapping_add(x,x)}');assert.equal(forged.meta.executable.some(entry=>entry.name==='fake'),false);
});

test('constant evaluation outside its admitted host profile remains explicit rather than claiming formatter constants',()=>{
  const result=project('const WRAPPED:u8=255u8.wrapping_add(1);pub fn ordinary(x:u8)->u8{x.wrapping_add(1)}');
  assert.equal(result.meta.executable.some(entry=>entry.name==='ordinary'),true);assert.equal(result.meta.executable.some(entry=>entry.name==='WRAPPED'),false);assert.equal(result.meta.refused.some(entry=>entry.name==='WRAPPED'),true);
});

test('original locked wide-add high-word function preserves exact carry using its unchanged Rust body',async()=>{
  const stage=original();assert.equal(stage.translationFailure,null);
  assert.ok(stage.meta.executable.some(entry=>entry.name==='umul128_add_hi64'));assert.equal(stage.meta.refused.some(entry=>entry.name==='umul128_add_hi64'),false);
  await verifyTypedTargets({...emitNumericSourceStage(stage),meta:stage.meta},api=>{
    assert.equal(api.umul128_add_hi64(max64,max64,max64),max64);assert.equal(api.umul128_add_hi64(max64,1n,1n),1n);assert.equal(api.umul128_add_hi64(0n,max64,max64),0n);
    assert.equal(api.umul128_add_hi64(9007199254740993n,1n,0n),0n);assert.throws(()=>api.umul128_add_hi64(-1n,1n,0n));
  },{childTimeoutMs:30000});
  assert.equal(stage.configuration.authority,false);assert.equal(stage.formatterEquivalence,false);
});

test('actual original umul192_hi128 retains remaining namespace record derive and cfg obligations',async()=>{
  const stage=original();assert.equal(stage.translationFailure,null);const api=(await loadJavaScript(emitNumericSourceStage(stage).javascript)).translated;
  assert.equal(Object.hasOwn(api,'umul192_hi128'),false);
  const carry=project('pub fn carry(value:bool)->u64{u64::from(value)}'),converted=(await loadJavaScript(carry.javascript)).translated;assert.equal(converted.carry(true),1n);assert.equal(converted.carry(false),0n);
  assert.equal(stage.unsafeMemory,false);assert.equal(stage.runtimeParity,false);assert.equal(stage.formatterEquivalence,false);
});
