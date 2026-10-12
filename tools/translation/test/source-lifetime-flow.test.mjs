import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const refused=(source,pattern)=>{
  const result=project(source),entry=result.meta.refused.find(entry=>entry.name==='bad');assert.ok(entry,source);assert.match(entry.message,pattern,source);
};

test('copied shared locals follow the most recent assignment without retaining initializer lifetimes',async()=>{
  const source='pub fn latest(value:&str)->&str{let mut current:&str="fixed";current=value;current}pub fn restored(value:&str)->&\'static str{let mut current:&str=value;current="fixed";current}pub fn number(value:&u64)->&u64{let mut current:&u64=value;current=value;current}pub fn flag(value:&bool)->&bool{let mut current:&bool=value;current=value;current}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const entry of program.declarations.values())if(entry.k==='fn'){assert.equal(entry.sourceLifetimeProof.copiedLocalFlow.profile,'finite-copied-shared-local-origins-v1');assert.equal(entry.sourceLifetimeProof.copiedLocalFlow.mutablePointeeAccess,false);assert.equal(entry.sourceLifetimeProof.copiedLocalFlow.mutableParameterSupport,false);}
  assert.deepEqual(program.declarations.get('restored').sourceLifetimeProof.returnOrigins,['static']);
  await verifyTypedTargets(result,api=>{assert.equal(api.latest('Ω'),'Ω');assert.equal(api.restored('Ω'),'fixed');assert.equal(api.number(7n),7n);assert.equal(api.flag(false),false);assert.equal(api.flag(true),true);});
});

test('statement branches and actual scalar matches merge their outer borrowed-local writes',async()=>{
  const source='pub fn choice(value:&str,flag:bool)->&str{let mut current:&str="fixed";if flag{current=value;}else{current="other";}current}pub fn matched(value:&str,flag:bool)->&str{let mut current:&str=value;match flag{true=>{current="fixed";},false=>{current=value;}};current}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.choice('Ω',true),'Ω');assert.equal(api.choice('Ω',false),'other');assert.equal(api.matched('Ω',true),'fixed');assert.equal(api.matched('Ω',false),'Ω');});
  refused('pub fn bad(value:&str,flag:bool)->&\'static str{let mut current:&str="fixed";if flag{current=value;}current}',/escaping source borrow/);
});

test('while fixed points retain zero iterations and propagate origins across several back edges',async()=>{
  const source='pub fn consume(value:&str,mut count:u8)->&str{let mut current:&str=value;while count>0u8{current="fixed";count-=1u8;}current}pub fn chain(value:&str,mut count:u8)->&str{let mut a:&str="0";let mut b:&str="1";let mut c:&str="2";let mut d:&str="3";while count>0u8{d=c;c=b;b=a;a=value;count-=1u8;}d}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const proof=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('chain').sourceLifetimeProof;
  assert.ok(proof.copiedLocalFlow.fixedPoints>0);assert.ok(proof.returnOrigins.includes('static'));assert.ok(proof.returnOrigins.some(origin=>origin.startsWith('input:')));
  await verifyTypedTargets(result,api=>{assert.equal(api.consume('Ω',0n),'Ω');assert.equal(api.consume('Ω',2n),'fixed');for(const [count,want]of [[0n,'3'],[1n,'2'],[2n,'1'],[3n,'0'],[4n,'Ω']])assert.equal(api.chain('Ω',count),want);});
});

test('later loop iterations cannot turn a nonstatic input into a static result or argument',()=>{
  refused('pub fn bad(value:&str,mut count:u8)->&\'static str{let mut current:&str="fixed";let mut prior:&str="fixed";while count>0u8{prior=current;current=value;count-=1u8;}prior}',/escaping source borrow/);
  refused('fn needs(value:&\'static str)->u8{1u8}pub fn bad(value:&str,mut count:u8)->u8{let mut current:&str="fixed";while count>0u8{let ignored:u8=needs(current);current=value;count-=1u8;}0u8}',/static source parameter/);
  refused('pub fn bad(value:&str,mut count:u8)->&\'static str{let mut current:&str=value;while count>0u8{current="fixed";count-=1u8;}current}',/escaping source borrow/);
});

test('lexical shadowing preserves the outer origin while inner scopes propagate actual outer writes',async()=>{
  const source='pub fn shadow(value:&str,flag:bool)->&str{let mut current:&str=value;if flag{let mut current:&str="shadow";current="inner";}else{current="outer";}current}pub fn update(value:&str,flag:bool)->&str{let mut current:&str=value;if flag{let marker:u8=1u8;current="outer";}current}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.shadow('Ω',true),'Ω');assert.equal(api.shadow('Ω',false),'outer');assert.equal(api.update('Ω',false),'Ω');assert.equal(api.update('Ω',true),'outer');});
});

