// SOURCE-ONLY DRAFT. All new cases are unrun until a coherent Gate window.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {optionStringAsDeref} from '../extensions/option-deref-runtime.mjs';
import {OPTION_DEREF_PROFILE} from '../extensions/option-deref.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {bindCheckedSourceLinks,checkedSourceContext} from '../extensions/source-links.mjs';
import {annotateRuntimeTypes} from '../translate.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
const pins=JSON.parse(readFileSync(new URL('./fixtures/option-deref-frontier.json',import.meta.url),'utf8'));
test('pinned Option String Deref preserves None, empty String and Unicode scalar content',()=>{
  assert.equal(OPTION_DEREF_PROFILE.rust,'1.89.0');assert.equal(OPTION_DEREF_PROFILE.constEligible,false);
  assert.deepEqual(optionStringAsDeref(none),none);
  for(const value of ['','x','😀Ω','\0','\u0085\uFEFF'])assert.deepEqual(optionStringAsDeref(some(value)),some(value));
  for(const value of [some('\ud800'),some('\udfff'),some(new String('x')),some(1n)])assert.throws(()=>optionStringAsDeref(value),TypeError);
});
test('Option Deref rejects proxies, accessors, prototypes and fake variants without calling code',()=>{
  let reads=0;const proxy=new Proxy(some('x'),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');}});
  assert.throws(()=>optionStringAsDeref(proxy),TypeError);assert.equal(reads,0);
  const accessor=Object.freeze({$: 'Some',get field0(){reads++;return 'x';}}),tag=Object.freeze({get $(){reads++;return 'None';}});
  for(const value of [accessor,tag,{$:'Some',field0:'x'},Object.freeze(Object.create(some('x'))),Object.freeze({$:'Other'}),Object.freeze({$:'None',field0:'x'}),Object.freeze({$:'Some',field0:'x',extra:1})])assert.throws(()=>optionStringAsDeref(value),TypeError);
  assert.equal(reads,0);
});
test('actual shared Option<String> receiver produces a borrowed result in both targets',{timeout:60_000},async()=>{
  const result=project('pub fn read(v:&Option<String>)->Option<&str>{v.as_deref()}pub fn explicit(v:&std::option::Option<String>)->std::option::Option<&str>{v.as_deref()}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of ['read','explicit']){assert.deepEqual(api[name](none),none);for(const value of ['','secret','😀'])assert.deepEqual(api[name](some(value)),some(value));let reads=0;const proxy=new Proxy(some('secret'),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');}});assert.throws(()=>api[name](proxy),TypeError);assert.equal(reads,0);}});
});
function methodTargets(declaration){
  const lowered=declaration.lower({runtimeModule:'../runtime/effects.mjs'}),emitted=lowered.emitted,target=emitted.mappings.find(mapping=>mapping.source===declaration.name).target,dataTypes=[...lowered.program.declarations.values()].filter(entry=>entry.k==='data');
  const javascript=emitted.text+'\nexport const translated=Object.freeze({'+JSON.stringify(declaration.name)+':'+target+'});\n',typescript=annotateRuntimeTypes(javascript,new Map(emitted.signatures.map(entry=>[entry.target,entry.params])),dataTypes,new Map(emitted.signatures.map(entry=>[entry.target,entry.ret])));
  return {meta:{entry:'src/lib.rs',runtimeParity:false},javascript,typescript,lowered};
}
test('actual checked inherent method facade retains shared declaration type without a Rust wrapper',{timeout:60_000},async()=>{
  const result=project('struct Holder{value:Option<String>}impl Holder{fn view(&self)->Option<&str>{self.value.as_deref()}}');assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.executable.length,0);assert.equal(result.executableDeclarations.length,0);
  const method=result.checkedMethodDeclarations.find(entry=>entry.displayName==='Holder.view');assert.ok(method);assert.equal(method.term,'method');assert.equal(method.signature.params[0].type.rustReference.kind,'shared');assert.equal(method.signature.ret.rustStandardGeneric.arguments[0].rustOwnership.source,'str');
  await verifyTypedTargets(methodTargets(method),api=>{for(const value of [none,some(''),some('Ω')])assert.deepEqual(api.view(Object.freeze({$:'Holder',value})),value);});
});
test('owned temporaries, local String borrows, custom Option/Deref and unknown aliases remain carried',()=>{
  for(const source of [
    'pub fn bad(v:Option<String>)->Option<&str>{v.as_deref()}',
    'pub fn bad(v:Option<String>)->Option<&\'static str>{v.as_deref()}',
    'pub fn bad()->Option<&\'static str>{Some(String::from("temporary")).as_deref()}',
    'pub fn bad(v:&Option<String>)->Option<&\'static str>{v.as_deref()}',
    'pub fn bad(v:&Option<&String>)->Option<&str>{v.as_deref()}',
    'pub fn bad(v:&mut Option<String>)->Option<&str>{v.as_deref()}',
    'enum Option{None,Some(String)}pub fn bad(v:&Option)->std::option::Option<&str>{v.as_deref()}',
    'struct String{value:u8}pub fn bad(v:&Option<String>)->Option<&str>{v.as_deref()}',
    'struct Custom{value:u8}impl std::ops::Deref for Custom{type Target=str;fn deref(&self)->&str{"custom"}}pub fn bad(v:&Option<Custom>)->Option<&str>{v.as_deref()}',
    'use external::String as Text;pub fn bad(v:&Option<Text>)->Option<&str>{v.as_deref()}',
    'pub const fn bad(v:&Option<String>)->Option<&str>{v.as_deref()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);}
});
const find=(value,kind)=>{if(!value||typeof value!=='object')return null;if(value.k===kind)return value;for(const child of Object.values(value)){const result=find(child,kind);if(result)return result;}return null;};
test('checked-body freshness and actual shared proof survive only unchanged emission',()=>{
  const source='pub fn read(v:&Option<String>)->Option<&str>{v.as_deref()}fn main(){}',program=checkProgram(parseRust(source)),context=checkedSourceContext(program),node=find(program.declarations.get('read').body,'routerOptionAsDeref');assert.ok(node);
  node.optionDerefProof.receiver='invented-local-borrow';assert.throws(()=>bindCheckedSourceLinks(program,context,{targetProfile:{id:'option-freshness'}}),/changed before source binding/);assert.throws(()=>emitJavaScript(program),/missing checked standard shared Option/);
});
// Build only ordinary immutable ABI fixtures from actual checked field types.
// This constructs no Rust source and never supplies an invented function body.
function fixture(type,declarations,depth=0){
  assert.ok(depth<=128,'bounded original ABI fixture');if(type.rustReference)return fixture(type.rustReference.pointee,declarations,depth+1);
  if(type.kind==='fixed')return 0n;if(type.kind==='bool')return false;if(type.kind==='string')return '';if(type.kind==='unit')return null;if(type.kind==='float')return 0;
  if(type.kind==='array')return Object.freeze(Array.from({length:type.rustFixedArray?.length??0},()=>fixture(type.element,declarations,depth+1)));
  assert.equal(type.kind,'data');const entry=declarations.get(type.name);assert.ok(entry);const ctor=[...entry.ctors].sort((a,b)=>a.fields.length-b.fields.length)[0];return Object.freeze(Object.fromEntries([['$',ctor.name],...ctor.fields.map(field=>[field.name,fixture(field.type,declarations,depth+1)])]));
}
let originalProject;
function originals(){if(originalProject)return originalProject;const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:30_000}).split('\0').filter(Boolean),deriveDependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});return originalProject=translateProject({entry:'src/lib.rs',paths,readSource:path=>readFileSync(new URL(path,root),'utf8'),compilationProfile:PRODUCTION_PROFILE,deriveDependencies});}
for(const pin of pins.pins)test(`pending unchanged ${pin.owner}.${pin.name} method closure from complete original graph`,{timeout:60_000},async()=>{
  const source=readFileSync(new URL(pin.file,root),'utf8');assert.equal(hash(source),pin.fileSha256);assert.equal(hash(source.slice(pin.span.start,pin.span.end)),pin.fnTokenSha256);
  const result=originals(),method=result.checkedMethodDeclarations.find(entry=>entry.source===pin.file&&entry.displayName.endsWith(pin.owner+'.'+pin.name));assert.ok(method,JSON.stringify(result.meta.refused.filter(entry=>entry.file===pin.file)));assert.equal(method.sourceSha256,pin.fileSha256);assert.equal(method.receiver,'shared');assert.equal(method.signature.params[0].type.rustReference.kind,'shared');
  const artifact=methodTargets(method),type=artifact.lowered.own.params[0].type.rustReference.pointee,base=fixture(type,artifact.lowered.program.declarations),field={AcceptanceFailure:'transaction_id',ResponsesStreamRewriter:'upstream_model',GitHubProxyConfig:'token',AnthropicUsage:'service_tier'}[pin.owner];assert.ok(Object.hasOwn(base,field));
  await verifyTypedTargets(artifact,api=>{const values=pin.owner==='AnthropicUsage'?[[none,none],[some('standard'),some('default')],[some('priority'),some('priority')],[some('other'),none]]:[[none,none],[some(''),some('')],[some('opaque-😀'),some('opaque-😀')]];for(const [value,expected]of values)assert.deepEqual(api[pin.name](Object.freeze({...base,[field]:value})),expected);});
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.executableDeclarations.some(entry=>entry.qualifiedName===method.qualifiedName),false);
});
