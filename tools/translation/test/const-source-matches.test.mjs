import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {HostChecker,parseRust} from '../extensions/host-contracts.mjs';
import {captureConstMatchSources,originalConstMatchSource} from '../extensions/const-match-source-context.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const find=(node,predicate)=>node&&typeof node==='object'&&(predicate(node)?node:Object.entries(node).filter(([key])=>key!=='type').map(([,value])=>Array.isArray(value)?value.map(child=>find(child,predicate)).find(Boolean):find(value,predicate)).find(Boolean));
async function both(source,verify){const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyCohortTargets(result,verify);return result;}

test('unchanged former primitive const refusal now checks the original macro and strict typed targets',{timeout:30000},async()=>{
  const source='pub const fn bad(v:u8)->bool{matches!(v,1)}';
  const result=await both(source,api=>{for(const [value,wanted]of [[0n,false],[1n,true],[2n,false],[255n,false]])assert.equal(api.bad(value),wanted);assert.throws(()=>api.bad(256n),RangeError);});
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),body=program.declarations.get('bad').body;
  const evidence=JSON.parse(find(body,node=>typeof node.constMatchSourceEvidence==='string').constMatchSourceEvidence);
  assert.equal(evidence.sourceMacro.sourceMatchesProof.call.originalInvocation,'matches!(v,1)');
  assert.equal(evidence.sourceMacro.sourceMatchesProof.originalRuleInterpreted,true);
  for(const name of ['constEligible','namespaceAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(evidence.sourceMacro.sourceMatchesProof[name],false,name);
  assert.equal(evidence.subjectEvaluatedOnce,true);assert.equal(evidence.rows[0].sourcePattern.tokens[0].value,'1');
  assert.equal(find(body,node=>node.k==='routerOrderedMatchArms'),undefined);
  assert.equal(serializeProgram(parseProgram(serializeProgram(program))),serializeProgram(program));
});

test('primitive const matches evaluate selected paths with fixed arithmetic and original alternative order',{timeout:30000},async()=>{
  const source='pub const fn either(v:u8)->bool{matches!(v,1 | 2 | 2)}pub const fn yes(v:bool)->bool{matches!(v,true)}pub const fn next(v:u8)->bool{matches!(if v==0u8{1u8}else{v+1u8},1u8)}pub const ONE:bool=either(1u8);pub const NO:bool=yes(false);pub const SAFE:bool=next(0u8);';
  await both(source,api=>{assert.equal(api.ONE,true);assert.equal(api.NO,false);assert.equal(api.SAFE,true);for(let value=0n;value<=255n;value++)assert.equal(api.either(value),value===1n||value===2n);assert.equal(api.yes(true),true);assert.equal(api.yes(false),false);assert.equal(api.next(0n),true);assert.equal(api.next(1n),false);assert.throws(()=>api.next(255n),RangeError);});
  const panic=project('pub const fn next(v:u8)->bool{matches!(v+1u8,1u8)}pub const OVER:bool=next(255u8);');
  assert.equal(panic.meta.executable.some(item=>item.name==='next'),true);assert.equal(panic.meta.executable.some(item=>item.name==='OVER'),false);assert.match(panic.meta.refused.find(item=>item.name==='OVER').message,/constant evaluation|overflow/u);
});

test('closed original Copy unit enum matches keep nominal constructors and const method source spans',{timeout:30000},async()=>{
  const source='#[derive(Clone,Copy)]pub enum Mode{On,Off,Auto}impl Mode{pub const fn active(self)->bool{matches!(self,Self::On | Self::Auto)}}pub const fn selected(v:Mode)->bool{matches!(v,Mode::On | Mode::Auto)}pub const YES:bool=selected(Mode::Auto);pub const NO:bool=selected(Mode::Off);pub fn on()->bool{Mode::On.active()}pub fn off()->bool{Mode::Off.active()}pub fn auto()->bool{Mode::Auto.active()}';
  const result=await both(source,api=>{assert.equal(api.YES,true);assert.equal(api.NO,false);assert.equal(api.on(),true);assert.equal(api.off(),false);assert.equal(api.auto(),true);assert.equal(api.selected(Object.freeze({$:'On'})),true);assert.equal(api.selected(Object.freeze({$:'Off'})),false);let traps=0;const invalid=new Proxy(Object.freeze({$:'On'}),{get(){traps++;throw Error('get');},getPrototypeOf(){traps++;throw Error('prototype');}});assert.throws(()=>api.selected(invalid),TypeError);assert.equal(traps,0);assert.throws(()=>api.selected(Object.freeze({$:'Unknown'})),TypeError);});
  const method=result.meta.checkedMethods.find(item=>item.name==='Mode.active');assert.equal(method.receiver,'value');assert.equal(source.slice(method.span.start,method.span.end),'pub const fn active(self)->bool{matches!(self,Self::On | Self::Auto)}');
});

test('guards effects borrowed values payloads unproved Drop and namespace shadows retain const refusals',()=>{
  for(const source of [
    'pub const fn bad(v:u8)->bool{matches!(v,n if n>1)}',
    'pub const fn bad(v:Option<u8>)->bool{matches!(v,Some(_))}',
    'pub const fn bad(v:&u8)->bool{matches!(v,1)}',
    'pub const fn bad(v:&str)->bool{matches!(v,"yes")}',
    '#[derive(Clone,Copy)]enum Mode{On(u8),Off}pub const fn bad(v:Mode)->bool{matches!(v,Mode::Off)}',
    'enum Mode{On,Off}pub const fn bad(v:Mode)->bool{matches!(v,Mode::On)}',
    '#[derive(Clone,Copy)]enum Mode{On,Off}impl Drop for Mode{fn drop(&mut self){}}pub const fn bad(v:Mode)->bool{matches!(v,Mode::On)}',
    'macro_rules! matches{($($v:tt)*)=>{true}}pub const fn bad(v:u8)->bool{matches!(v,1)}',
    'use external::matches;pub const fn bad(v:u8)->bool{matches!(v,1)}',
    'pub fn effect()->u8{std::env::var("x").is_ok() as u8}pub const fn bad()->bool{matches!(effect(),1)}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);}
});

test('const source capture refuses cloned changed foreign and unissued syntax without proxy reads',()=>{
  const surface=parseRust('pub const fn f(v:u8)->bool{matches!(v,1)}fn main(){}'),node=find(surface,value=>value.k==='routerOrderedMatch'),checker=new HostChecker('Rust',[]);
  captureConstMatchSources(checker,surface);assert.equal(originalConstMatchSource(checker,node),true);assert.equal(originalConstMatchSource(new HostChecker('Rust',[]),node),false);assert.equal(originalConstMatchSource(checker,structuredClone(node)),false);
  let traps=0;const proxy=new Proxy(node,{get(){traps++;throw Error('get');},ownKeys(){traps++;throw Error('keys');}});assert.equal(originalConstMatchSource(checker,proxy),false);assert.equal(traps,0);
  node.sourceMacro={...node.sourceMacro,forged:true};assert.equal(originalConstMatchSource(checker,node),false);
  const ordinary=parseRust('pub fn f(v:u8)->bool{matches!(v,1)}fn main(){}'),plain=find(ordinary,value=>value.k==='routerOrderedMatch');captureConstMatchSources(checker,ordinary);assert.equal(originalConstMatchSource(checker,plain),false);
  ordinary.items.find(item=>item.name==='f').constFunction=true;assert.throws(()=>captureConstMatchSources(checker,ordinary),/changed|source/i);
});

test('direct original const items use the same checked primitive match through qualified and aliased owners',{timeout:30000},async()=>{
  const source='use core::matches as accepts;mod inner{pub const CHECK:bool=core::matches!(false,false);}pub const SIMPLE:bool=matches!(true,true);pub const ALIAS:bool=accepts!(2u8,1u8 | 2u8);pub const NEST:bool=inner::CHECK;';
  await both(source,api=>{assert.equal(api.SIMPLE,true);assert.equal(api.ALIAS,true);assert.equal(api.NEST,true);});
  const surface=parseRust('const X:bool=matches!(1u8,1u8);fn main(){}'),checker=new HostChecker('Rust',[]),node=find(surface,value=>value.k==='routerOrderedMatch');
  captureConstMatchSources(checker,surface);assert.equal(originalConstMatchSource(checker,node),true);
});

test('literal false and signed primitive subjects retain their full typed domains',{timeout:30000},async()=>{
  await both('pub const NO:bool=matches!(false,true);pub const NEG:bool=matches!(-1i8,1i8 | -1i8);pub const MAX:bool=matches!(255u8,1u8 | 255u8);',api=>{assert.equal(api.NO,false);assert.equal(api.NEG,true);assert.equal(api.MAX,true);});
});

test('const conditional primitive and direct nominal subjects check every written pattern in strict TypeScript',{timeout:30000},async()=>{
  const source='#[derive(Clone,Copy)]enum Mode{On,Off}pub const OFF:bool=matches!(Mode::Off,Mode::On);pub const fn union(v:bool)->bool{matches!(if v{1u8}else{2u8},3u8)}pub const FALSE:bool=union(false);';
  await both(source,api=>{assert.equal(api.OFF,false);assert.equal(api.FALSE,false);assert.equal(api.union(false),false);assert.equal(api.union(true),false);});
});

test('unchanged former shared-field const denial retains its independently checked source receiver',{timeout:30000},async()=>{
  const source='struct Counter{value:u8}impl Counter{const fn bad(&self)->bool{matches!(self.value,1)}}pub fn run(v:Counter)->bool{v.bad()}';
  const result=await both(source,api=>{for(const [value,wanted]of [[0n,false],[1n,true],[255n,false]])assert.equal(api.run(Object.freeze({$:'Counter',value})),wanted);let traps=0;const proxy=new Proxy(Object.freeze({$:'Counter',value:1n}),{get(){traps++;throw Error('get');},getPrototypeOf(){traps++;throw Error('prototype');}});assert.throws(()=>api.run(proxy),TypeError);assert.equal(traps,0);});
  assert.equal(result.meta.checkedMethods.find(item=>item.name==='Counter.bad').receiver,'shared');
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),method=[...program.declarations.values()].find(item=>item.impl?.method==='bad');
  assert.equal(method.params[0].type.rustReference.kind,'shared');assert.equal(method.impl.copyCertificate,undefined);assert.equal(method.sourceMethodProof.copyAuthority,false);
});
