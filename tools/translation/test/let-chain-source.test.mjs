import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {LET_CHAIN_PROFILE,requireSourceLetChain} from '../extensions/let-chain-source.mjs';
import {verifyTypedTargets as verifyActualTypedTargets} from './typed-targets.mjs';
const verifyTypedTargets=(result,verify)=>verifyActualTypedTargets(result,verify,{childTimeoutMs:30_000});
const CARGO_2024='[package]\nname="let-chain-fixture"\nversion="0.1.0"\nedition="2024"\n';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:CARGO_2024});
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const tuple=(...fields)=>Object.freeze({$:'Tuple',...Object.fromEntries(fields.map((value,index)=>['field'+index,value]))});
const ok=field0=>Object.freeze({$:'Ok',field0}),err=field0=>Object.freeze({$:'Err',field0});
const hash=text=>createHash('sha256').update(text).digest('hex');
const requireRefusal=source=>{const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);};
function nodes(value,result=[]){
  if(!value||typeof value!=='object')return result;
  if(value.k)result.push(value);
  for(const [key,child]of Object.entries(value))if(!['type','span','patternControl'].includes(key)){
    if(Array.isArray(child))for(const item of child)nodes(item,result);else nodes(child,result);
  }
  return result;
}

test('if-let guards keep successful bindings and one else in the original outer scope',{timeout:90_000},async()=>{
  const source='pub fn select(value:Option<u8>,outer:u8)->u8{let mut answer:u8=99;if let Some(outer)=value && outer>0u8{answer=outer;}else{answer=outer;}answer}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.select(some(8n),3n),8n);assert.equal(api.select(some(0n),3n),3n);assert.equal(api.select(none,3n),3n);});
});

test('boolean-first and multiple actual Option Result clauses retain later clause scope',{timeout:90_000},async()=>{
  const source='pub fn gate(value:Option<u8>,allow:bool)->u8{let mut answer:u8=4;if allow && let Some(v)=value && v>0u8{answer=v;}answer}pub fn several(first:Option<u8>,second:Result<u8,u8>,outer:u8)->u8{let mut answer:u8=99;if let Some(outer)=first && let Ok(n)=second && n>outer{answer=n;}else{answer=outer;}answer}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.gate(some(7n),true),7n);assert.equal(api.gate(some(7n),false),4n);assert.equal(api.gate(some(0n),true),4n);assert.equal(api.gate(none,true),4n);
    assert.equal(api.several(some(3n),ok(8n),2n),8n);assert.equal(api.several(some(3n),ok(2n),9n),9n);assert.equal(api.several(some(3n),err(8n),9n),9n);assert.equal(api.several(none,ok(8n),9n),9n);
  });
});

test('later original calls remain unvisited after a false guard or failed pattern',{timeout:90_000},async()=>{
  const source='fn quotient(a:u8,b:u8)->Option<u8>{Some(a/b)}pub fn guarded(value:Option<u8>)->u8{if let Some(v)=value && v>0u8 && let Some(w)=quotient(5u8,0u8){return w;}9u8}pub fn first(allow:bool)->u8{if allow && let Some(v)=quotient(5u8,0u8){return v;}3u8}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.guarded(none),9n);assert.equal(api.guarded(some(0n)),9n);assert.equal(api.first(false),3n);
    assert.throws(()=>api.guarded(some(1n)),/division|divide|zero/u);assert.throws(()=>api.first(true),/division|divide|zero/u);
  });
});

