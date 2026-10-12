// Specialize the original generic reflexive From body, never a type-value table.
import {types as nodeTypes} from 'node:util';
import {HostRustParser,HostChecker} from './host-contracts.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {tokenizeRust} from './lexical.mjs';
import {metadataDigest,copyMetadata} from './source-links.mjs';
import {primitiveFromPinnedSource,primitiveFromNamespace} from './primitive-from-source.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text),same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const selected=new WeakSet(),parsed=new WeakMap(),issued=new Map(),cache=new Map();let original,sized;
function scalar(type){
  if(!type||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw new TypeError('Identity From requires an actual by-value fixed primitive or bool');
  if(type.kind==='bool'&&(type.rustPrimitiveName===undefined||type.rustPrimitiveName==='bool'))return {kind:'bool',rustPrimitiveName:'bool'};
  const actual=rustFixedType(type.rustPrimitiveName);
  if(type.kind!=='fixed'||!actual||!/^([iu])(8|16|32|64|128)$/u.test(type.rustPrimitiveName)||actual.bits!==type.bits||actual.signed!==type.signed)throw new TypeError('Identity From requires an actual by-value fixed primitive or bool');
  return {...actual,rustPrimitiveName:type.rustPrimitiveName};
}
// Structural inspection is intentionally not a private selection issuer.
export function inspectPrimitiveIdentityFromSource(source){
  if(typeof source!=='string'||Buffer.byteLength(source)>128000)throw new TypeError('Identity From original source budget');
  const rootTokens=rustTokens(source).filter(token=>token.type!=='comment'),firstUse=rootTokens.findIndex(token=>token.text==='use'),moduleAttrs=rootTokens.slice(0,firstUse);
  if(firstUse<0||!same(words(moduleAttrs),['#','!','[','stable','(','feature','=','"rust1"',',','since','=','"1.0.0"',')',']']))throw new TypeError('Identity From original enclosing module attributes or conditions differ');
  const owners=sourceItems(source).filter(item=>item.term==='impl'&&words(item.tokens).join('|').includes('From|<|T|>|for|T'));
  if(owners.length!==1)throw new TypeError('Identity From requires one actual generic impl');
  const owner=owners[0],tokens=owner.tokens.filter(t=>t.type!=='comment'),begin=tokens.findIndex(t=>t.text==='impl'),open=tokens.findIndex((t,i)=>i>begin&&t.text==='{');
  if(!same(words(tokens.slice(0,begin)),['#','[','stable','(','feature','=','"rust1"',',','since','=','"1.0.0"',')',']'])||!same(words(tokens.slice(begin,open)),['impl','<','T','>','From','<','T','>','for','T']))throw new TypeError('Identity From original attributes, generic binder or source conditions differ');
  const bodyOffset=tokens[open].end,members=sourceItems(source.slice(bodyOffset,tokens.at(-1).start));
  if(members.length!==1||members[0].term!=='fn'||members[0].name!=='from')throw new TypeError('Identity From requires its sole actual original member');
  const member=members[0],mt=member.tokens.filter(t=>t.type!=='comment'),fn=mt.findIndex(t=>t.text==='fn');
  if(!same(words(mt.slice(0,fn)),['#','[','inline','(','always',')',']'])||!same(words(mt.slice(fn)),['fn','from','(','t',':','T',')','->','T','{','t','}']))throw new TypeError('Identity From original non-const member body or attributes differ');
  return freeze({sourceCoordinateUnit:'utf16',originalSourceSha256:hash(source),moduleAttributes:{originalSpan:{start:moduleAttrs[0].start,end:moduleAttrs.at(-1).end},originalSource:source.slice(moduleAttrs[0].start,moduleAttrs.at(-1).end)},implOriginalSpan:{start:owner.start,end:owner.end},implOriginalSource:source.slice(owner.start,owner.end),memberOriginalSpan:{start:bodyOffset+member.start,end:bodyOffset+member.end},memberOriginalSource:source.slice(bodyOffset+member.start,bodyOffset+member.end),parsedMemberSource:source.slice(bodyOffset+mt[fn].start,bodyOffset+mt.at(-1).end),genericBinder:'T',selfBinder:'T',implicitSized:true,sourceAuthority:false});
}
function sizedAssumption(){
  if(sized)return sized;
  const path='../source-profiles/copy-standard/rust-marker-1.89.0.rs.gz',encoded=readFileSync(new URL(path,import.meta.url)),raw=gunzipSync(encoded,{maxOutputLength:128000});
  if(encoded.length!==15026||hash(encoded)!=='6ae1b7b6a432b0ef19a5502cacd88181261f32fda6fed1a9db9c197fbfc5d821'||raw.length!==53066||hash(raw)!=='db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809')throw new TypeError('Original Sized source pin differs');
  const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),owners=sourceItems(source).filter(item=>item.term==='trait'&&item.name==='Sized');
  if(owners.length!==1)throw new TypeError('Original Sized owner is ambiguous');const owner=owners[0],wt=words(owner.tokens),pub=wt.indexOf('pub');
  if(!same(wt.slice(pub),['pub','trait','Sized',':','MetaSized','{','}'])||!wt.join('|').includes('#|[|lang|=|"sized"|]')||!wt.join('|').includes('#|[|rustc_deny_explicit_impl|]'))throw new TypeError('Original compiler Sized contract differs');
  return sized=freeze({sourcePath:'library/core/src/marker.rs',sourceCoordinateUnit:'utf16',sourceSha256:hash(raw),originalSpan:{start:owner.start,end:owner.end},originalDeclaration:source.slice(owner.start,owner.end),langItem:'sized',explicitImplDenied:true,implicitGenericBound:true,compilerProvidedPrimitiveSizedAssumed:true,sizedTraitImplementationTranslated:false,wholeCoreAuthority:false});
}
export function pinnedPrimitiveIdentityFrom(type){
  const actual=scalar(type),key=actual.rustPrimitiveName;if(cache.has(key))return cache.get(key);
  const source=primitiveFromPinnedSource('library/core/src/convert/mod.rs');original??=inspectPrimitiveIdentityFromSource(source.source);
  const namespace=primitiveFromNamespace(),traits=sourceItems(source.source).filter(item=>item.term==='trait'&&item.name==='From');
  const tw=words(traits[0]?.tokens??[]),at=tw.indexOf('pub');if(traits.length!==1||!same(tw.slice(at,at+9),['pub','trait','From','<','T','>',':','Sized','{']))throw new TypeError('Original From trait needs its actual Sized bound');
  const selection=freeze({schema:'original-generic-primitive-identity-from-v1',rust:'1.89.0',type:actual,input:actual,target:actual,namespace,sourcePath:source.path,original,sized:sizedAssumption(),bindings:{T:actual,Self:actual,identity:'actual original single T generic binder'},constTraitCall:false,wholeTraitAuthority:false,runtimeParity:false});selected.add(selection);cache.set(key,selection);return selection;
}
export function parsePrimitiveIdentityFromBody(Parser,checker,selection){
  if(!selected.has(selection)||Parser!==HostRustParser||!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype||Object.hasOwn(checker,'expr'))throw new TypeError('Identity From body requires private original selection and actual checker');
  class BoundTParser extends Parser{hostTypeSyntax(){if(this.cursor.is('T')||this.cursor.is('Self')){this.cursor.next();return {...selection.type};}return super.hostTypeSyntax();}}
  const parser=new BoundTParser(tokenizeRust(selection.original.parsedMemberSource)),entry=parser.fn(['core','convert']);
  if(!parser.cursor.atEnd()||entry.constFunction||entry.params.length!==1||entry.params[0].name!=='t'||metadataDigest(scalar(entry.params[0].type))!==metadataDigest(selection.type)||metadataDigest(scalar(entry.ret))!==metadataDigest(selection.type)||entry.body.k!=='name'||!same(entry.body.path,['t']))throw new TypeError('Identity From parsed member differs from its actual bound T');
  const body=HostChecker.prototype.expr.call(checker,entry.body,new Map([['t',selection.type]]),[],selection.type);
  if(body.k!=='var'||body.name!=='t'||metadataDigest(scalar(body.type))!==metadataDigest(selection.type))throw new TypeError('Identity From checked body differs from its actual parameter');
  const evidence={selection,parsedMemberSha256:metadataDigest(entry),checkedBodySha256:metadataDigest(body),operation:'primitive-source-identity',constTraitCall:false},proof=freeze({...evidence,digest:metadataDigest(evidence)});
  parsed.set(proof,{entry,body,entryDigest:metadataDigest(entry),bodyDigest:metadataDigest(body)});issued.set(proof.digest,proof);return proof;
}
export function requirePrimitiveIdentityFromBody(proof,type){const state=parsed.get(proof);if(!state||state.entryDigest!==metadataDigest(state.entry)||state.bodyDigest!==metadataDigest(state.body)||proof.selection!==pinnedPrimitiveIdentityFrom(type))throw new TypeError('Identity From requires private unmodified parsed original body');return proof;}
// Relocated common meta must replay an actual privately checked original body.
export function requirePrimitiveIdentityFromEvidence(proof,type){let snapshot;try{snapshot=copyMetadata(proof);}catch{throw new TypeError('Identity From requires issued common source evidence');}const original=snapshot&&issued.get(snapshot.digest);if(!original||metadataDigest(snapshot)!==metadataDigest(original)||metadataDigest(original.selection.type)!==metadataDigest(scalar(type)))throw new TypeError('Identity From common source evidence differs from private checked body');return original;}
