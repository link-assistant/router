import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {HostRustParser,HostChecker,emitJavaScript} from '../extensions/host-contracts.mjs';
import {spawnSync} from 'node:child_process';
import {pinnedOptionBody,pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence,STANDARD_BODY_SOURCE_PROFILE} from '../extensions/standard-body-source.mjs';
import {requirePinnedStandardBody} from '../extensions/standard-body-checker.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=value=>Object.freeze({$:'Some',field0:value}),none=()=>Object.freeze({$:'None'});
function find(node,predicate){
  if(!node||typeof node!=='object')return null;if(predicate(node))return node;
  for(const [key,value]of Object.entries(node))if(!['type','span','patternControl','pinnedStandardBodyProof'].includes(key))for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}
  return null;
}

test('complete original bodies and primitive Default macro expansions retain private source identity',()=>{
  const root=new URL('../source-profiles/standard-method-bodies/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  for(const input of manifest.sources){const encoded=readFileSync(new URL(input.file,root)),raw=gunzipSync(encoded);assert.equal(raw.length,input.bytes);assert.equal(encoded.length,input.compressedBytes);assert.equal(createHash('sha256').update(raw).digest('hex'),input.sha256);assert.equal(createHash('sha256').update(encoded).digest('hex'),input.compressedSha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),input.gitBlobSha);}
  const selection=pinnedOptionBody('unwrap_or_default'),body=parsePinnedBody(HostRustParser,selection),evidence=parsedPinnedBodyEvidence(body);
  assert.equal(selection.method.ownerHeader,'impl<T>Option<T>');assert.equal(selection.method.bodySource.includes('T::default()'),true);assert.equal(evidence.selection,selection);
  assert.throws(()=>parsePinnedBody(HostRustParser,structuredClone(selection)),/privately selected/u);assert.throws(()=>parsedPinnedBodyEvidence(structuredClone(body)),/private actual parse/u);
  body.span.end++;assert.throws(()=>parsedPinnedBodyEvidence(body),/private actual parse/u);
  for(const owner of ['bool','char','usize','u8','u16','u32','u64','u128','isize','i8','i16','i32','i64','i128','f64']){
    const selected=pinnedDefaultBody(owner),parsed=parsePinnedBody(HostRustParser,selected);assert.equal(selected.evidence.kind,'original-macro-expanded-trait-method');assert.equal(selected.evidence.owner,owner);assert.equal(selected.evidence.expandedTrees.length>0,true);assert.equal(parsedPinnedBodyEvidence(parsed).selection,selected);
  }
  assert.equal(pinnedDefaultBody('&str').evidence.kind,'original-trait-method');assert.throws(()=>pinnedDefaultBody('String'),/separately checked/u);
  assert.equal(STANDARD_BODY_SOURCE_PROFILE.wholeCoreTranslated,false);assert.equal(STANDARD_BODY_SOURCE_PROFILE.traitComplete,false);
});

test('actual borrowed str Option bodies specialize original match arms and static Default',async()=>{
  const source='pub fn chosen(value:Option<&str>)->&str{value.unwrap_or("fallback")}pub fn empty(value:Option<&str>)->&str{value.unwrap_or_default()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.chosen(some('Ω😀')),'Ω😀');assert.equal(api.chosen(none()),'fallback');assert.equal(api.empty(some('Ω😀')),'Ω😀');assert.equal(api.empty(none()),'');assert.throws(()=>api.empty(Object.freeze({$:'Some',field0:1n})),TypeError);});
});

test('original scalar Default macro bodies preserve checked integers booleans and f64 values',async()=>{
  const source='pub fn byte(value:Option<u8>)->u8{value.unwrap_or_default()}pub fn signed(value:Option<i32>)->i32{value.unwrap_or_default()}pub fn wide(value:Option<u128>)->u128{value.unwrap_or_default()}pub fn flag(value:Option<bool>)->bool{value.unwrap_or_default()}pub fn floating(value:Option<f64>)->f64{value.unwrap_or_default()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.byte(none()),0n);assert.equal(api.byte(some(255n)),255n);assert.equal(api.signed(none()),0n);assert.equal(api.signed(some(-17n)),-17n);assert.equal(api.wide(none()),0n);assert.equal(api.wide(some((1n<<128n)-1n)),(1n<<128n)-1n);assert.equal(api.flag(none()),false);assert.equal(api.flag(some(true)),true);assert.equal(api.floating(none()),0);assert.equal(Object.is(api.floating(some(-0)),-0),true);assert.equal(Number.isNaN(api.floating(some(NaN))),true);});
});

test('actual method parameter order evaluates receiver and eager fallback effects once',async()=>{
  const source='fn receive(value:Option<u8>)->Option<u8>{let ignored=std::fs::read_to_string("receiver").is_ok();value}fn fallback()->u8{let ignored=std::fs::read_to_string("fallback").is_ok();9u8}pub fn eager(value:Option<u8>)->u8{receive(value).unwrap_or(fallback())}pub fn lazy(value:Option<u8>)->u8{receive(value).unwrap_or_default()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,(api,_result,_module,{effects:{withEffectCapabilities}})=>{
    const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
    assert.equal(withEffectCapabilities(capability,()=>api.eager(some(7n))),7n);assert.deepEqual(calls,['receiver','fallback']);calls.length=0;
    assert.equal(withEffectCapabilities(capability,()=>api.eager(none())),9n);assert.deepEqual(calls,['receiver','fallback']);calls.length=0;
    assert.equal(withEffectCapabilities(capability,()=>api.lazy(none())),0n);assert.deepEqual(calls,['receiver']);
  });
});