test('each original source call executes once in written clause order',{timeout:90_000},async()=>{
  const source='fn first()->Option<u8>{Some(2u8)}fn second(v:u8)->Result<u8,u8>{Ok(v+1u8)}pub fn run(allow:bool)->u8{if allow && let Some(v)=first() && let Ok(n)=second(v) && n>v{return n;}0u8}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const emitted=name=>target.declarations.get('rp_'+Buffer.from(name).toString('hex')).name;
  const instrument=(text,typed)=>{
    for(const name of ['first','second']){
      const prefix='function '+emitted(name)+'(';assert.equal(text.split(prefix).length,2);
      const at=text.indexOf(' {\n',text.indexOf(prefix))+1;assert.ok(at>0);
      text=text.slice(0,at+1)+`ml_fixture_chain_events.push('${name}');`+text.slice(at+1);
    }
    return text+`\nconst ml_fixture_chain_events${typed?': string[]':''}=[];export function fixtureChainOrder(allow${typed?': boolean':''}){ml_fixture_chain_events.length=0;return {value:${emitted('run')}(allow),events:ml_fixture_chain_events.join(',')};}`;
  };
  await verifyTypedTargets({...result,javascript:instrument(result.javascript,false),typescript:instrument(result.typescript,true)},(_api,_result,module)=>{
    assert.deepEqual(module.fixtureChainOrder(false),{value:0n,events:''});assert.deepEqual(module.fixtureChainOrder(true),{value:3n,events:'first,second'});
  });
});

test('while chains recreate original bindings on continue and stop at guards break and return',{timeout:90_000},async()=>{
  const source='fn step(n:u8)->Option<u8>{Some(n)}pub fn drain(mut n:u8)->u8{let mut total:u8=0;while n<5u8 && let Some(v)=step(n) && v<4u8{n+=1u8;if v==1u8{continue;}total+=v;if v==3u8{break;}}total}pub fn count(mut n:u8)->u8{let mut total:u8=0;while let Some(v)=step(n) && v<3u8{n+=1u8;total+=1u8;}total}pub fn early(mut n:u8)->u8{while n<4u8 && let Some(v)=step(n){return v;}9u8}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.drain(0n),5n);assert.equal(api.drain(2n),5n);assert.equal(api.drain(3n),3n);assert.equal(api.drain(4n),0n);assert.equal(api.drain(5n),0n);
    assert.equal(api.count(0n),3n);assert.equal(api.count(2n),1n);assert.equal(api.count(3n),0n);assert.equal(api.early(2n),2n);assert.equal(api.early(4n),9n);
  });
});

test('nested tuple and scalar irrefutable patterns use existing actual projection plans',{timeout:90_000},async()=>{
  const source='pub fn product(value:Option<(u8,(u8,u8))>)->u8{if let Some((a,(b,c)))=value && a<b && let sum=b+c{return sum;}0u8}pub fn literal(value:&str)->bool{let mut answer:bool=false;if let "Ω"=value && true{answer=true;}answer}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.product(some(tuple(1n,tuple(2n,3n)))),5n);assert.equal(api.product(some(tuple(3n,tuple(2n,3n)))),0n);assert.equal(api.product(none),0n);
    assert.throws(()=>api.product(some(Object.freeze([1n,Object.freeze([2n,3n])]))),/data constructor cannot be an array/u);
    assert.equal(api.literal('Ω'),true);assert.equal(api.literal('ω'),false);
  });
});

test('shared string origins and written lifetime obligations flow through chained statement joins',{timeout:90_000},async()=>{
  const source="pub fn choose<'a>(value:Option<&'a str>,allow:bool,fallback:&'a str)->&'a str{let mut current:&'a str=fallback;if let Some(text)=value && allow{current=text;}current}";
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.choose(some('Ω'),true,'fallback'),'Ω');assert.equal(api.choose(some('Ω'),false,'fallback'),'fallback');assert.equal(api.choose(none,true,'fallback'),'fallback');});
  requireRefusal("pub fn bad<'a>(value:Option<&'a str>,allow:bool)->&'static str{let mut current:&'static str=\"fixed\";if let Some(text)=value && allow{current=text;}current}");
});

