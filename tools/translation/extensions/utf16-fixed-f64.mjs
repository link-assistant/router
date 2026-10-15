// Source-qualified Rust operations, not equal portable representation guesses.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rustFixedType} from '../checked-types.mjs';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {SOURCE_F64} from './primitive-float-contracts.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './host-contracts.mjs';
import {requireOriginalStandardCall} from './original-standard-calls.mjs';
import {metadataDigest} from './source-links.mjs';
import {originalStringPatternForwarding,requireOriginalStringPatternForwarding} from './string-pattern-forwarding-source.mjs';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const hash=value=>createHash('sha256').update(value).digest('hex');
export const UTF16_FIXED_F64_PROFILE=freeze({id:'rust-1.89-utf16-fixed-f64',rust:'1.89.0',usizeBits:64,constantEvaluation:false,sources:[
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/str/mod.rs',archive:'core-str-mod.rs.gz',bytes:109322,sha256:'c4d2f7564389d6007eb62f287a0efdda865a7133ec0a7d47d66be581794ac416',archiveSha256:'5c41e64ff9a819e50600e8db67f4738c0f5ef805eae3946cfdfa3aa139deb6f0',lines:[1297,1302]},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/str/iter.rs',archive:'core-str-iter.rs.gz',bytes:48918,sha256:'07f8dd0655c57a3da5b620fae00ba06b2957d17d119a870253b762b9e51e7122',archiveSha256:'39ce57a49956bc3ff6edf3008da87050e92a957e4c38f4d59ac182cf720a5665',lines:[1488,1522]},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/char/methods.rs',archive:'core-char-methods.rs.gz',bytes:65246,sha256:'38675f7f88f5b672a2f18b430dbc52d79f82fa25fece40efb352eebb09c0c4e2',archiveSha256:'a05d2938bef6954c4e3e1414d7eeda3741f0ee444143b26b86fd22de1138094a',lines:[1909,1928]},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/alloc/src/string.rs',archive:'alloc-string.rs.gz',bytes:111988,sha256:'46dadb69bbe909b50146366020dc23d4fa88f53b93435b7e0f70c6692d0ba629',archiveSha256:'3f9bb719280924aa34b9f3693879b5a65e45eecc78f4fa8dea84219bf1105523',lines:[2731,2740]},
  {url:'https://doc.rust-lang.org/1.89.0/reference/expressions/operator-expr.html',archive:'operator-expr.html.gz',bytes:134192,sha256:'0ac722aa0d87f1cac633fc4c931a9a734e04f5d72a55ed6e91ede80ddef132df',archiveSha256:'b9d411dfb878662542c21b2995656f72673cb89ea286d07fdf56246b9425186f',anchor:'expr.as.numeric.int-as-float'},
]});
for(const source of UTF16_FIXED_F64_PROFILE.sources) {
  const archive=readFileSync(new URL('../source-profiles/utf16-fixed-f64/'+source.archive,import.meta.url));
  if(hash(archive)!==source.archiveSha256)throw new TypeError('Rust UTF16/cast archive checksum mismatch');
  const bytes=gunzipSync(archive,{maxOutputLength:150000});
  if(bytes.length!==source.bytes||hash(bytes)!==source.sha256)throw new TypeError('Rust UTF16/cast source checksum mismatch');
}
export function checkedUtf16Iterator(object,range) {
  const type=object.type,owner=type.rustOwnership;
  if(type.kind!=='string'||!type.rustSourceType||type.rustReference||type.rustGenericIdentityUnresolved||!owner||!(owner.kind==='borrowed'&&owner.source==='str'||owner.kind==='owned'&&owner.source==='String'))throw unsupported('str::encode_utf16','requires actual source str or standard owned String; custom/shared/unknown receivers have no implicit Deref profile',range);
  return {k:'routerUtf16Iterator',object,type:{kind:'routerIterator',element:{...rustFixedType('u16'),rustPrimitiveName:'u16',rustSourceType:true}},constEligible:false,utf16Proof:{profile:UTF16_FIXED_F64_PROFILE.id,verified:true,sourceOwner:structuredClone(type),span:range},span:range};
}
export function checkedFixedF64Cast(object,target,range) {
  const type=object.type,source=rustFixedType(type.rustPrimitiveName);
  if(type.kind!=='fixed'||!source||source.bits!==type.bits||source.signed!==type.signed||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved)throw unsupported('fixed primitive as f64','requires the actual checked by-value primitive integer source and domain',range);
  if(target.kind!=='float'||target.rustPrimitiveName!=='f64'||target.rustReference||target.rustOwnership||target.patternOwnershipRefusal||target.rustGenericIdentityUnresolved)throw unsupported('fixed primitive float cast target','only the actual source f64 primitive is registered',range);
  return {k:'routerFixedF64Cast',object,type:SOURCE_F64,sourceType:structuredClone(type),constEligible:false,fixedFloatCastProof:{profile:UTF16_FIXED_F64_PROFILE.id,verified:true,rounding:'roundTiesToEven',source: type.rustPrimitiveName,span:range},span:range};
}
const callBorrows=new WeakMap(),patternFrames=new WeakMap();
const patternExits=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(patternExits):patternExits(value))));
export function prepareTemporaryStringCall(checker,entry,args,env,path,range) {
  if(entry?.k!=='fn'||!entry.body||entry.async||!['fixed','bool','float','unit'].includes(entry.ret?.kind)||entry.ret.rustReference||entry.ret.rustOwnership||entry.ret.patternOwnershipRefusal||entry.ret.rustGenericIdentityUnresolved)throw unsupported('temporary String call borrow','requires an actual resolved scalar-returning source function; no borrow may escape',range);
  if(args.length!==entry.params.length)throw typeError('temporary String borrow needs the complete checked function signature',range);
  return args.map((arg,index)=>{
    if(arg.k!=='routerTextReference'||!arg.sourceAmpersand)return arg;
    const target=entry.params[index].type,owner=target.rustOwnership;
    if(target.kind!=='string'||!target.rustSourceType||target.rustReference||owner?.kind!=='borrowed'||owner.source!=='str'||target.rustBorrowLifetime?.kind!=='elided')throw unsupported('temporary String call parameter','requires the actual ordinary &str parameter, never static or unknown lifetime',arg.span);
    const object=checker.expr(arg.value,env,path),type=object.type;
    if(type.kind!=='string'||!type.rustSourceType||type.rustReference||type.rustGenericIdentityUnresolved||type.rustOwnership?.kind!=='owned'||type.rustOwnership.source!=='String')throw unsupported('temporary String Deref','requires an actual checked standard owned String temporary',arg.span);
    if(arg.sourceAmpersand?.value!=='&'||arg.sourceAmpersand.span?.end-arg.sourceAmpersand.span?.start!==1)throw unsupported('temporary String source borrow','requires the original written single ampersand',arg.span);
    const surface={k:'routerPreparedStringCallBorrow',span:arg.span},checked={k:'routerTemporaryStringCallBorrow',object,type:structuredClone(target),constEligible:false,temporaryStringBorrowProof:{profile:UTF16_FIXED_F64_PROFILE.id,verified:true,callee:entry.fullName,parameter:index,origin:'call-local-temporary',sourceAmpersand:arg.sourceAmpersand,sourceOwner:structuredClone(type),span:arg.span},span:arg.span};
    callBorrows.set(surface,checked);return surface;
  });
}
export function consumeTemporaryStringCallBorrow(node) {
  const frame=patternFrames.get(node);if(frame){requireOriginalPrimitiveTryFromChecker(frame.checker);requireOriginalStandardCall(frame.checker,frame.original);if(metadataDigest(callBorrows.get(node))!==frame.digest)throw unsupported('temporary String Pattern proof','prepared source computation changed',node.span);requireOriginalStringPatternForwarding(frame.proof,frame.original.op);}
  const value=callBorrows.get(node);if(!value)throw unsupported('temporary String call proof','requires this compiler invocation’s checked scalar-call argument',node.span);
  return value;
}

