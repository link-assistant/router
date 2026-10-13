import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {parseRust,HostChecker} from '../extensions/host-contracts.mjs';
import {finalizeOriginalConversions,requireOriginalConversionEmission} from '../extensions/source-conversion-body.mjs';
import {bindCheckedSourceLinks,checkedSourceContext,metadataDigest} from '../extensions/source-links.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const source='pub fn count(n:u64,value:u64)->u64{if n==0{value}else{count(n-1,value).into()}}';
const vectors={source,observations:[]};
function record(label,value){vectors.observations.push({label,...value});if(process.env.ROUTER_CONVERSION_VECTORS)writeFileSync(process.env.ROUTER_CONVERSION_VECTORS,JSON.stringify(vectors,null,2)+'\n');}
function find(tree){if(!tree||typeof tree!=='object')return null;if(tree.k==='routerSourceConversion')return tree;for(const [key,child]of Object.entries(tree))if(!['type','sourceConversionProof'].includes(key))for(const value of Array.isArray(child)?child:[child]){const node=find(value);if(node)return node;}return null;}
function checked(original=source){const checker=new HostChecker('rust',[]),program=checker.program(parseRust(original+'fn main(){}')),links=bindCheckedSourceLinks(program,checkedSourceContext(program),{targetProfile:{fixture:'exact-finalized-conversion'}});return {checker,program,links,node:find(program.declarations.get('count').body)};}
function negative(label,run,pattern){let error;try{run();}catch(thrown){error=thrown;}assert.ok(error,label);assert.match(error.message,pattern,label);record(label,{error:error.message});}

test('original whole module structural recursion preserves the actual finalized conversion in JS and strict TS',{timeout:60000},async()=>{
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  const entry=result.meta.checkedSemanticProgram.program.declarations.$map.find(([name])=>name==='count')[1],node=find(entry.body);
  assert.equal(entry.body.k,'match');assert.equal(entry.body.cases[1].pattern.k,'natSucc');assert.equal(node.body.value.k,'call');assert.equal(node.body.value.args[0].k,'var');assert.equal(node.body.value.args[0].name,entry.body.cases[1].pattern.name);
  const withoutSpans=value=>Array.isArray(value)?value.map(withoutSpans):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='span').map(([key,child])=>[key,withoutSpans(child)])):value;
  assert.notEqual(node.sourceConversionProof.computationSha256,metadataDigest(withoutSpans(node.body)));
  assert.equal(node.sourceConversionProof.runtimeParity,false);assert.ok(requireOriginalConversionEmission(structuredClone(node)));
  const observations=[];await verifyTypedTargets(result,api=>{for(let n=0n;n<=12n;n++)for(const value of [0n,1n,7n,18446744073709551615n]){assert.equal(api.count(n,value),value);observations.push({depth:n.toString(),value:value.toString(),output:api.count(n,value).toString()});}for(const value of [null,0,{},true,-1n,18446744073709551616n]){assert.throws(()=>api.count(value,1n));assert.throws(()=>api.count(1n,value));}},{childTimeoutMs:30000});record('finalized-whole-module',{result,observations});
});
test('finalization requires private program and source links rather than copied/refrozen/accessor roots',()=>{
  const state=checked();assert.ok(requireOriginalConversionEmission(state.node));
  for(const program of [{...state.program},structuredClone(state.program),Object.freeze({...state.program}),new Proxy(state.program,{})])negative('copied-or-foreign-program',()=>finalizeOriginalConversions(state.checker,program,state.links),/genuine checked program/);
  let reads=0;const forged=Object.defineProperty({},'declarations',{get(){reads++;return state.program.declarations;}});negative('accessor-program',()=>finalizeOriginalConversions(state.checker,forged,state.links),/genuine checked program/);assert.equal(reads,0);
  for(const links of [{...state.links},Object.freeze({...state.links}),new Proxy(state.links,{})])negative('copied-or-foreign-source-links',()=>finalizeOriginalConversions(state.checker,state.program,links),/genuine complete original checked declaration/);
});
test('another checker and later identical-source checking cannot borrow an earlier issuance host',()=>{
  const first=checked(),other=new HostChecker('rust',[]);negative('another-checker',()=>finalizeOriginalConversions(other,first.program,first.links),/own unchanged privately issued/);
  for(const checker of [{...first.checker},new Proxy(first.checker,{})])negative('copied-checker',()=>finalizeOriginalConversions(checker,first.program,first.links),/actual original Host checker/);
  const later=checked();assert.equal(first.node.sourceConversionProof.digest,later.node.sourceConversionProof.digest);negative('later-identical-source-host',()=>finalizeOriginalConversions(first.checker,first.program,first.links),/own unchanged privately issued/);assert.ok(requireOriginalConversionEmission(later.node));
});
test('mutated checked bodies proofs types and foreign caller insertion fail before finalization',()=>{
  for(const [label,mutate]of [
    ['changed-receiver',node=>node.body.value.args[0].name='forged'],
    ['changed-body',node=>node.body.body.name='forged'],
    ['changed-type',node=>node.type.rustPrimitiveName='u32'],
    ['changed-proof',node=>node.sourceConversionProof.caller.sourceSha256='0'.repeat(64)],
    ['changed-source-signature',(_node,entry)=>entry.params[0].type.rustPrimitiveName='u32']
  ]){const state=checked();mutate(state.node,state.program.declarations.get('count'));negative(label,()=>finalizeOriginalConversions(state.checker,state.program,state.links),/checked source association became stale/);record(label+'-full-mutated-program',{program:{...state.program,declarations:[...state.program.declarations]}});}
  const foreign=checked(source.replace('{value}else','{0}else')),original=checked();foreign.program.declarations.get('count').body=structuredClone(original.program.declarations.get('count').body);negative('foreign-original-caller',()=>finalizeOriginalConversions(foreign.checker,foreign.program,foreign.links),/checked source association became stale/);
});
test('post-finalization computation and exact project reference spellings remain immutable',()=>{
  const state=checked();for(const [label,mutate]of [
    ['post-final-receiver',node=>node.body.value.args[0].name='forged'],
    ['post-final-body',node=>node.body.body.name='forged'],
    ['false-project-name',node=>node.body.value.fn='rp_'+Buffer.from('different').toString('hex')],
    ['post-final-proof',node=>node.sourceConversionProof.digest='0'.repeat(64)],
    ['post-final-type',node=>node.body.type.rustPrimitiveName='u32']
  ]){const node=structuredClone(state.node);mutate(node);negative(label,()=>requireOriginalConversionEmission(node),/changed or forged/);record(label+'-full-node',{node});}
  const exact=structuredClone(state.node);exact.body.value.fn='rp_'+Buffer.from('count').toString('hex');assert.ok(requireOriginalConversionEmission(exact));record('exact-original-project-reference',{node:exact});
});

