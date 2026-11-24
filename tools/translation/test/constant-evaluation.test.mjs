// These are pure checked-IR unit fixtures. They neither invoke a Rust/JS
// translator nor claim original production-body or Rust differential proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluateCheckedConstant} from '../extensions/constant-evaluation.mjs';
import {TIME_CONTRACTS,TIME_DATA} from '../extensions/time-contracts.mjs';
const fixed=(bits=8,signed=false,name=(signed?'i':'u')+bits)=>({kind:'fixed',bits,signed,rustPrimitiveName:name});
const U8=fixed(),I8=fixed(8,true),BOOL={kind:'bool'},U64=fixed(64),U32=fixed(32),DURATION={kind:'data',name:'std.time.Duration'};
const lit=(value,type=U8)=>({k:'lit',value:type.kind==='fixed'?String(value):value,type,span:{start:0,end:1}});
const variable=(name,type=U8)=>({k:'var',name,type});
const binary=(op,left,right,type=left.type)=>({k:'binary',op,left,right,type,semantics:'checked',...(['div','rem'].includes(op)?{rounding:'trunc',byZero:'abort'}:{})});
const call=(fn,args=[],type=U8)=>({k:'call',fn,args,type});
function entry(name,body,source,{params=[],constant=true,ret=body.type}={}) {
  return {k:'fn',name,fullName:name,modulePath:[],params,ret,body,constant,constFunction:!constant,span:{start:0,end:source.length},fixtureSource:source};
}
function run(entries,name='ROOT',options={}) {
  const sources=new Map(entries.filter(entry=>entry.k==='fn').map(entry=>[entry.fullName,{sourcePath:'fixture/'+entry.fullName+'.rs',source:entry.fixtureSource,declarationSpan:entry.span,bodySpan:entry.span}]));
  const program={schemaVersion:1,sourceLanguage:'Rust',declarations:new Map(entries.map(entry=>[entry.fullName,entry]))};
  return evaluateCheckedConstant(program,name,{sources,...options});
}
function scalar(body,source,type=body.type,options={}) {return run([entry('ROOT',body,source,{ret:type})],'ROOT',options);}

test('legal signed-minimum checked literal has no out-of-domain intermediate',()=>{
  const minimum=scalar(lit(-128,I8),'const ROOT:i8=-128i8;');
  assert.equal(minimum.status,'value');assert.equal(minimum.value.$integer,'-128');
  assert.equal(scalar(lit(128,I8),'const ROOT:i8=128i8;').status,'unsupported');
  assert.equal(scalar({k:'unary',op:'neg',arg:lit(-128,I8),type:I8,semantics:'checked'},'const ROOT:i8=-(-128i8);').status,'const-panic');
  assert.equal(scalar({k:'unary',op:'neg',arg:lit(127,I8),type:I8,semantics:'checked'},'const ROOT:i8=-127i8;').value.$integer,'-127');
});

test('every fixed intermediate checks overflow, zero and signed division/remainder overflow',()=>{
  for(const [op,a,b,type] of [['add',255,1,U8],['sub',0,1,U8],['mul',16,16,U8],['div',1,0,U8],['rem',1,0,U8],['div',-128,-1,I8],['rem',-128,-1,I8]])assert.equal(scalar(binary(op,lit(a,type),lit(b,type)),'/* fixed arithmetic fixture */').status,'const-panic');
  const badIntermediate=binary('sub',binary('add',lit(255),lit(1)),lit(1));
  assert.equal(scalar(badIntermediate,'const ROOT:u8=(255u8+1u8)-1u8;').status,'const-panic');
  assert.equal(scalar(binary('div',lit(-7,I8),lit(3,I8)),'const ROOT:i8=-7i8/3i8;').value.$integer,'-2');
  assert.equal(scalar(binary('rem',lit(-7,I8),lit(3,I8)),'const ROOT:i8=-7i8%3i8;').value.$integer,'-1');
});