test('actual custom inherent methods retain their source argument counts before standard selection',async()=>{
  const source='struct Counter{n:u8}impl Counter{fn unwrap_or_default(&self)->u8{self.n}fn unwrap_or(&self,a:u8,b:u8)->u8{self.n+a+b}}pub fn own(n:u8)->u8{Counter{n}.unwrap_or_default()}pub fn args(n:u8)->u8{Counter{n}.unwrap_or(2u8,3u8)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.own(4n),4n);assert.equal(api.args(4n),9n);});
});

test('source aliases and caller Default and local-name shadows cannot rewrite the core body',async()=>{
  const source='use std::option::Option as O;struct Default{n:u8}pub fn chosen(value:O<u8>)->u8{let default:u8=77u8;value.unwrap_or(default)}pub fn empty(value:O<u8>)->u8{value.unwrap_or_default()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.chosen(none()),77n);assert.equal(api.chosen(some(1n)),1n);assert.equal(api.empty(none()),0n);});
});

test('existing Result eager fallback stays on its prior bounded contract without body promotion',async()=>{
  const source='pub fn old(value:Result<u8,bool>)->u8{value.unwrap_or(9u8)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.old(Object.freeze({$:'Ok',field0:7n})),7n);assert.equal(api.old(Object.freeze({$:'Err',field0:true})),9n);});
  assert.equal(find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('old').body,node=>node.k==='routerPinnedStandardBody'),null);
});