test('fresh compiler temporaries preserve source shadows and unused formal names',{timeout:90_000},async()=>{
  const source='pub fn collide(value:Option<u8>,ml_let_chain_1:u8,ml_pattern_chain_2:u8,ml_let_chain_2:u8)->u8{let mut answer:u8=ml_let_chain_1;if let Some(ml_pattern_chain_2)=value && ml_pattern_chain_2>0u8{answer=ml_pattern_chain_2;}else{answer=ml_pattern_chain_2;}answer}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.collide(some(7n),3n,9n,1n),7n);assert.equal(api.collide(some(0n),3n,9n,1n),9n);assert.equal(api.collide(none,3n,9n,1n),9n);});
});

test('source condition bytes spans and common control survive serialized and reparsed meta',()=>{
  const source='pub fn retained(value:Option<u8>)->u8{if let Some(v)=value && (v>0u8 || v==0u8){return v;}3u8}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),text=serializeProgram(checked);assert.equal(serializeProgram(parseProgram(text)),text);
  const body=checked.declarations.get('retained').body,all=nodes(body),chain=all.find(node=>node.patternControl?.kind==='let-chain');assert.ok(chain);
  requireSourceLetChain(chain);assert.equal(chain.constEligible,false);
  assert.equal(chain.patternControl.sourceCondition.profile,LET_CHAIN_PROFILE.id);
  assert.equal(source.slice(chain.patternControl.sourceCondition.condition.span.start,chain.patternControl.sourceCondition.condition.span.end).trim(),'if let Some(v)=value && (v>0u8 || v==0u8)');
  assert.equal(all.some(node=>node.k==='routerLetChainCondition'),false);
  assert.equal(all.some(node=>node.k==='routerSet'&&node.target.name===chain.name),true);
  for(const token of chain.patternControl.sourceCondition.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.raw);
  for(const mutate of [node=>{node.patternControl.sourceCondition.editionInput.edition='2021';},node=>{node.patternControl.sourceCondition.editionInput.declaration.originalSpan.end=Number.MAX_SAFE_INTEGER;},node=>{node.patternControl.sourceCondition.editionInput.declaration.originalSpan.end=node.patternControl.sourceCondition.editionInput.declaration.originalSpan.start;},node=>{node.patternControl.sourceCondition.namespaceComplete=true;},node=>{node.patternControl.sourceCondition.constEligible=true;},node=>{node.patternControl.sourceCondition.evaluationOrder.reverse();},node=>{node.patternControl.sourceCondition.tokens[0].span.end=source.length+1;},node=>{node.patternControl.sourceCondition.clauses[0].subjectSyntaxSpan.start=0;}]){
    const changed=structuredClone(chain);mutate(changed);assert.throws(()=>requireSourceLetChain(changed),/missing actual checked/u);
  }
});

test('mutable owning unknown owner and nonlocal subject contracts remain refused',()=>{
  for(const source of [
    'pub fn bad(value:Option<String>)->u8{if let Some(text)=value && !text.is_empty(){return 1u8;}0u8}',
    'pub fn bad(value:Option<Vec<u8>>)->u8{if let Some(items)=value && items.len()>0{return 1u8;}0u8}',
    'pub fn bad(value:Option<&mut u8>)->u8{if let Some(v)=value && true{return 1u8;}0u8}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(mut v)=value && true{return v;}0u8}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(ref v)=value && true{return 1u8;}0u8}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(v)=value && unknown(v){return v;}0u8}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(v)=value && (if true{return 1u8;}else{true}){return v;}0u8}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(v)=value && v>0u8{}v}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(v)=value && v>0u8{}else{return v;}0u8}',
  ])requireRefusal(source);
});

test('value joins naked disjunction and over-budget clause lists remain precise refusals',()=>{
  for(const source of [
    'pub fn bad(value:Option<u8>)->u8{if let Some(v)=value && v>0u8{v}else{0u8}}',
    'pub fn bad(value:Option<u8>)->u8{let answer:u8=if let Some(v)=value && v>0u8{v}else{0u8};answer}',
    'pub fn bad(value:Option<u8>)->u8{if let Some(v)=value && true || false{return v;}0u8}',
    `pub fn bad(value:Option<u8>)->u8{if let Some(v)=value ${'&& true '.repeat(LET_CHAIN_PROFILE.limits.clauses)}{return v;}0u8}`,
  ])requireRefusal(source);
});