test('for fixed points retain their empty path and carry actual borrowed iterator item origins',async()=>{
  const source='pub fn counted(value:&str,count:u8)->&str{let mut current:&str=value;for index in 0u8..count{current="fixed";}current}pub fn selected<\'a>(values:&[&\'a str])->&\'a str{let mut current:&str="fixed";for &item in values{current=item;}current}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.counted('Ω',0n),'Ω');assert.equal(api.counted('Ω',2n),'fixed');assert.equal(api.selected(Object.freeze([])),'fixed');assert.equal(api.selected(Object.freeze(['first','Ω'])),'Ω');});
  refused('pub fn bad(value:&str,count:u8)->&\'static str{let mut current:&str=value;for index in 0u8..count{current="fixed";}current}',/escaping source borrow/);
});

test('written static and named local lifetimes constrain every write even without a borrowed return',()=>{
  for(const tail of ['current=value;','if flag{current=value;}','while flag{current=value;break;}','for index in 0u8..1u8{current=value;}'])refused('pub fn bad(value:&str,flag:bool)->u8{let mut current:&\'static str="fixed";'+tail+'0u8}',/static source parameter/);
  refused('pub fn bad<\'a,\'b>(first:&\'a str,second:&\'b str)->u8{let mut current:&\'a str=first;current=second;0u8}',/named local borrow/);
});

test('lazy borrowed capture mutation and mutable borrowed parameters retain explicit refusals',()=>{
  refused('pub fn bad(value:&str)->&\'static str{let mut current:&str=value;let ignored:u8=[1u8].iter().map(|_|{current="fixed";1u8}).take(0usize).sum();current}',/mutable borrowed callback capture|assignment to immutable/);
  refused('pub fn bad(mut value:&\'static str)->&\'static str{value="fixed";value}',/mutable borrowed parameter/);
});

test('untouched original inline-zero caller translates its while-let and copied remainder through both targets',async()=>{
  const complete=readFileSync(new URL('../../../src/github_proxy.rs',import.meta.url),'utf8'),item=sourceItems(complete).find(item=>item.name==='contains_inline_zero_after_oid');assert.ok(item);
  const source=complete.slice(item.start,item.end),result=translateSource(source,'src/github_proxy.rs');assert.equal(result.ir.items.map(entry=>entry.source).join(''),source);assert.equal(result.ir.items.find(entry=>entry.name===item.name).status,'executable');
  const targets=project(source);assert.deepEqual(targets.meta.refused,[]);
  await verifyTypedTargets(targets,api=>{const call=api.contains_inline_zero_after_oid;assert.equal(call(''),false);assert.equal(call('afteroid:"'+('0'.repeat(39))+'"'),false);assert.equal(call('afteroid:"'+('0'.repeat(40))+'"'),true);assert.equal(call('afteroid:"'+('0'.repeat(40))+'1"'),false);assert.equal(call('afteroid:"abc"afteroid:"'+('0'.repeat(40))+'"'),true);assert.equal(call('afteroid:"Ω"afteroid:"'+('0'.repeat(40))+'"'),true);});
});