test('source body specialization preserves unsupported trait owner reference const and type controls',()=>{
  for(const source of [
    'pub fn bad(value:&Option<u8>)->u8{value.unwrap_or_default()}',
    'pub fn bad(value:Option<String>)->String{value.unwrap_or_default()}',
    'struct Token{n:u8}impl Default for Token{fn default()->Self{Token{n:0u8}}}pub fn bad(value:Option<Token>)->Token{value.unwrap_or_default()}',
    'pub fn bad(value:Option<u8>)->u16{value.unwrap_or_default()}',
    'pub fn bad(value:Option<u8>)->u8{value.unwrap_or(0u16)}',
    'pub fn bad(value:Option<u8>)->u8{value.unwrap_or_default(0u8)}',
    'pub fn bad(value:Option<u8>)->u8{value.unwrap_or()}',
    'pub fn bad(value:Option<u8>)->u8{value.unwrap_or_default::<u8>()}',
    'pub const fn bad(value:Option<u8>)->u8{value.unwrap_or_default()}',
    'enum Option{Other}pub fn bad(value:Option)->u8{value.unwrap_or_default()}',
  ]){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('checked meta retains original method and Default input identities and refuses proof drift',()=>{
  const source='pub fn empty(value:Option<u8>)->u8{value.unwrap_or_default()}',result=project(source);assert.deepEqual(result.meta.refused,[]);
  const node=find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('empty').body,node=>node.k==='routerPinnedStandardBody');requirePinnedStandardBody(node,HostRustParser);
  assert.equal(node.pinnedStandardBodyProof.selection.method.bodySource.includes('match self'),true);assert.equal(node.pinnedStandardBodyProof.defaultSelection.evidence.kind,'original-macro-expanded-trait-method');
  for(const mutate of [node=>{node.pinnedStandardBodyProof.selection.method.bodySource='{}';},node=>{node.pinnedStandardBodyProof.selection.sourceInputs[0].sha256='0'.repeat(64);},node=>{node.pinnedStandardBodyProof.syntaxSha256='0'.repeat(64);},node=>{node.pinnedStandardBodyProof.defaultSelection.evidence.expansionDigest='0'.repeat(64);},node=>{node.pinnedStandardBodyProof.traitComplete=true;},node=>{node.pinnedStandardBodyProof.constEligible=true;},node=>{node.body.k='unit';}]){const altered=structuredClone(node);mutate(altered);assert.throws(()=>requirePinnedStandardBody(altered,HostRustParser),/body|proof/u);}
  const file=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(file.ir.items.map(item=>item.source).join(''),source);assert.equal(file.ir.counts.executableFunctions,1);
});

test('untouched full Router caller retains its independent mutable borrowed-local refusal',()=>{
  const complete=readFileSync(new URL('../../../src/github_proxy.rs',import.meta.url),'utf8'),item=sourceItems(complete).find(item=>item.name==='contains_inline_zero_after_oid');assert.ok(item);
  const source=complete.slice(item.start,item.end),result=translateSource(source,'src/github_proxy.rs');assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  const caller=result.ir.items.find(item=>item.name==='contains_inline_zero_after_oid');assert.equal(caller.status,'carried');assert.match(JSON.stringify(caller.diagnostic),/mutable borrowed local/u);
});

const stripped=value=>Array.isArray(value)?value.map(stripped):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['span','type','patternControl'].includes(key)).map(([key,item])=>[key,stripped(item)])):typeof value==='bigint'?value.toString():value;
const rewriteDigest=node=>{node.pinnedStandardBodyProof.checkedBodyDigest=createHash('sha256').update(JSON.stringify(stripped(node.body))).digest('hex');};

test('recomputed public checksums cannot replace original standard match behavior or real references',()=>{
  const result=project('pub fn chosen(value:Option<u8>)->u8{value.unwrap_or(9u8)}'),program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  const node=find([...program.declarations.values()].find(item=>item.k==='fn').body,item=>item.k==='routerPinnedStandardBody');
  requirePinnedStandardBody(node,HostRustParser,{Checker:HostChecker,program});
  for(const mutate of [
    altered=>{altered.body.body.body={k:'lit',value:3n,type:structuredClone(altered.type)};},
    altered=>{const match=find(altered.body,item=>item.k==='match');match.cases.reverse();},
    altered=>{const match=find(altered.body,item=>item.k==='match');match.cases[0].pattern.data='rp_'+Buffer.from('UnrelatedOption').toString('hex');},
    altered=>{const match=find(altered.body,item=>item.k==='match');match.cases[0].body={k:'lit',value:7n,type:structuredClone(altered.type)};},
  ]){const altered=structuredClone(node);mutate(altered);rewriteDigest(altered);assert.throws(()=>requirePinnedStandardBody(altered,HostRustParser,{Checker:HostChecker,program}),/body|specialization/);}
});

