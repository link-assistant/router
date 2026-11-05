// Original primitive macro member + written primitive invocation + generic
// intrinsic contract. No whole-macro/core or decimal-formatter proof is issued.
import {openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {rustFixedType} from '../checked-types.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const root=new URL('../source-profiles/fixed-wrapping/',import.meta.url);
const MANIFEST_SHA256='b0b3035cc16994306adf4de34ec0f7fb52edde483569f7d50635a5c53eeebba6';
const SOURCE_BYTES=8388608,MEMBER_BYTES=512*1024;
const selections=new WeakSet();let current=null,operationDepth=0;
const words=input=>input.filter(token=>token.type!=='comment').map(token=>token.text);
const failure=message=>{throw new TypeError('Primitive wrapping source operation: '+message);};
function boundedRead(url,maximum,expected=null){
 const descriptor=openSync(url,'r');try{const stat=fstatSync(descriptor);if(!stat.isFile()||!Number.isSafeInteger(stat.size)||stat.size<0||stat.size>maximum||expected!==null&&stat.size!==expected)failure('complete original byte bound or length differs');const bytes=Buffer.alloc(stat.size);let offset=0;while(offset<bytes.length){const count=readSync(descriptor,bytes,offset,bytes.length-offset,offset);if(count===0)failure('complete original read was truncated');offset+=count;}const extra=Buffer.alloc(1);if(readSync(descriptor,extra,0,1,offset)!==0||fstatSync(descriptor).size!==stat.size)failure('complete original changed while reading');return bytes;}finally{closeSync(descriptor);}
}
function freshManifest(){
 try{const bytes=boundedRead(new URL('manifest.json',root),65536);if(hash(bytes)!==MANIFEST_SHA256)failure('profile differs from its audited pins');return {manifest:freeze(JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes))),bytes:bytes.length};}catch(error){if(current)current.root.valid=false;throw error;}
}
// Immutable public configuration DATA only; no source body or verdict survives.
const manifest=freshManifest().manifest;
export const FIXED_WRAPPING_SOURCE_PROFILE=freeze({schema:manifest.schema,rust:manifest.rust,manifestSha256:MANIFEST_SHA256,sources:manifest.sources,wholeMacroExpansion:false,wholeCoreTranslated:false,traitComplete:false,formatterEquivalence:false,runtimeParity:false});
function active(){if(!current||!current.root.valid)failure('source operation is closed or invalidated');if(++current.root.cells>200000)failure('complete source selection cell bound');return current.root;}
function compressedInput(pin){const bytes=boundedRead(new URL(pin.file,root),MEMBER_BYTES,pin.compressedBytes);if(hash(bytes)!==pin.compressedSha256)failure('compressed complete original differs from its audited pin');return bytes;}
function rejoin(state){
 try{if(!state.valid)failure('source operation was invalidated');freshManifest();if(state.inputs!==null)for(const input of state.inputs.values())compressedInput(input.pin);}catch(error){state.valid=false;throw error;}
}
function sources(){
 const state=active();if(state.inputs!==null)return state.inputs;const inputs=new Map();
 try{for(const pin of state.manifest.sources){
  const compressed=compressedInput(pin),raw=gunzipSync(compressed,{maxOutputLength:MEMBER_BYTES});state.bytes+=compressed.length+raw.length;if(state.bytes>SOURCE_BYTES)failure('complete retained native source bound');
  if(raw.length!==pin.bytes||hash(raw)!==pin.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==pin.gitBlobSha)failure('complete original raw or Git blob pin differs');
  const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(!Buffer.from(source,'utf8').equals(raw))failure('complete original UTF-8 inverse differs');let concreteSyntax=null;
  if(pin.path.endsWith('.rs')){const concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),wire=serializeConcreteSyntaxMeta(concrete.document),inverse=transportConcreteSyntaxMeta(wire).source;if(inverse!==source)failure('complete original CST inverse differs');concreteSyntax=wire;}
  inputs.set(pin.path,{pin,source,concreteSyntax});
 }state.inputs=inputs;return inputs;}catch(error){inputs.clear();state.valid=false;throw error;}
}
const tokensFor=input=>{const state=active();if(!state.tokens.has(input.pin.path))state.tokens.set(input.pin.path,rustTokens(input.source).filter(token=>token.type!=='comment'));return state.tokens.get(input.pin.path);};
const itemsFor=input=>{const state=active();if(!state.items.has(input.pin.path))state.items.set(input.pin.path,sourceItems(input.source));return state.items.get(input.pin.path);};
export function withFixedWrappingSourceOperation(operation){
 if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation)||types.isGeneratorFunction(operation))failure('one ordinary synchronous nongenerator callback required');if(operationDepth>=64)failure('source operation nesting bound');
 const prior=current;if(prior&&!prior.root.valid)failure('parent source operation was invalidated');const input=freshManifest(),state=prior?.root??{manifest:input.manifest,bytes:input.bytes,inputs:null,tokens:new Map(),items:new Map(),cells:0,valid:true},frame={root:state,proofs:new Map()};current=frame;operationDepth++;let failed=false;
 try{const result=operation();if(types.isPromise(result)||result!==null&&['object','function'].includes(typeof result)&&types.isProxy(result))failure('ordinary synchronous result required');if(result!==null&&['object','function'].includes(typeof result)){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))failure('own thenable or accessor result refused');}return result;}catch(error){failed=true;throw error;}
 finally{try{try{rejoin(state);}catch(error){if(!failed)throw error;}}finally{frame.proofs.clear();current=prior;operationDepth--;if(!prior){state.inputs?.clear();state.inputs=null;state.tokens.clear();state.items.clear();state.manifest=null;state.valid=false;}}}
}
function same(actual,expected){return actual.length===expected.length&&actual.every((value,index)=>value===expected[index]);}
function selectFixedWrapping(type,method){
  const owner=type?.rustPrimitiveName??(type?.signed?'i':'u')+type?.bits,primitive=rustFixedType(owner);
  if(!/^[iu](8|16|32|64|128)$/.test(owner)||type?.kind!=='fixed'||!primitive||primitive.bits!==type.bits||primitive.signed!==type.signed||!['wrapping_add','wrapping_sub'].includes(method))throw new TypeError('Wrapping needs a checked fixed primitive width and original supported method');
  active();const key=owner+'::'+method;if(current.proofs.has(key))return current.proofs.get(key);
  const files=sources(),module=files.get('library/core/src/num/mod.rs'),macroPath='library/core/src/num/'+(primitive.signed?'int':'uint')+'_macros.rs',macro=files.get(macroPath),intrinsics=files.get('library/core/src/intrinsics/mod.rs'),macroName=(primitive.signed?'int':'uint')+'_impl';
  const owners=itemsFor(module).filter(item=>item.term==='impl'&&item.name===owner&&same(words(item.tokens).slice(0,2),['impl',owner]));
  if(owners.length!==1)throw new TypeError('Wrapping primitive needs its one unconditional original impl');
  const impl=owners[0],tokens=impl.tokens.filter(token=>token.type!=='comment'),call=tokens.findIndex((token,index)=>token.text===macroName+'!'||token.text===macroName&&tokens[index+1]?.text==='!');
  if(call<0)throw new TypeError('Original primitive macro invocation is absent');
  const open=call+(tokens[call].text.endsWith('!')?1:2);if(tokens[open]?.text!=='{')throw new TypeError('Original primitive macro invocation delimiters differ');
  let depth=1,end=open+1;for(;end<tokens.length&&depth;end++){if(tokens[end].text==='{')depth++;if(tokens[end].text==='}')depth--;}if(depth)throw new TypeError('Original primitive macro invocation is incomplete');
  const invocation=tokens.slice(open+1,end-1),assignments=new Map();let group=[];
  for(const token of [...invocation,{text:','}]){if(token.text!==','){group.push(token);continue;}if(group.length){if(group[1]?.text!=='=')throw new TypeError('Original primitive macro arguments need named fields');const name=group[0].text;if(assignments.has(name))throw new TypeError('Original primitive macro argument is repeated');assignments.set(name,group.slice(2).map(value=>value.text));group=[];}}
  if(!same(assignments.get('Self')??[],[owner])||!same(assignments.get('ActualT')??[],[owner])||!same(assignments.get('BITS')??[],[String(primitive.bits)]))throw new TypeError('Original primitive Self/width binding differs');
  const rootTokens=tokensFor(module),joined=rootTokens.map(token=>token.text).join('');
  if(!joined.includes('usecrate::{ascii,intrinsics,mem};')||!joined.includes('#[macro_use]mod'+(primitive.signed?'int':'uint')+'_macros;'))throw new TypeError('Original intrinsic/macro namespace import differs');
  const mt=tokensFor(macro);if(mt[0]?.text!=='macro_rules!'||mt[1]?.text!==macroName)throw new TypeError('Original primitive macro definition owner differs');
  const positions=mt.flatMap((token,index)=>token.text==='fn'&&mt[index+1]?.text===method?[index]:[]);if(positions.length!==1)throw new TypeError('Original primitive wrapping member is absent or ambiguous');
  const at=positions[0],header=mt.slice(at-2,at+13).map(token=>token.text),expected=['pub','const','fn',method,'(','self',',','rhs',':','Self',')','->','Self','{','intrinsics'];
  if(!same(header,expected))throw new TypeError('Original wrapping member requires its actual by-value const Self signature');
  const body=mt.slice(at+11,at+21).map(token=>token.text);
  if(!same(body,['{','intrinsics','::',method,'(','self',',','rhs',')','}']))throw new TypeError('Original wrapping body is not its single generic intrinsic call');
  const methodSpan={start:mt[at-2].start,end:mt[at+20].end},definition=macro.source.slice(methodSpan.start,methodSpan.end),prefix=macro.source.slice(Math.max(0,mt[at-2].start-1000),mt[at-2].start);
  if(!/rustc_const_stable\([^\n]*since = "1\.32\.0"\)/.test(prefix))throw new TypeError('Original primitive wrapping const stability differs');
  const it=tokensFor(intrinsics),intrinsicPositions=it.flatMap((token,index)=>token.text==='fn'&&it[index+1]?.text===method?[index]:[]);if(intrinsicPositions.length!==1)throw new TypeError('Original generic wrapping intrinsic is absent or ambiguous');
  const ia=intrinsicPositions[0],intrinsicHeader=it.slice(ia-2,ia+23).map(token=>token.text),expectedIntrinsic=['pub','const','fn',method,'<','T',':','Copy','>','(','a',':','T',',','b',':','T',')','->','T',';'];
  if(!same(intrinsicHeader.slice(0,expectedIntrinsic.length),expectedIntrinsic))throw new TypeError('Original intrinsic signature/const contract differs');
  const intrinsicSpan={start:it[ia-2].start,end:it[ia+18].end},intrinsicSource=intrinsics.source.slice(intrinsicSpan.start,intrinsicSpan.end),documentation=intrinsics.source.slice(Math.max(0,intrinsicSpan.start-900),intrinsicSpan.start),operator=method==='wrapping_add'?'+':'-';
  if(!documentation.includes('Returns (a '+operator+' b) mod 2<sup>N</sup>, where N is the width of T in bits.')||!documentation.includes('does not require an `unsafe` block'))throw new TypeError('Original generic intrinsic modulo/domain contract differs');
  const proof=freeze({schema:'source-checked-primitive-wrapping-contract-v1',profileSha256:MANIFEST_SHA256,rust:manifest.rust,owner,width:primitive.bits,signed:primitive.signed,method,constSince:'1.32.0',primitiveImpl:{path:module.pin.path,sha256:module.pin.sha256,span:{start:impl.start,end:impl.end}},invocation:{macroName,span:{start:tokens[call].start,end:tokens[end-1].end},assignments:Object.fromEntries(assignments)},originalMember:{path:macroPath,sourceSha256:macro.pin.sha256,span:methodSpan,source:definition,sha256:hash(definition)},intrinsic:{path:intrinsics.pin.path,sourceSha256:intrinsics.pin.sha256,span:intrinsicSpan,source:intrinsicSource,sha256:hash(intrinsicSource),operator,modulus:'2^checked-width',signedResult:'two-complement residue in checked signed range'},checkedBody:{kind:'primitive-intrinsic-call',callee:['core','intrinsics',method],parameters:[{name:'self',type:owner},{name:'rhs',type:owner}],ret:owner,operator,width:primitive.bits,signed:primitive.signed},wholeMacroExpansion:false,traitComplete:false,formatterEquivalence:false,runtimeParity:false});
  selections.add(proof);current.proofs.set(key,proof);return proof;
}
export function pinnedFixedWrapping(type,method){return current?selectFixedWrapping(type,method):withFixedWrappingSourceOperation(()=>selectFixedWrapping(type,method));}
export function requireFixedWrappingProof(proof,type,method){
 if(!selections.has(proof))throw new TypeError('Wrapping requires its private original primitive body/intrinsic proof');const fresh=pinnedFixedWrapping(type,method);if(!isDeepStrictEqual(proof,fresh))throw new TypeError('Wrapping requires its private original primitive body/intrinsic proof');return proof;
}
// Reparsed semantic metadata is DATA; independently reissue the complete source.
export function requireFixedWrappingMetadata(value,type,method){
 const supplied=copyMetadata(value),fresh=pinnedFixedWrapping(type,method);if(!isDeepStrictEqual(supplied,copyMetadata(fresh)))throw new TypeError('Wrapping metadata differs from its fresh original primitive body/intrinsic proof');return fresh;
}

import {types,isDeepStrictEqual} from 'node:util';
import {copyMetadata} from './source-links.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