test('unreachable writes after loop exits cannot erase actual input origins',async()=>{
  for(const exit of ['break','continue'])refused(`pub fn bad(value:&str,mut count:u8)->&'static str{let mut current:&str=value;while count>0u8{count-=1u8;${exit};current="fixed";}current}`,/escaping source borrow/);
  refused(`pub fn bad(value:&str,mut count:u8,flag:bool)->&'static str{let mut current:&str="fixed";while count>0u8{current=value;if flag{break;}current="fixed";count-=1u8;}current}`,/escaping source borrow/);
  const result=project(`pub fn stop(value:&str,mut count:u8)->&str{let mut current:&str=value;while count>0u8{count-=1u8;break;current="fixed";}current}pub fn skip(value:&str,mut count:u8)->&str{let mut current:&str=value;while count>0u8{count-=1u8;continue;current="fixed";}current}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const count of [0n,1n,3n]){assert.equal(api.stop('Ω',count),'Ω');assert.equal(api.skip('Ω',count),'Ω');}});
});

test('short circuit origin joins retain skipped and executed borrowed assignments',async()=>{
  for(const operator of ['&&','||'])refused(`pub fn bad(value:&str,flag:bool)->&'static str{let mut current:&str=value;let ignored:bool=flag${operator}{current="fixed";true};current}`,/escaping source borrow/);
  const result=project(`pub fn both(value:&str,flag:bool)->&str{let mut current:&str=value;let ignored:bool=flag&&{current="fixed";true};current}pub fn either(value:&str,flag:bool)->&str{let mut current:&str=value;let ignored:bool=flag||{current="fixed";true};current}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.both('Ω',false),'Ω');assert.equal(api.both('Ω',true),'fixed');assert.equal(api.either('Ω',true),'Ω');assert.equal(api.either('Ω',false),'fixed');});
});

test('nested tuple matches retain the actual constructor field lifetime path',async()=>{
  refused(`pub fn bad<'a>(value:&'a str)->&'static str{let pair:(&'static str,(&'a str,))=("fixed",(value,));match pair{(_,inner)=>inner.0}}`,/escaping source borrow/);
  const result=project(`pub fn nested<'a>(value:&'a str)->&'a str{let pair:(&'static str,(&'a str,))=("fixed",(value,));match pair{(_,inner)=>inner.0}}pub fn outer(value:&str)->&str{let mut current:&str=value;let pair:(u8,u8)=(1u8,2u8);let ignored:u8=match pair{(current,other)=>current+other};current}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.nested('Ω'),'Ω');assert.equal(api.outer('Ω'),'Ω');});
});

test('borrowed item copies use the inner input region with a separate outer slice loan',async()=>{
  const result=project(`pub fn selected<'a>(values:&'a[&'a str])->&'a str{let mut current:&str="fixed";for &item in values{current=item;}current}pub fn copied<'a>(values:&[&'a str])->&'a str{let mut current:&str="fixed";for item in values.iter().copied(){current=item;}current}pub fn cloned<'a>(values:&[&'a str])->&'a str{let mut current:&str="fixed";for item in values.iter().cloned(){current=item;}current}`);assert.deepEqual(result.meta.refused,[]);
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const name of ['copied','cloned']){const proof=program.declarations.get(name).sourceLifetimeProof;assert.ok(proof.params.flat().some(region=>region.path.length===0&&region.kind==='elided'));assert.ok(proof.params.flat().some(region=>region.path.join('/')==='pointee/element'&&region.kind==='named:a'));assert.ok(!proof.returnOrigins.some(origin=>origin.startsWith('input:')));}
  await verifyTypedTargets(result,api=>{for(const name of ['selected','copied','cloned']){assert.equal(api[name](Object.freeze([])),'fixed');assert.equal(api[name](Object.freeze(['first','Ω'])),'Ω');}});
});

test('borrowed fold includes its zero path and repeated actual accumulator origins',async()=>{
  refused(`pub fn bad<'a>(values:&[&'a str])->&'static str{values.iter().fold("fixed",|_,item|*item)}`,/escaping source borrow/);
  const result=project(`pub fn folded<'a>(values:&[&'a str])->&'a str{values.iter().fold("fixed",|_,item|*item)}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.folded(Object.freeze([])),'fixed');assert.equal(api.folded(Object.freeze(['first','Ω'])),'Ω');});
  // Borrowed aggregate folds remain an explicit earlier checker frontier.
  refused(`pub fn bad<'a>(values:&'a[&'a str])->&'static str{let pair:(&str,&str)=values.iter().fold(("fixed","fixed"),|(first,second),item|(*item,first));pair.1}`,/fold accumulator|escaping source borrow/);
});

test('lazy captured mutable borrowed reads refuse specifically while callback-local copies remain checked',async()=>{
  refused(`pub fn bad(value:&str)->u8{let mut current:&str=value;let ignored:usize=[1u8].iter().map(|_|current).take(0usize).count();0u8}`,/mutable borrowed callback capture read/);
  const result=project(`pub fn local(value:&str)->u8{[1u8].iter().map(|_|{let mut current:&str=value;current="fixed";let ignored:usize=current.len();1u8}).sum()}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.local('Ω'),1n);});
});

test('an explicit borrowed return after checked assignment keeps its actual origin',async()=>{
  const result=project(`pub fn explicit(value:&str)->&'static str{let mut current:&str=value;current="fixed";return current;}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.explicit('Ω'),'fixed');});
  refused(`pub fn bad(value:&str)->&'static str{let mut current:&str="fixed";current=value;return current;}`,/escaping source borrow/);
});


test('loop exit snapshots restore actual outer bindings across nested lexical shadows',async()=>{
  for(const exit of ['break','continue'])refused(`pub fn bad(value:&str,mut count:u8,stop:bool)->&'static str{let mut current:&str="fixed";while count>0u8{count-=1u8;current=value;if stop{let current:&str="shadow";let current:&str="inner";${exit};}current="fixed";}current}`,/escaping source borrow/);
  refused(`pub fn bad(value:&str,mut count:u8,stop:bool)->&'static str{let mut current:&str="fixed";while count>0u8{count-=1u8;current=value;match stop{true=>{let current:&str="shadow";break;},false=>{current="fixed";}}current="fixed";}current}`,/escaping source borrow/);
  const result=project(`pub fn shadow_exit(value:&str,mut count:u8,stop:bool)->&str{let mut current:&str="fixed";while count>0u8{count-=1u8;current=value;if stop{let current:&str="shadow";let current:&str="inner";break;}current="fixed";}current}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.shadow_exit('Ω',0n,true),'fixed');assert.equal(api.shadow_exit('Ω',1n,true),'Ω');assert.equal(api.shadow_exit('Ω',1n,false),'fixed');});
});


test('a false while condition retains its actual borrowed writes before skipping the body',async()=>{
  refused(`pub fn bad(value:&str,run:bool)->&'static str{let mut current:&str="fixed";while {current=value;run}{current="fixed";}current}`,/escaping source borrow/);
  const result=project(`pub fn condition(value:&str,run:bool)->&str{let mut current:&str="fixed";while {current=value;run}{current="fixed";break;}current}`);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.condition('Ω',false),'Ω');assert.equal(api.condition('Ω',true),'fixed');});
});