test('genuine program declarations cannot be changed to accessor or proxy roots during finalization',()=>{
  const accessor=checked();let reads=0;Object.defineProperty(accessor.program,'declarations',{get(){reads++;return new Map();}});negative('changed-accessor-declarations',()=>finalizeOriginalConversions(accessor.checker,accessor.program,accessor.links),/data property|own data|accessor/);assert.equal(reads,0);
  const proxy=checked();let traps=0;proxy.program.declarations=new Proxy(proxy.program.declarations,{get(){traps++;throw Error('trap');},getPrototypeOf(){traps++;throw Error('trap');}});negative('changed-proxy-declarations',()=>finalizeOriginalConversions(proxy.checker,proxy.program,proxy.links),/map|Map|proxy|data/);assert.equal(traps,0);
});

test('mutated genuine declaration body accessors and proxies cannot run before source seal validation',()=>{
  const accessor=checked();let reads=0;Object.defineProperty(accessor.program.declarations.get('count'),'body',{enumerable:true,get(){reads++;return {};}});negative('changed-accessor-body',()=>finalizeOriginalConversions(accessor.checker,accessor.program,accessor.links),/accessor|metadata/);assert.equal(reads,0);
  const proxy=checked();let traps=0;proxy.program.declarations.get('count').body=new Proxy(proxy.node,{get(){traps++;throw Error('trap');},ownKeys(){traps++;throw Error('trap');}});negative('changed-proxy-body',()=>finalizeOriginalConversions(proxy.checker,proxy.program,proxy.links),/acyclic data|metadata/);assert.equal(traps,0);
});