// This exported entry checks the actual Host itself; a supplied checker,
// callback, public type flag or copied prepared surface cannot issue a view.
export function prepareOriginalStringPatternBorrow(checker,node,env,path) {
  requireOriginalPrimitiveTryFromChecker(checker);requireOriginalStandardCall(checker,node);
  const refuse=()=>{throw unsupported('temporary String Pattern borrow','requires the genuine nonescaping standard bool Pattern operation and one actual owned String temporary in a closed source scope',node.span);};
  if(node.k!=='routerTextPattern'||!['contains','starts_with'].includes(node.op)||node.args.length!==1)refuse();
  const scope=node.sourceMethodScope;
  if(!scope||scope.unresolvedTypeScope!==false||scope.unresolvedAttributeMacroScope!==false||scope.unresolvedBangMacroScope!==false||!Array.isArray(scope.bindings)||scope.bindings.some(binding=>binding.namespace!=='value'))refuse();
  const argument=node.args[0],ampersand=argument.sourceAmpersand;
  if(patternExits(node.object)||patternExits(argument))throw unsupported('string method control','nonlocal exits require statement lowering',node.span);
  if(argument.k!=='routerTextReference'||ampersand?.value!=='&'||ampersand.span?.end-ampersand.span?.start!==1||argument.value?.k==='routerTextReference')refuse();
  const proof=originalStringPatternForwarding(node.op),forwarding=requireOriginalStringPatternForwarding(proof,node.op);
  const owned=type=>type?.kind==='string'&&type.rustSourceType===true&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String';
  const receiver=checker.expr(node.object,env,path);if(!owned(receiver.type))refuse();
  const object=checker.expr(argument.value,env,path);if(!owned(object.type))refuse();
  const reference={...structuredClone(object.type),patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(object.type),span:{...argument.span},tokens:[{value:'&',kind:'operator',span:{...ampersand.span}}]}};
  const view={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'},rustBorrowLifetime:{kind:'elided',source:'original-standard-String-RangeFull-Pattern-view',span:{...argument.span}}};
  const checked={k:'routerTemporaryStringCallBorrow',object,type:view,constEligible:false,temporaryStringBorrowProof:{profile:UTF16_FIXED_F64_PROFILE.id,verified:true,callee:'original standard str::'+node.op,parameter:0,origin:'call-local-temporary',sourceAmpersand:ampersand,sourceOwner:structuredClone(object.type),originalReference:reference,forwarding,span:argument.span},span:argument.span};
  const prepare=(value,span)=>{const surface={k:'routerPreparedStringCallBorrow',span};callBorrows.set(surface,value);patternFrames.set(surface,{checker,original:node,proof,digest:metadataDigest(value)});return surface;};
  return {...node,object:prepare(receiver,node.object.span),args:[prepare(checked,argument.span)]};
}
