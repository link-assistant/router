import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram,parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const tuple=(...fields)=>Object.freeze({$:'Tuple',...Object.fromEntries(fields.map((value,index)=>['field'+index,value]))});
test('tuple and wildcard parameters retain written evidence and execute through both typed targets',async()=>{
  const source='pub fn sum((left,right):(u8,u8),extra:u8)->u8{left+right+extra} pub fn nested((n,(flag,text)):(u8,(bool,&str)))->u8{if flag&&text=="Ω"{n}else{0}} pub fn wild(_:u8,_:bool)->u8{3} pub fn collision((value,router_parameter_0):(u8,u8))->u8{value+router_parameter_0} pub fn borrowed((text,_):(&str,bool))->&str{text} pub fn ordinary(mut n:u8)->u8{n+=1;n} pub fn unit(():())->bool{true}';
  const checked=roundTripProgram(checkProgram(parseRust(source+' fn main(){}'))),sum=checked.declarations.get('sum');
  assert.equal(sum.sourceParameterPatterns.profile,'checked-irrefutable-parameters-v1');
  assert.equal(sum.sourceParameterPatterns.bindings[0].pattern.k,'routerTuplePattern');
  assert.equal(sum.sourceParameterPatterns.bindings[0].parameter,sum.params[0].name);
  assert.equal(sum.body.patternControl.plan.refutable,false);
  assert.notEqual(checked.declarations.get('collision').params[0].name,'router_parameter_0');
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.sum(tuple(2n,3n),4n),9n);assert.throws(()=>api.sum(tuple(255n,0n),1n),/overflow/);
    assert.equal(api.nested(tuple(7n,tuple(true,'Ω'))),7n);assert.equal(api.nested(tuple(7n,tuple(false,'Ω'))),0n);
    assert.equal(api.wild(4n,true),3n);assert.equal(api.collision(tuple(2n,5n)),7n);assert.equal(api.borrowed(tuple('Ω',false)),'Ω');
    assert.equal(api.ordinary(5n),6n);assert.equal(api.unit(null),true);
    let reads=0;const hostile=Object.freeze(Object.defineProperty({$:'Tuple',field1:2n},'field0',{get(){reads++;return 1n;}}));
    assert.throws(()=>api.sum(hostile,0n),TypeError);assert.equal(reads,0);
  });
});
test('irrefutable source constructor parameters use their actual nominal record layouts',async()=>{
  const source='struct Wrap(u8); struct Pair {left:u8,right:u8} pub fn wrapped(Wrap(n):Wrap)->u8{n} pub fn record(Pair{left,right}:Pair)->u8{left+right}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  for(const name of ['wrapped','record']) {
    const original=checked.declarations.get(name).sourceParameterPatterns;
    assert.deepEqual(target.declarations.get(`rp_${Buffer.from(name).toString('hex')}`).sourceParameterPatterns,original);
  }
  // Per-source bulk generation selects and emits each checked project closure.
  // This must follow executable dependencies, not frontend pattern evidence.
  const perSource=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});
  assert.equal(perSource.ir.counts.executableFunctions,2);
  const verify=api=>{
    assert.equal(api.wrapped(Object.freeze({$:'Wrap',field0:8n})),8n);assert.equal(api.record(Object.freeze({$:'Pair',left:2n,right:5n})),7n);
    assert.throws(()=>api.wrapped(Object.freeze({$:'Other',field0:8n})),TypeError);
  };
  await verifyTypedTargets(result,verify);
  await verifyTypedTargets(perSource,verify);
});
test('parameter patterns refuse invalid bindings, refutable domains and unproved ownership',()=>{
  for(const source of [
    'pub fn bad((n,n):(u8,u8))->u8{n}',
    'pub fn bad((n,_):(u8,u8),n:u8)->u8{n}',
    'pub fn bad(n:u8,(n,_):(u8,u8))->u8{n}',
    'pub fn bad((true,n):(bool,u8))->u8{n}',
    'pub fn bad((n,):(u8,u8))->u8{n}',
    'pub fn bad((ref n,_):(u8,u8))->u8{0}',
    'pub fn bad((mut n,_):(u8,u8))->u8{n}',
    'pub fn bad((text,_):(String,u8))->String{text}',
    'pub fn bad((n,_):&(u8,u8))->u8{n}',
    'struct Other(u8); struct Wrap(u8); pub fn bad(Wrap(n):Other)->u8{n}',
  ]) {
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('out-of-line parameter patterns preserve original evidence and linked spans through both targets',async()=>{
  const declaration='pub const fn sum((left,right):(u8,u8))->u8{left+right}',child='const PAD:u8=0;\n'+declaration+'\npub const VALUE:u8=sum((2,3));';
  const files={'src/lib.rs':'mod external;pub fn run()->u8{external::sum((2,3))}','src/external.rs':child};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
  const original=parseRust(declaration+' fn main(){}').items.find(entry=>entry.name==='sum'),checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const sum=checked.declarations.get('external.sum'),emitted=[...target.declarations.values()].find(entry=>entry.sourceParameterPatterns&&entry.impl===undefined);
  assert.deepEqual(sum.sourceParameterPatterns,original.sourceParameterPatterns);assert.deepEqual(sum.sourceParameterPatterns.bindings[0].pattern,original.params[0].sourceParameterPattern);
  assert.deepEqual(emitted.sourceParameterPatterns,sum.sourceParameterPatterns);
  const link=checked.declarations.get('external.VALUE').constantEvaluationProof.resolution.find(entry=>entry.name==='external.sum').source;
  assert.equal(link.sourcePath,'src/external.rs');assert.deepEqual(link.declarationSpan,{start:child.indexOf(declaration),end:child.indexOf(declaration)+declaration.length});
  await verifyTypedTargets(result,api=>{assert.equal(api.run(),5n);assert.equal(api['external.sum'](tuple(3n,4n)),7n);assert.equal(api['external.VALUE'],5n);});
});
