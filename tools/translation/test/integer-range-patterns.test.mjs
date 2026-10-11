import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkedIntegerRange,proveIntegerCoverage} from '../extensions/integer-range-patterns.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const primitive=name=>({...rustFixedType(name),rustPrimitiveName:name});
const literal=value=>({k:'numLit',value:String(value).replace(/^-/u,''),...(String(value).startsWith('-')?{negative:true}:{})});
const range=(lower,upper,inclusive=true)=>({k:'routerIntegerRangePattern',lower:literal(lower),upper:literal(upper),inclusive});
const project=(source,options={})=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,...options});
async function both(source,verify){const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyCohortTargets(result,verify);return result;}

test('bounded interval proof covers u128 without enumeration and detects a single missing value',()=>{
  const type=primitive('u128'),max=(1n<<128n)-1n,split=1n<<127n;
  const proof=proveIntegerCoverage([range(0n,split,false),range(split,max)],type);
  assert.equal(proof.intervals.length,2);assert.equal(proof.domain.max,String(max));
  assert.throws(()=>proveIntegerCoverage([range(0n,split,false),range(split+1n,max)],type),/nonexhaustive/);
  assert.equal(checkedIntegerRange(range(-128n,127n),primitive('i8')).coversDomain,true);
  for(const pattern of [range(7,7,false),range(9,8),range(-129,0)])assert.throws(()=>checkedIntegerRange(pattern,primitive('i8')));
  assert.throws(()=>checkedIntegerRange({...range(0,4),lower:{...literal(0),negative:true}},primitive('u8')),/negation/);
  assert.throws(()=>checkedIntegerRange({...range(0,4),lower:{...literal(0),suffix:'usize'}},primitive('u64')),/primitive/);
  assert.throws(()=>checkedIntegerRange(range(0,4),{kind:'fixed',bits:8,signed:false}),/actual/);
  assert.throws(()=>proveIntegerCoverage(Array.from({length:257},()=>range(0,255)),primitive('u8')),/bound/);
});

test('inclusive exclusive signed minima and adjacent complete domains execute JS and strict TS',{timeout:30_000},async()=>{
  const source='pub const fn signed(v:i8)->u8{match v{-128i8..=-1i8=>1,0i8..127i8=>2,127i8=>3}} pub fn unsigned(v:u8)->u8{match v{0..10=>1,10..=20=>2,21..=255=>3}} pub fn wide(v:u128)->bool{match v{(0..=340282366920938463463374607431768211455u128)=>true}} pub const SELECTED:u8=signed(-128i8);';
  const result=await both(source,api=>{
    for(const [value,expected]of [[-128n,1n],[-1n,1n],[0n,2n],[126n,2n],[127n,3n]])assert.equal(api.signed(value),expected);
    for(const [value,expected]of [[0n,1n],[9n,1n],[10n,2n],[20n,2n],[21n,3n],[255n,3n]])assert.equal(api.unsigned(value),expected);
    assert.equal(api.wide(0n),true);assert.equal(api.wide((1n<<128n)-1n),true);assert.equal(api.SELECTED,1n);assert.throws(()=>api.unsigned(256n),RangeError);
  });
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  assert.equal(checked.declarations.get('signed').body.integerRangeMatchProof.exhaustiveness,'unguarded-interval-union');
  assert.equal(checked.declarations.get('SELECTED').constantEvaluationProof.sourceLinksVerified,true);
});

test('overlap guards source order and omitted block-arm commas retain ordinary outcomes',{timeout:30_000},async()=>{
  await both('pub fn choose(v:u8)->u8{match v{0..=100 if false=>1,20..=30=>2,0..=100=>3,_=>4}} pub fn blocks(v:u8)->u8{match v{0=>{9} 1..=2 if false=>8,1..=3=>7,_=>6}} pub fn captured(v:u8,n:u8)->u8{match v{0..=10 if n>3=>n,x if x<20=>x,_=>0}}',api=>{
    for(const [value,expected]of [[0n,3n],[20n,2n],[30n,2n],[31n,3n],[100n,3n],[101n,4n]])assert.equal(api.choose(value),expected);
    for(const [value,expected]of [[0n,9n],[1n,7n],[3n,7n],[4n,6n]])assert.equal(api.blocks(value),expected);
    assert.equal(api.captured(3n,7n),7n);assert.equal(api.captured(3n,1n),3n);assert.equal(api.captured(22n,7n),0n);
  });
});

test('subject runs once and failed overlapping guarded alternatives retry in source order',{timeout:30_000},async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn subject()->u8{let ignored=mark("subject");5} pub fn observed()->u8{match subject(){0..=9 | 2..=8 if mark("guard")=>1,_=>2}}';
  await both(source,(api,{withEffectCapabilities})=>{
    const calls=[];let guards=0;const capability={fs:{sync:{readFileSync(path){calls.push(path);if(path==="guard"&&++guards===1)throw Object.assign(Error('missing'),{code:'ENOENT'});return new Uint8Array();}}}};
    assert.equal(withEffectCapabilities(capability,()=>api.observed()),1n);assert.deepEqual(calls,['subject','guard','guard']);
  });
});