test('concrete calls evaluate selected branches, not every possible constant-function input',()=>{
  const helper=entry('pick',{k:'if',cond:variable('skip',BOOL),then:variable('v'),else:binary('add',variable('v'),lit(1)),type:U8},'const fn pick(skip:bool,v:u8)->u8{if skip{v}else{v+1}}',{constant:false,params:[{name:'skip',type:BOOL},{name:'v',type:U8}]});
  assert.equal(run([helper,entry('ROOT',call('pick',[lit(true,BOOL),lit(255)]),'const ROOT:u8=pick(true,255u8);')]).value.$integer,'255');
  assert.equal(run([helper,entry('ROOT',call('pick',[lit(false,BOOL),lit(255)]),'const ROOT:u8=pick(false,255u8);')]).status,'const-panic');
  const short=binary('and',lit(false,BOOL),{k:'abort',message:'unselected',type:BOOL},BOOL);
  assert.equal(scalar(short,'const ROOT:bool=false&&panic!("unselected");').value,false);
  assert.equal(scalar({...short,left:lit(true,BOOL)},'const ROOT:bool=true&&panic!("selected");').status,'const-panic');
  const effect={k:'if',cond:lit(true,BOOL),then:lit(1),else:{k:'routerEffectCall',type:U8},type:U8};
  assert.equal(scalar(effect,'/* non-const unselected operation still ineligible */').status,'unsupported');
});

test('immutable locals and concrete call arguments preserve evaluation order',()=>{
  const local={k:'let',name:'value',value:lit(7),body:binary('mul',variable('value'),lit(3)),type:U8};
  assert.equal(scalar(local,'const ROOT:u8={let value=7u8;value*3u8};').value.$integer,'21');
  const helper=entry('first',variable('a'),'const fn first(a:u8,b:u8)->u8{a}',{constant:false,params:[{name:'a',type:U8},{name:'b',type:U8}]});
  const root=entry('ROOT',call('first',[binary('add',lit(255),lit(1)),binary('div',lit(1),lit(0))]),'const ROOT:u8=first(255u8+1u8,1u8/0u8);');
  assert.match(run([helper,root]).diagnostic.reason,/outside u8/);
  assert.equal(scalar({...local,mutable:true},'/* mutable local not implemented */').status,'unsupported');
});

test('checked constructors and normalized matches bind actual fields once',()=>{
  const optionType={kind:'data',name:'Option_u8'},option={k:'data',name:'Option_u8',fullName:'Option_u8',generated:'router-standard-generic',standardGeneric:{kind:'Option',arguments:[U8]},ctors:[{name:'None',fields:[]},{name:'Some',fields:[{name:'field0',type:U8}]}]};
  const subject={k:'ctor',data:'Option_u8',ctor:'Some',args:[lit(8)],type:optionType};
  const body={k:'match',scrutinee:subject,type:U8,cases:[{pattern:{k:'ctor',data:'Option_u8',ctor:'None',binds:[]},body:{k:'abort',message:'unselected',type:U8}},{pattern:{k:'ctor',data:'Option_u8',ctor:'Some',binds:['n']},body:binary('add',variable('n'),lit(1))}]};
  const result=run([option,entry('ROOT',body,'const ROOT:u8=match Some(8u8){None=>panic!("unselected"),Some(n)=>n+1};')]);
  assert.equal(result.status,'value');assert.equal(result.value.$integer,'9');
  assert.equal(result.proof.trace.find(step=>step.kind==='match').selected,1);
  assert.equal(run([option,entry('ROOT',{...body,cases:[{...body.cases[0],guard:lit(false,BOOL)},body.cases[1]]},'/* unlowered guard */')]).status,'unsupported');
  const wrong={...body,cases:[{...body.cases[1],pattern:{...body.cases[1].pattern,data:'Other'}}]};
  assert.equal(run([option,entry('ROOT',wrong,'/* wrong constructor owner */')]).status,'unsupported');
});

