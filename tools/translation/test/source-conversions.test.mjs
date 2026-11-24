import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {HostRustParser,HostChecker} from '../extensions/host-contracts.mjs';
import {originalConversionInputs,originalConversionPlan,inspectConversionSource,requireOriginalConversionMember} from '../extensions/source-conversion-inputs.mjs';
import {parseOriginalConversionBodies,requireOriginalConversionEmission,checkOriginalSourceInto} from '../extensions/source-conversion-body.mjs';
import {captureSourceConversionScope,requireSourceConversionScope} from '../extensions/source-conversion-scope.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser} from '../matches-macro-context.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {rustFixedType,fixedBounds} from '../checked-types.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of Object.values(tree))for(const value of Array.isArray(child)?child:[child]){const result=find(value,predicate);if(result)return result;}return null;}
const refuse=source=>{const result=compile(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);};
const specs=[['into','into','fninto(self)->U','{U::from(self)}'],['identity','from','fnfrom(t:T)->T','{t}'],['string','from','fnfrom(s:&str)->String','{s.to_owned()}']];
test('nested original String and primitive conversions preserve every surrounding record field and caller binding',{timeout:60000},async()=>{
  const source='struct Packet{before:u64,label:String,flag:bool,identity:u64,after:u64,copied_flag:bool}pub fn packet(before:u64,flag:bool,after:u64,value:&str)->Packet{Packet{before,label:value.into(),flag,identity:before.into(),after,copied_flag:bool::from(flag)}}';
  const result=compile(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const before of [0n,7n,18446744073709551615n])for(const flag of [false,true])for(const value of ['','ascii','É😀','\0']){
      const after=before===0n?18446744073709551615n:0n,actual=api.packet(before,flag,after,value);
      assert.deepEqual(actual,{$:'Packet',before,label:value,flag,identity:before,after,copied_flag:flag});assert.ok(Object.isFrozen(actual));
    }
  },{childTimeoutMs:30000});
});
test('complete original source selection preserves all three actual members traits attrs and allocation boundary',()=>{
  const plan=originalConversionPlan(),files=originalConversionInputs();assert.equal(files.size,5);files.clear();assert.equal(originalConversionInputs().size,5);
  for(const [key]of specs){const member=plan[key],source=originalConversionInputs().get(member.path).source;assert.equal(member.memberOriginalSource,source.slice(member.memberOriginalSpan.start,member.memberOriginalSpan.end));assert.equal(member.implOriginalSource,source.slice(member.implOriginalSpan.start,member.implOriginalSpan.end));assert.equal(member.bodySource,source.slice(member.bodyOriginalSpan.start,member.bodyOriginalSpan.end));assert.strictEqual(requireOriginalConversionMember(member),member);assert.throws(()=>requireOriginalConversionMember(structuredClone(member)),/copied or unselected/);}
  assert.equal(plan.into.sourceSha256,'0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab');assert.equal(plan.string.sourceSha256,'46dadb69bbe909b50146366020dc23d4fa88f53b93435b7e0f70c6692d0ba629');assert.match(plan.string.implOriginalSource,/no_global_oom_handling/u);assert.match(plan.traits.Into.originalDeclaration,/fn into\(self\) -> T/u);assert.equal(plan.allocationBoundary.allocatorTranslated,false);assert.equal(plan.allocationBoundary.unsafeUtf8Translated,false);assert.equal(plan.allocationBoundary.oomTranslated,false);assert.equal(plan.runtimeParity,false);
});
test('original AST bodies are privately parsed and caller copies cannot select rewritten Rust',()=>{
  const bodies=parseOriginalConversionBodies();assert.equal(bodies.into.fn.path.join('::'),'U::from');assert.equal(bodies.from.body.operation,'to_owned');assert.equal(bodies.identity.path[0],'t');bodies.from.body.operation='as_str';assert.equal(parseOriginalConversionBodies().from.body.operation,'to_owned');assert.throws(()=>parseOriginalConversionBodies(class extends HostRustParser{}),/actual original Host parser/);
  for(const [key,name,signature,body]of specs){const member=originalConversionPlan()[key],source=originalConversionInputs().get(member.path).source,options={header:member.header,name,signature,body};const inspection=inspectConversionSource(source,options);assert.equal(inspection.sourceAuthority,false);assert.throws(()=>requireOriginalConversionMember(inspection),/copied or unselected/);for(const [before,after]of [[member.bodySource,member.bodySource.replace(key==='string'?'to_owned':key==='identity'?'t':'from','unknown')],[member.implOriginalSource,'#[cfg(any())]\n'+member.implOriginalSource],[member.memberOriginalSource,member.memberOriginalSource.replace('#[inline', '#[unknown')]])assert.throws(()=>inspectConversionSource(source.replace(before,after),options),/Original source conversion/);}
});
test('expected String conversion executes original Into delegation in JS and independently strict TS',async()=>{
  const result=compile('pub fn literal()->String{"É😀\\0".into()}pub fn text(v:&str)->String{v.into()}pub fn err()->Result<(),String>{Err("failure".into())}pub fn optional()->Option<String>{Some("owned".into())}pub fn trimmed(v:&str)->String{v.trim_end_matches(\'/\').into()}pub fn returned(v:&str)->String{view(v).into()}fn view(v:&str)->&str{v}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.literal(),'É😀\0');for(const value of ['','ascii','É😀','\0','a\r\nb','𝄞'])assert.equal(api.text(value),value);assert.deepEqual(api.err(),{$:'Err',field0:'failure'});assert.deepEqual(api.optional(),{$:'Some',field0:'owned'});assert.equal(api.trimmed('https://example///'),'https://example');assert.equal(api.returned('input'),'input');for(const value of [null,0n,{},true,'\ud800'])assert.throws(()=>api.text(value));},{childTimeoutMs:30000});
  const conversion=find(result.meta.checkedSemanticProgram,node=>node.k==='routerSourceConversion');assert.ok(conversion);assert.equal(conversion.sourceConversionProof.bindings.U.rustOwnership.source,'String');assert.equal(conversion.sourceConversionProof.ownershipOperation.operation,'to_owned');assert.equal(conversion.sourceConversionProof.constTraitCall,false);assert.equal(conversion.sourceConversionProof.allocationBoundary.globalOomCapabilityInferred,false);
});
test('all eleven primitive identities execute the actual reflexive From body through Into',async()=>{
  const names=['bool',...'iu'.split('').flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))],result=compile(names.map(name=>`pub fn identity_${name}(v:${name})->${name}{v.into()}`).join(' '));assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of names){const values=name==='bool'?[false,true]:[fixedBounds(rustFixedType(name)).min,0n,1n,fixedBounds(rustFixedType(name)).max];for(const value of values)assert.equal(api['identity_'+name](value),value);assert.throws(()=>api['identity_'+name](name==='bool'?0n:0));}},{childTimeoutMs:30000});const proof=find(result.meta.checkedSemanticProgram,node=>node.k==='routerSourceConversion').sourceConversionProof;assert.equal(proof.identityBodyProof.selection.sized.sizedTraitImplementationTranslated,false);assert.equal(proof.allocationBoundary,null);
});
test('original method-local conversion is independent of an unrelated sibling method macro',async()=>{
  const result=compile('struct Payload{value:String}impl Payload{pub fn make(v:&str)->Self{Self{value:v.into()}}fn other()->String{format!("other")}}pub fn make(v:&str)->Payload{Payload::make(v)}');assert.deepEqual(result.meta.refused,[]);assert.ok(result.meta.checkedMethods.some(row=>row.name==='Payload.make'));await verifyTypedTargets(result,api=>assert.deepEqual(api.make('É😀'),{$:'Payload',value:'É😀'}),{childTimeoutMs:30000});
});
test('exact original reference matching and emitter binder renaming preserve nominal fields and source names',async()=>{
  const result=compile('struct Payload{value:&\'static str}pub fn field(v:&Payload)->String{v.value.into()}pub fn rp_6170(v:&str)->&str{v}pub fn call(v:&str)->String{rp_6170(v).into()}pub fn reserved(function:&str)->String{function.into()}pub fn shadow(v:&str)->String{let v=v.trim();v.into()}');assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{assert.equal(api.field({$:"Payload",value:"É😀"}),'É😀');assert.equal(api.call('text'),'text');assert.equal(api.reserved('keyword'),'keyword');assert.equal(api.shadow('  text  '),'text');},{childTimeoutMs:30000});
});
test('typed result computation and caller proof replay reject altered forged bodies without trusting digest alone',()=>{
  const result=compile('pub fn text(v:&str)->String{v.into()}'),node=find(result.meta.checkedSemanticProgram,node=>node.k==='routerSourceConversion');assert.ok(requireOriginalConversionEmission(node));assert.ok(requireOriginalConversionEmission(structuredClone(node)));
  for(const mutate of [copy=>copy.body.body.k='var',copy=>copy.body.value.name='different',copy=>copy.type.rustOwnership.source='str',copy=>copy.constEligible=true,copy=>copy.sourceConversionProof.digest='0'.repeat(64),copy=>copy.sourceConversionProof.selectedFrom.bodySource='{s}',copy=>copy.sourceConversionProof.caller.sourceSha256='0'.repeat(64)]){const copy=structuredClone(node);mutate(copy);assert.throws(()=>requireOriginalConversionEmission(copy),/changed or forged/);}
  const checker=new HostChecker('rust',[]);checker.program({language:'rust',items:[],main:null});assert.throws(()=>checkOriginalSourceInto({...checker}, {},{},new Map(),[],{}),/actual original Host checker/);assert.throws(()=>checkOriginalSourceInto(new Proxy(checker,{}),{}, {},new Map(),[],{}),/actual original Host checker/);
  assert.throws(()=>checkOriginalSourceInto(checker,{k:'routerSourceIntoCall',sourceConversionScope:node.sourceConversionProof.caller,args:[],span:node.span},node.body.value,new Map(),[],node.type),/privately captured source-call/);
});
test('original caller tokenizer namespace callbacks and member ambiguity are independently authenticated',()=>{
  const source='pub fn text(v:&str)->String{v.into()}',parser=new HostRustParser(tokenizeRust(source));configureMatchesMacroParser(parser,standaloneMatchesMacroContext(source),{file:'src/module.rs'});const proof=captureSourceConversionScope(parser,source.indexOf('into'));assert.ok(requireSourceConversionScope(structuredClone(proof)));assert.throws(()=>requireSourceConversionScope({...proof,sourceSha256:'0'.repeat(64)}),/unissued/);assert.throws(()=>captureSourceConversionScope(parser,source.indexOf('into')+1),/call point/);parser.resolveSourceNamespace=()=>['String'];assert.throws(()=>captureSourceConversionScope(parser,source.indexOf('into')),/namespace callbacks/);
});
const negatives=[
  'pub fn bad(v:&str)->String{v.into(1)}',
  'pub fn bad(v:&str)->&str{v.into()}',
  'pub fn bad(v:&str)->u64{v.into()}',
  'pub fn bad(v:String)->String{v.into()}',
  'pub fn bad(v:String)->String{let a=v.into();v}',
  'pub fn bad(v:&String)->String{v.into()}',
  'pub fn bad(v:&u64)->u64{v.into()}',
  'pub fn bad(v:u8)->u16{v.into()}',
  'pub fn bad(v:f64)->f64{v.into()}',
  'pub fn bad(v:usize)->usize{v.into()}',
  'pub fn bad(v:isize)->isize{v.into()}',
  'pub fn bad(v:&str)->String{let value=v.into();value}',
  'pub const fn bad()->String{"x".into()}',
  'pub const bad:String="x".into();',
  'trait Into{fn into(self)->String;}pub fn bad(v:&str)->String{v.into()}',
  'trait Other{fn into(self)->String;}pub fn bad(v:&str)->String{v.into()}',
  'trait Other{fn from(v:&str)->String;}pub fn bad(v:&str)->String{v.into()}',
  'trait Base{fn into(self)->String;}trait Other:Base{}pub fn bad(v:&str)->String{v.into()}',
  'mod hidden{pub trait Other{fn into(self)->String;}}use crate::hidden::Other as _;pub fn bad(v:&str)->String{v.into()}',
  'use missing::Other;pub fn bad(v:&str)->String{v.into()}',
  'use missing::*;pub fn bad(v:&str)->String{v.into()}',
  'type String=u64;pub fn bad(v:&str)->String{v.into()}',
  '#![no_implicit_prelude]pub fn bad(v:&str)->String{v.into()}',
  'mod std{}pub fn bad(v:&str)->String{v.into()}',
  'pub fn bad(v:&str)->String{trait Other{fn into(self)->String;}v.into()}',
  'macro_rules! emit{()=>{trait Into{fn into(self)->String;}}}emit!();pub fn bad(v:&str)->String{v.into()}',
  'impl std::convert::From<&str> for String{fn from(v:&str)->Self{"wrong".to_owned()}}pub fn bad(v:&str)->String{v.into()}',
  'impl<T> std::convert::From<T> for T{fn from(t:T)->T{t}}pub fn bad(v:u8)->u8{v.into()}',
  'pub fn bad(v:impl Into<String>)->String{v.into()}',
];
for(const [index,source]of negatives.entries())test('conversion retains source/ownership/inference refusal '+index,()=>refuse(source));