test('discarded constructor match statements keep enclosing break continue and return targets',async()=>{
  const source=`pub fn stop(value:Option<u8>,mut count:u8)->u8{let mut current:u8=0u8;while count>0u8{count-=1u8;match value{Some(n)=>{current=n;break;},None=>{current+=1u8;continue;}}current=9u8;}current}pub fn returned(value:Option<u8>)->u8{match value{Some(n)=>{return n;},None=>{}}9u8}pub fn discard(flag:bool)->u8{match flag{true=>1u8,false=>2u8};7u8}`;
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const none=Object.freeze({$:'None'}),some=field0=>Object.freeze({$:'Some',field0});
  await verifyTypedTargets(result,api=>{for(const count of [0n,1n,3n]){assert.equal(api.stop(none,count),count);assert.equal(api.stop(some(7n),count),count===0n?0n:7n);}assert.equal(api.returned(some(5n)),5n);assert.equal(api.returned(none),9n);assert.equal(api.discard(true),7n);assert.equal(api.discard(false),7n);});
  const invalid=project('pub fn bad(flag:bool)->u8{match flag{true=>1u8,false=>2u8}7u8}');assert.ok(invalid.meta.refused.some(entry=>entry.name==='bad'));
});

test('ordered guarded statement matches retain lazy guard selection and enclosing loop exits',async()=>{
  const source=`pub fn stop(value:Option<u8>,mut count:u8)->u8{let mut current:u8=0u8;while count>0u8{count-=1u8;match value{Some(n) if n>0u8=>{current=n;break;},Some(_)=>{current+=1u8;continue;},None=>{break;}}current=9u8;}current}`;
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const none=Object.freeze({$:'None'}),some=field0=>Object.freeze({$:'Some',field0});
  await verifyTypedTargets(result,api=>{for(const count of [0n,1n,3n]){assert.equal(api.stop(none,count),0n);assert.equal(api.stop(some(0n),count),count);assert.equal(api.stop(some(7n),count),count===0n?0n:7n);}});
});

test('anonymous copied product binders retain nested borrowed leaves and hostile input guards',async()=>{
  const result=project('pub fn first(value:((&str,),u8))->&str{match value{(inner,_)=>inner.0}}');assert.deepEqual(result.meta.refused,[]);
  const tuple=(...fields)=>Object.freeze({$:'Tuple',...Object.fromEntries(fields.map((value,index)=>['field'+index,value]))});
  await verifyTypedTargets(result,api=>{assert.equal(api.first(tuple(tuple('Ω'),7n)),'Ω');let reads=0;const hostile=Object.freeze({$:'Tuple',get field0(){reads++;return 'Ω';}});assert.throws(()=>api.first(tuple(hostile,7n)),TypeError);assert.equal(reads,0);});
  refused('pub fn bad(value:((String,),u8))->u8{match value{(inner,n)=>n}}',/ownership/);
  const invalid=project('struct Owned{value:String}pub fn bad(value:(Owned,u8))->u8{match value{(inner,n)=>n}}');assert.ok(invalid.meta.refused.some(entry=>entry.name==='bad'));
  refused('pub fn bad(value:&str)->&\'static str{return value;}',/escaping source borrow/);
  refused('pub fn bad(value:&str)->&\'static str{let mut current:&\'static str="fixed";return current;current=value;}',/static source parameter/);
  const unreachable=project('pub fn bad(value:&str)->&str{return value;let ignored=unknown();value}');assert.ok(unreachable.meta.refused.some(entry=>entry.name==='bad'));
});

test('statement match temporaries avoid actual renamed formals even when every formal is unused',async()=>{
  const occupied=Array.from({length:24},(_,index)=>'ml_discard_match_'+(index+1));
  const source='pub fn collision('+occupied.map(name=>name+':u8').join(',')+')->u8{let value:Option<u8> = Some(1u8);match value{Some(n)=>{let ignored:u8=n;},None=>{}}7u8}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.collision(...occupied.map(()=>0n)),7n);});
});