test('actual pinned Duration constructor descriptors evaluate normalization and checked seconds',()=>{
  const duration={...TIME_DATA[0].items[0].items[0],fullName:'std.time.Duration'};
  const contracts=new Map(TIME_CONTRACTS.map(contract=>[contract.id,contract]));
  const host=(id,args)=>({k:'routerHostCall',id,args,type:DURATION});
  const root=entry('ROOT',host('std_time_duration_from_secs',[binary('mul',binary('mul',lit(24,U64),lit(60,U64)),lit(60,U64))]),'const ROOT:Duration=Duration::from_secs(24*60*60);');
  const result=run([duration,root],'ROOT',{contracts});assert.equal(result.status,'value');assert.equal(result.value.secs.$integer,'86400');assert.equal(result.value.nanos.$integer,'0');
  const normalized=entry('ROOT',host('std_time_duration_new',[lit(1,U64),lit(1234567890,U32)]),'const ROOT:Duration=Duration::new(1,1234567890);');
  assert.equal(run([duration,normalized],'ROOT',{contracts}).value.secs.$integer,'2');
  const overflowing=entry('ROOT',host('std_time_duration_new',[lit('18446744073709551615',U64),lit(1000000000,U32)]),'const ROOT:Duration=Duration::new(u64::MAX,1000000000);');
  assert.equal(run([duration,overflowing],'ROOT',{contracts}).status,'const-panic');
  assert.equal(run([duration,root]).status,'unsupported');
  assert.equal(run([{...duration,generated:'source-local-shadow'},root],'ROOT',{contracts}).status,'unsupported');
  const forged=new Map(contracts),descriptor=forged.get('std_time_duration_from_secs');
  forged.set(descriptor.id,{...descriptor,params:[{...descriptor.params[0],bits:32}]});
  assert.equal(run([duration,root],'ROOT',{contracts:forged}).status,'unsupported');
  forged.set(descriptor.id,{...descriptor,ret:{kind:'unit'}});
  assert.equal(run([duration,root],'ROOT',{contracts:forged}).status,'unsupported');
});

test('pinned Duration::from_millis keeps exact u64 normalization without scaling overflow',()=>{
  const duration={...TIME_DATA[0].items[0].items[0],fullName:'std.time.Duration'},contracts=new Map(TIME_CONTRACTS.map(contract=>[contract.id,contract]));
  for(const [input,secs,nanos] of [['0','0','0'],['25','0','25000000'],['50','0','50000000'],['20','0','20000000'],['1000','1','0'],['2569','2','569000000'],['18446744073709551615','18446744073709551','615000000']]) {
    const root=entry('ROOT',{k:'routerHostCall',id:'std_time_duration_from_millis',args:[lit(input,U64)],type:DURATION},`const ROOT:Duration=Duration::from_millis(${input});`);
    const result=run([duration,root],'ROOT',{contracts});assert.equal(result.status,'value');assert.equal(result.value.secs.$integer,secs);assert.equal(result.value.nanos.$integer,nanos);
    assert.equal(result.proof.sourceLinksVerified,false);assert.equal(result.proof.trace.at(-1).id,'std_time_duration_from_millis');
    const wrong=new Map(contracts),contract=wrong.get('std_time_duration_from_millis');wrong.set(contract.id,{...contract,constEligible:false});assert.equal(run([duration,root],'ROOT',{contracts:wrong}).status,'unsupported');
  }
});

test('unproved cast and shift nodes cannot acquire primitive constant semantics',()=>{
  const U16=fixed(16),cast={k:'cast',arg:lit(255),from:U8,to:U16,type:U16,flavor:'exact'};
  assert.equal(scalar(cast,'const ROOT:u16=255u8 as u16;').value.$integer,'255');
  assert.equal(scalar({...cast,arg:lit(256,U16),from:U16,to:U8,type:U8},'const ROOT:u8=256u16 as u8;').status,'unsupported');
  assert.equal(scalar({...cast,arg:lit(-1,I8),from:I8,to:U8,type:U8},'const ROOT:u8=-1i8 as u8;').status,'unsupported');
  assert.equal(scalar(binary('shl',lit(1),lit(1)),'const ROOT:u8=1u8<<1;').status,'unsupported');
});