test('serialized meta reconstructs standard bodies in a fresh process with no issuance cache',()=>{
  const result=project('pub fn empty(value:Option<u8>)->u8{value.unwrap_or_default()}');
  const module=new URL('../extensions/host-contracts.mjs',import.meta.url).href,meta=new URL('../semantic-meta.mjs',import.meta.url).href;
  const script=`import {emitJavaScript} from ${JSON.stringify(module)};import {parseProgram} from ${JSON.stringify(meta)};let input='';for await(const chunk of process.stdin)input+=chunk;const result=emitJavaScript(parseProgram(input));if(!result.text.includes('function'))throw new Error('missing actual emitted function');`;
  const child=spawnSync('node',['--input-type=module','-e',script],{input:JSON.stringify(result.meta.targetSemanticProgram),encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
  assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
});

test('actual computed str signatures support split and prefix Default without promoting portable strings',async()=>{
  const result=project('pub fn part(value:&str)->&str{value.split(\'"\').next().unwrap_or_default()}pub fn prefix(value:&str)->&str{value.strip_prefix("pre").unwrap_or_default()}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.part('first"second'),'first');assert.equal(api.part(''),'');assert.equal(api.prefix('prefix'),'fix');assert.equal(api.prefix('other'),'');});
  for(const source of ['type u8=bool;pub fn masked(value:&str)->Vec<u8>{value.bytes().collect()}','type str=bool;pub fn masked(value:Option<&str>)->&str{value.unwrap_or_default()}']){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='masked').status,'carried');assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('owned allocations retain the original borrowed standard body beneath the conversion',async()=>{
  const source='pub fn prefix(value:&str)->String{value.strip_prefix("Ω").unwrap_or("fallback").to_string()}pub fn split(value:&str)->String{value.split(\'"\').next().unwrap_or_default().to_string()}pub fn repeated(value:&str)->String{value.strip_suffix("😀").unwrap_or("fallback").to_string().to_string()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const entry of [...program.declarations.values()].filter(entry=>entry.k==='fn')){
    const allocation=find(entry.body,node=>node.k==='toString');assert.ok(allocation);assert.equal(allocation.type.rustOwnership.source,'String');assert.equal(allocation.constEligible,false);
    const body=find(allocation.arg,node=>node.k==='routerPinnedStandardBody');assert.ok(body);assert.equal(body.type.rustOwnership.source,'str');requirePinnedStandardBody(body,HostRustParser,{Checker:HostChecker,program});
    assert.equal(allocation.type.rustBorrowLifetime,undefined);assert.equal(allocation.type.rustStandardSignature,undefined);
  }
  await verifyTypedTargets(result,api=>{assert.equal(api.prefix('Ω😀'),'😀');assert.equal(api.prefix('other'),'fallback');assert.equal(api.split('first"second'),'first');assert.equal(api.split(''),'');assert.equal(api.repeated('Ω😀'),'Ω');assert.equal(api.repeated('other'),'fallback');});
  for(const source of ['pub fn bad(value:&str)->&str{value.strip_prefix("Ω").unwrap_or("fallback").to_string()}','pub const fn bad(value:&str)->String{value.to_string()}']){
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried');assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('actual borrowed trim signatures survive fresh reverse pipelines into original Option bodies',async()=>{
  const source='pub fn chosen(header:&str)->&str{header.split(\',\').map(str::trim).rfind(|part|!part.is_empty()).unwrap_or("")}pub fn default(header:&str)->&str{header.split(\',\').map(str::trim_start).rfind(|part|!part.is_empty()).unwrap_or_default()}pub fn owned(header:&str)->String{header.split(\',\').map(str::trim).rfind(|part|!part.is_empty()).unwrap_or("").to_string()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const entry of [...program.declarations.values()].filter(entry=>entry.k==='fn')){
    const body=find(entry.body,node=>node.k==='routerPinnedStandardBody');assert.ok(body);assert.equal(body.type.rustStandardSignature.kind,'borrowed-str');requirePinnedStandardBody(body,HostRustParser,{Checker:HostChecker,program});
  }
  await verifyTypedTargets(result,api=>{for(const [value,want]of [['',''],[', ,',''],['first, Ω , ','Ω'],['first,\u0085','first'],['first,\uFEFF','\uFEFF']]){assert.equal(api.chosen(value),want);assert.equal(api.owned(value),want);}assert.equal(api.default('first, Ω '),'Ω ');assert.equal(api.default(', ,'),'');});
  for(const source of ['pub fn bad(header:String)->&str{header.trim().split(\',\').map(str::trim).rfind(|part|!part.is_empty()).unwrap_or("")}','type str=bool;pub fn bad(header:&str)->&str{header.trim().split(\',\').map(str::trim).rfind(|part|!part.is_empty()).unwrap_or("")}']){
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried');assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