test('runtime checking of a const function does not invent eligibility for a concrete chain constant',()=>{
  const result=project('pub const fn guarded(value:Option<u8>)->u8{if let Some(v)=value && v>0u8{return v;}0u8}const VALUE:u8=guarded(Some(1u8));');
  assert.equal(result.meta.executable.some(entry=>entry.name==='VALUE'),false);
  assert.ok(result.meta.refused.some(entry=>entry.name==='VALUE'));
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),entry=program.declarations.get('guarded');assert.ok(entry);
  assert.equal(entry.constFunction,true);assert.equal(nodes(entry.body).find(node=>node.patternControl?.kind==='let-chain').constEligible,false);
});

test('hostile aggregate guards reject before callbacks and preserve the valid immutable ABI',{timeout:90_000},async()=>{
  const result=project('pub fn checked(value:Option<u8>)->u8{if let Some(v)=value && v>0u8{return v;}0u8}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.checked(some(2n)),2n);assert.equal(api.checked(none),0n);
    let calls=0;const accessor=Object.freeze({$:'Some',get field0(){calls++;return 2n;}}),proxy=new Proxy(some(2n),{get(){calls++;throw Error('get');},getPrototypeOf(){calls++;throw Error('prototype');},ownKeys(){calls++;throw Error('keys');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}});
    assert.throws(()=>api.checked(accessor),TypeError);assert.throws(()=>api.checked(proxy),TypeError);assert.throws(()=>api.checked({$:'Some',field0:2n}),TypeError);assert.throws(()=>api.checked(some(256n)),TypeError);assert.equal(calls,0);
  });
});

test('known original Some and None clauses check unreachable bodies and omit impossible successful projections',{timeout:90_000},async()=>{
  const source='pub fn known_some(v:u8)->u8{let subject:Option<u8>=Some(v);if let None=subject && true{return 9u8;}v}pub fn known_none()->u8{let subject:Option<u8>=None;if let Some(v)=subject && true{return v;}7u8}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.known_some(0n),0n);assert.equal(api.known_some(255n),255n);assert.equal(api.known_none(),7n);});
  requireRefusal('pub fn bad()->u8{let subject:Option<u8>=None;if let Some(v)=subject && true{return unknown(v);}7u8}');
});

test('the unchanged original upstream URL caller translates through meta and both typed targets',async()=>{
  const complete=readFileSync(new URL('../../../src/github_proxy.rs',import.meta.url),'utf8'),item=sourceItems(complete).find(item=>item.name==='upstream_url');assert.ok(item);
  const original=complete.slice(item.start,item.end);assert.match(original,/&& let Some\(root\)/u);
  const result=translateSource(original,'src/github_proxy.rs',{cargoManifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8')});assert.equal(result.ir.items.map(entry=>entry.source).join(''),original);assert.equal(result.ir.sourceSha256,hash(original));
  const retained=result.ir.items.find(entry=>entry.name==='upstream_url');assert.equal(retained.status,'executable');assert.equal(retained.source,original);
  const checked=translateProject({entry:'src/github_proxy.rs',paths:['src/github_proxy.rs'],readSource:()=>original,cargoManifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8')});assert.deepEqual(checked.meta.refused,[]);
  await verifyTypedTargets(checked,api=>{
    assert.equal(api.upstream_url('https://enterprise.example/api/v3','/graphql'),'https://enterprise.example/api/graphql');
    assert.equal(api.upstream_url('https://api.github.com','/graphql'),'https://api.github.com/graphql');
    assert.equal(api.upstream_url('https://enterprise.example/api/v3','/repos/a/b'),'https://enterprise.example/api/v3/repos/a/b');
  });
});