test('budgets and dependency cycles are refusals, not fabricated Rust panics',()=>{
  const body=binary('add',lit(1),lit(2));
  assert.equal(scalar(body,'const ROOT:u8=1u8+2u8;',U8,{limits:{steps:2}}).status,'budget-exhausted');
  const a=entry('ROOT',call('B'),'const ROOT:u8=B;'),b=entry('B',call('ROOT'),'const B:u8=ROOT;');
  assert.equal(run([a,b]).status,'budget-exhausted');
  const terminating=entry('recursive',{k:'if',cond:variable('stop',BOOL),then:lit(1),else:call('recursive',[lit(false,BOOL)]),type:U8},'const fn recursive(stop:bool)->u8{if stop{1}else{recursive(false)}}',{constant:false,params:[{name:'stop',type:BOOL}]});
  assert.equal(run([terminating,entry('ROOT',call('recursive',[lit(true,BOOL)]),'const ROOT:u8=recursive(true);')]).status,'value');
  assert.equal(scalar(lit(1),'const ROOT:u8=1;',U8,{limits:{steps:100001}}).status,'unsupported');
});
test('bounded checked-IR normalization is separate from evaluated value cells',()=>{
  const source='const ROOT:u8=1u8;',root=entry('ROOT',lit(1),source);
  const result=run([{...root,normalizationFixture:Array(18000).fill(null)}],'ROOT',{limits:{valueCells:1}});
  assert.equal(result.status,'value');assert.equal(result.proof.cost.valueCells,1);assert.ok(result.proof.cost.normalizationCells>18000);
  assert.equal(result.proof.sourceLinksVerified,false);
  assert.equal(result.proof.limits.normalizationCells,65536);assert.equal(result.proof.limits.normalizationBytes,1048576);
  for(const normalizationFixture of [Array(66000).fill(null),'x'.repeat(1048577)])assert.equal(run([{...root,normalizationFixture}]).status,'budget-exhausted');
  assert.equal(run([{...root,normalizationFixture:Array(20).fill(null)}],'ROOT',{limits:{normalizationCells:10}}).status,'budget-exhausted');
  assert.equal(scalar(binary('add',lit(1),lit(2)),source,U8,{limits:{valueCells:1}}).status,'budget-exhausted');
});

test('string comparisons never acquire const trait permission or JavaScript lexical ordering',()=>{
  const STRING={kind:'string',rustOwnership:{kind:'borrowed',source:'str'}};
  for(const operation of ['eq','ne','lt','le','gt','ge']){
    const expression=binary(operation,lit('\ue000',STRING),lit('\u{10000}',STRING),BOOL);
    assert.equal(scalar(expression,'/* string trait permission is unproved */').status,'unsupported');
    assert.equal(scalar({k:'if',cond:lit(true,BOOL),then:lit(true,BOOL),else:expression,type:BOOL},'/* even unselected non-const traits remain ineligible */').status,'unsupported');
  }
});

test('proofs retain original source, checked-IR digest, profile and deterministic selected paths',()=>{
  const source='const ROOT:u8=7u8;',root=entry('ROOT',lit(7),source),a=run([root]),b=run([root]);
  assert.equal(a.status,'value');assert.deepEqual(a,b);assert.ok(Object.isFrozen(a.proof));
  assert.equal(a.proof.resolution[0].source.bodySha256,createHash('sha256').update(source).digest('hex'));
  assert.match(a.proof.checkedIRSha256,/^[0-9a-f]{64}$/u);assert.equal(a.proof.scope,'this concrete checked constant root');
  assert.equal(evaluateCheckedConstant({schemaVersion:1,sourceLanguage:'Rust',declarations:new Map([['ROOT',root]])},'ROOT').status,'unsupported');
  const sourcePattern={k:'ctor',path:['Some']};
  assert.equal(run([{...root,body:{...root.body,sourcePattern}}]).status,'value');
  assert.equal(run([root],'ROOT',{targetProfile:{rustVersion:'1.89.0',pointerBits:32}}).status,'unsupported');
  let getterReads=0;const bad={...root};Object.defineProperty(bad,'body',{enumerable:true,get(){getterReads++;return root.body;}});
  assert.equal(run([bad]).status,'unsupported');assert.equal(getterReads,0);
});