test('range gaps guard-only domains and wrong source types stay explicitly refused',()=>{
  for(const source of [
    'pub fn bad(v:u8)->u8{match v{0..=254=>1}}',
    'pub fn bad(v:u8)->u8{match v{0..=255 if true=>1}}',
    'pub fn bad(v:i8)->u8{match v{-128..=-1=>1,1..=127=>2}}',
    'pub fn bad(v:u8)->u8{match v{3..3=>1,_=>0}}',
    'pub fn bad(v:u8)->u8{match v{8..=3=>1,_=>0}}',
    'pub fn bad(v:u8)->u8{match v{0..=256=>1,_=>0}}',
    'pub fn bad(v:i8)->u8{match v{-129..=0=>1,_=>0}}',
    'pub fn bad(v:u64)->u8{match v{0usize..=9usize=>1,_=>0}}',
    'pub fn bad(v:&u8)->u8{match v{0..=9=>1,_=>0}}',
    'pub fn bad(v:f64)->u8{match v{0..=9=>1,_=>0}}',
    'pub fn bad(v:char)->u8{match v{\'a\'..=\'z\'=>1,_=>0}}',
    'const LIMIT:u8=9;pub fn bad(v:u8)->u8{match v{0..=LIMIT=>1,_=>0}}',
    'pub fn bad(v:u8)->u8{match v{0..=>1,_=>0}}',
    'struct T{v:u8} pub fn bad(v:T)->u8{match v{0..=9=>1,_=>0}}',
    'pub const fn bad(v:u8)->u8{match v{0..=9 if true=>1,_=>0}}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
});

test('original logging http_failure keeps exact declaration bytes and threshold semantics',{timeout:30_000},async()=>{
  const source=readFileSync(new URL('src/logging.rs',root),'utf8');assert.equal(hash(source),'9b53f3aa6b958bb2c499f880b3f9e8c2995b6857d151eb80c99b2891bea034d3');
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name==='http_failure');assert.ok(item);assert.deepEqual([item.start,item.end],[2740,3140]);
  const text=source.slice(item.start,item.end);assert.equal(hash(text),'04504b3dc1fa18df4876410df05fbedc3eceb4c7f4af3b34cc65c7f848e48090');
  const result=project(text);assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.executable.map(item=>item.name),['http_failure']);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('http_failure');assert.equal(checked.constFunction,true);assert.ok(checked.body.integerRangeMatchProof);
  await verifyCohortTargets(result,api=>{
    for(const [status,expected]of [[401n,'authentication_or_authorization'],[403n,'authentication_or_authorization'],[407n,'authentication_or_authorization'],[402n,'billing'],[408n,'transport_timeout'],[504n,'transport_timeout'],[429n,'rate_limited'],[400n,'invalid_request'],[422n,'invalid_request'],[404n,'routing_not_found'],[499n,'http_error'],[500n,'upstream_server_error'],[599n,'upstream_server_error'],[600n,'http_error'],[0n,'http_error'],[65535n,'http_error']])assert.equal(api.http_failure(status),expected);
  });
});

test('original ThinkingLevel from_budget retains full enum attrs and mechanically extracted method',{timeout:30_000},async()=>{
  const source=readFileSync(new URL('src/thinking/mod.rs',root),'utf8');assert.equal(hash(source),'26a39c5916007a8fd5ca6c65b25e2135b788ba6831d9ba77674b7b80da1e1b3b');
  const data=sourceItems(source).find(item=>item.term==='enum'&&item.name==='ThinkingLevel');assert.deepEqual([data.start,data.end],[818,1050]);
  assert.equal(hash(source.slice(data.start,data.end)),'45cc1da23cd28ec9698b5cd8ec0e2f4148168920ae33ce5e9fe3f045232ff077');
  const method=extractImplDeclarations(source).implementations.find(item=>item.typePath?.join('::')==='ThinkingLevel').methods.find(method=>method.name==='from_budget');
  assert.deepEqual(method.span,{start:1878,end:2166});assert.equal(hash(method.source),'b47b48021ce81eb7a111b973f4724308e7929e888c89051c7774b2985d958f00');
  const text=source.slice(data.start,data.end)+'\nimpl ThinkingLevel {\n'+method.source+'\n}';
  const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  const result=project(text,{deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(result.meta.refused,[]);
  assert.equal(result.meta.checkedMethods.length,1);assert.equal(result.meta.checkedMethods[0].name,'ThinkingLevel.from_budget');
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const layout=checked.declarations.get('ThinkingLevel');assert.ok(layout.rustAttributes.some(attribute=>attribute.name==='serde'));assert.equal(result.meta.deriveNamespaceFootprints.certificates.length,1);
  assert.equal(result.meta.deriveNamespaceFootprints.certificates[0].generatedImplBehavior,false);
  const entry=[...checked.declarations.values()].find(entry=>entry.impl?.method==='from_budget');assert.equal(entry.constFunction,true);assert.ok(entry.body.integerRangeMatchProof);
  const emitted=[...target.declarations.values()].find(entry=>entry.impl?.method==='from_budget'),alias=`\nexport {${emitted.name} as originalFromBudget};`;
  await verifyCohortTargets({...result,javascript:result.javascript+alias,typescript:result.typescript+alias},(_api,_effects,_result,module)=>{
    for(const [budget,expected]of [[0n,'Minimal'],[512n,'Minimal'],[513n,'Low'],[1024n,'Low'],[1025n,'Medium'],[8192n,'Medium'],[8193n,'High'],[24576n,'High'],[24577n,'XHigh'],[4294967295n,'XHigh']])assert.deepEqual(module.originalFromBudget(budget),{$:expected});
  });
  assert.equal(result.meta.runtimeParity,false); // selected declarations only
});
