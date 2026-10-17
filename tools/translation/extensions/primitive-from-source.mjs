// Generic actual primitive From macro selection/body proof. Numeric widths or
// method names never substitute for an original invocation and parsed member.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput} from '../declarative-token-macros.mjs';
import {originalTopLevelMacroInvocations,originalMacroTreeText} from '../macro-token-trees.mjs';
import {tokenizeRust} from './lexical.mjs';
import {rustFixedType,fixedBounds} from '../checked-types.mjs';
import {metadataDigest} from './source-links.mjs';
import {ORIGINAL_CORE_PRELUDE_ROOT} from './core-prelude-source.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const root=new URL('../source-profiles/primitive-bool-from/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root));
if(hash(manifestBytes)!=='27251e2c43b8a4cad6b127ab526749cee245cb6613cfbc2e87e30044a80803f5')throw new TypeError('Boolean From source profile differs from its original pins');
const manifest=JSON.parse(manifestBytes),selections=new WeakSet(),bodies=new WeakMap(),cache=new Map();let files,definition,invocations,prelude,fixedCatalog;
const significant=tokens=>tokens.filter(token=>token.type!=='comment'),texts=tokens=>significant(tokens).map(token=>token.text),same=(a,b)=>a.length===b.length&&a.every((part,index)=>part===b[index]);
function sources(){
  if(files)return files;files=new Map();for(const pin of manifest.sources){const encoded=readFileSync(new URL(pin.file,root)),raw=gunzipSync(encoded,{maxOutputLength:128000});if(encoded.length!==pin.compressedBytes||hash(encoded)!==pin.compressedSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==pin.gitBlobSha)throw new TypeError('Original Boolean From source/namespace input differs');files.set(pin.path,{...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});}return files;
}
export const PRIMITIVE_FROM_SOURCE_PROFILE=freeze({rust:manifest.rust,schema:manifest.schema,manifestSha256:hash(manifestBytes),sources:manifest.sources,constTraitCall:false,wholeTraitAuthority:false,wholeCoreTranslated:false,formatterEquivalence:false,runtimeParity:false});
function standardPrelude(){
  if(prelude)return prelude;const input=sources(),trait=input.get('library/core/src/convert/mod.rs'),traits=sourceItems(trait.source).filter(item=>item.term==='trait'&&item.name==='From');if(traits.length!==1)throw new TypeError('Original From trait owner is absent or ambiguous');
  const words=texts(traits[0].tokens),fn=words.indexOf('fn');if(!same(words.slice(fn,fn+11),['fn','from','(','value',':','T',')','->','Self',';','}'])||words[fn-1]==='const')throw new TypeError('Original From requires its non-const by-value trait member');
  if(!texts(rustTokens(trait.source)).join('').includes('modnum;')||ORIGINAL_CORE_PRELUDE_ROOT.importPath.join('::')!=='core::prelude::rust_2024')throw new TypeError('Original numeric From impl does not have its actual core prelude route');
  const core=input.get('library/core/src/prelude/v1.rs'),std=input.get('library/std/src/prelude/v1.rs');for(const original of [core,std])if(!texts(rustTokens(original.source)).join('').includes('pubusecrate::convert::{AsMut,AsRef,From,Into};'))throw new TypeError('Original common prelude From reexport differs');
  if(!texts(rustTokens(input.get('library/std/src/lib.rs').source)).join('').includes('pubusecore::convert;'))throw new TypeError('Original std From does not share the core trait');
  const editions=[];for(const family of ['core','std']){
    const original=input.get('library/'+family+'/src/prelude/mod.rs');for(const edition of ['2015','2018','2021','2024']){const modules=sourceItems(original.source).filter(item=>item.term==='mod'&&item.name==='rust_'+edition);if(modules.length!==1||!texts(modules[0].tokens).join('').includes('pubusesuper::v1::*;'))throw new TypeError('Original common From prelude needs every supported edition route');editions.push({family,edition,sourceSha256:original.sha256,originalSpan:{start:modules[0].start,end:modules[0].end}});}
  }
  prelude=freeze({trait:['core','convert','From'],traitSource:trait.path,traitSourceSha256:trait.sha256,originalSpan:{start:traits[0].start,end:traits[0].end},coreCratePrelude:ORIGINAL_CORE_PRELUDE_ROOT,constTraitCall:false,commonPreludeEditions:editions,callerCargoEditionInferred:false,wholeTraitAuthority:false});return prelude;
}
function primitive(type,{input=false}={}){
  if(input&&type?.kind==='bool'&&(type.rustPrimitiveName===undefined||type.rustPrimitiveName==='bool')&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved)return {kind:'bool'};
  const actual=rustFixedType(type?.rustPrimitiveName);
  if(type?.kind!=='fixed'||!actual||actual.bits!==type.bits||actual.signed!==type.signed||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw new TypeError('From needs an actual checked primitive identity');
  return {...actual,rustPrimitiveName:type.rustPrimitiveName};
}
const fixedName=name=>/^[iu](8|16|32|64|128)$/u.test(name);
function originalCalls(){
  const source=sources().get('library/core/src/convert/num.rs');
  definition??=compileDeclarativeMacro(source.source,{name:'impl_from',owner:['core','convert','num']});
  invocations??=originalTopLevelMacroInvocations(source.source);return {source,calls:invocations};
}
export function originalFixedFromInvocations(){
  if(fixedCatalog)return fixedCatalog;const {source,calls}=originalCalls();
  return fixedCatalog=freeze(calls.filter(call=>call.path.join('::')==='impl_from'&&call.trees[1]?.text==='=>'&&fixedName(call.trees[0]?.text)&&fixedName(call.trees[2]?.text)&&call.trees[0].text!==call.trees[2].text).map(call=>({input:call.trees[0].text,target:call.trees[2].text,originalSourceSha256:source.sha256,originalInvocationSha256:call.sourceSha256,originalSpan:call.sourceSpan,originalInvocation:source.source.slice(call.sourceSpan.start,call.sourceSpan.end)})));
}
export function pinnedPrimitiveFrom(inputType,targetType){
  const input=primitive(inputType,{input:true}),target=primitive(targetType),small=input.kind==='bool'?'bool':input.rustPrimitiveName,large=target.rustPrimitiveName;
  if(input.kind!=='bool'&&(!fixedName(small)||!fixedName(large)||small===large))throw new TypeError('Primitive fixed From stage excludes pointer and generic identity implementations');
  const key=small+' => '+large;if(cache.has(key))return cache.get(key);
  const namespace=standardPrelude(),{source,calls}=originalCalls(),selected=calls.filter(call=>call.path.join('::')==='impl_from'&&same(call.trees.slice(0,3).map(tree=>tree.kind==='token'?tree.text:null),[small,'=>',large]));
  if(selected.length!==1||selected[0].sourceFileSha256!==source.sha256)throw new TypeError('From has no original checked primitive macro invocation');
  // Expand the COMPLETE actual invocation, including original #[stable] trees.
  // Follow only a forwarding invocation genuinely emitted by that expansion.
  let expansion=expandDeclarativeMacro(definition,selected[0].trees);const lineage=[expansion.digest];
  while(expansion.trees[0]?.text==='impl_from'&&expansion.trees[1]?.text==='!'){
    if(lineage.length>=4||expansion.trees[2]?.kind!=='group'||expansion.trees.length>4||expansion.trees.length===4&&expansion.trees[3]?.text!==';')throw new TypeError('Original primitive From forwarding is not its bounded complete invocation');
    expansion=expandDeclarativeMacro(definition,declarativeSubInput(expansion,[2]));lineage.push(expansion.digest);
  }
  const expandedSource=expansion.trees.map(originalMacroTreeText).join(' '),owners=sourceItems(expandedSource).filter(item=>item.term==='impl');
  if(owners.length!==1)throw new TypeError('Original From expansion requires one impl');
  const owner=owners[0],ot=significant(owner.tokens),begin=ot.findIndex(token=>token.text==='impl'),open=ot.findIndex((token,index)=>index>begin&&token.text==='{');
  if(!same(ot.slice(begin,open).map(token=>token.text),['impl','From','<',small,'>','for',large]))throw new TypeError('Original expanded trait/primitive From owner differs');
  const bodyOffset=ot[open].end,members=sourceItems(expandedSource.slice(bodyOffset,ot.at(-1).start)).filter(item=>item.term==='fn'&&item.name==='from');
  if(members.length!==1)throw new TypeError('Original From member is absent or ambiguous');
  const mt=significant(members[0].tokens),fn=mt.findIndex(token=>token.text==='fn'),signature=mt.slice(fn,fn+11).map(token=>token.text);
  if(!same(signature,['fn','from','(','small',':',small,')','->','Self','{','small'])||mt[fn-1]?.text==='const')throw new TypeError('Original From needs its actual non-const by-value signature');
  const member=expandedSource.slice(bodyOffset+mt[fn].start,bodyOffset+mt.at(-1).end);
  const selection=freeze({schema:input.kind==='bool'?'original-macro-expanded-primitive-bool-from-v1':'original-macro-expanded-primitive-fixed-from-v1',profileSha256:hash(manifestBytes),rust:manifest.rust,input,target,namespace,originalSourceSha256:source.sha256,definitionDigest:definition.digest,definitionOriginalSpan:definition.definitionSpan,invocationOriginalSpan:selected[0].sourceSpan,originalInvocation:source.source.slice(selected[0].sourceSpan.start,selected[0].sourceSpan.end),originalInvocationSha256:selected[0].sourceSha256,firstExpansionDigest:lineage[0],expansionDigest:expansion.digest,forwardingLineage:lineage,expandedSourceSha256:hash(expandedSource),member:{source:member,sha256:hash(member),signature,owner:['core','convert','From',small,large],constTraitCall:false},wholeMacroAuthority:false,wholeTraitAuthority:false,runtimeParity:false});
  selections.add(selection);cache.set(key,selection);return selection;
}
function samePrimitive(actual,expected){return actual?.kind===expected.kind&&!actual.rustReference&&!actual.rustOwnership&&!actual.patternOwnershipRefusal&&!actual.rustGenericIdentityUnresolved&&(expected.kind==='bool'||actual.rustPrimitiveName===expected.rustPrimitiveName&&actual.bits===expected.bits&&actual.signed===expected.signed);}
export function parsePrimitiveFromBody(Parser,selection){
  if(!selections.has(selection)||typeof Parser!=='function')throw new TypeError('From body parsing requires private original selection');
  class BoundSelfParser extends Parser{hostTypeSyntax(){if(this.cursor.is('Self')){this.cursor.next();return {...selection.target};}return super.hostTypeSyntax();}}
  const parser=new BoundSelfParser(tokenizeRust(selection.member.source)),entry=parser.fn(['core','convert',selection.target.rustPrimitiveName]);
  if(!parser.cursor.atEnd()||entry.constFunction||entry.params.length!==1||entry.params[0].name!=='small'||!samePrimitive(entry.params[0].type,selection.input)||!samePrimitive(entry.ret,selection.target))throw new TypeError('Original From parsed signature differs from its original source binding');
  const body=entry.body;if(body.k!=='cast'||body.arg.k!=='name'||!same(body.arg.path,['small'])||!samePrimitive(body.to,selection.target))throw new TypeError('Original From body needs its separately parsed primitive cast');
  const inputBounds=selection.input.kind==='bool'?{min:0n,max:1n}:fixedBounds(selection.input),targetBounds=fixedBounds(selection.target);
  if(inputBounds.min<targetBounds.min||inputBounds.max>targetBounds.max)throw new TypeError('Original From cast is not infallible across its actual primitive domains');
  const decimalBounds=bounds=>({min:bounds.min.toString(),max:bounds.max.toString()});
  const checkedOperation=selection.input.kind==='bool'?{kind:'primitive-bool-to-fixed',target:selection.target,input:'actual by-value bool',falseResidue:'0',trueResidue:'1'}:{kind:'primitive-fixed-infallible-cast',input:selection.input,target:selection.target,inputBounds:decimalBounds(inputBounds),targetBounds:decimalBounds(targetBounds)};
  const proof=freeze({selection,parsedMemberSha256:metadataDigest(entry),checkedOperation,constTraitCall:false});bodies.set(proof,{entry,digest:metadataDigest(entry)});return proof;
}
export function requirePrimitiveFromBody(proof,input,target){const state=bodies.get(proof);if(!state||state.digest!==metadataDigest(state.entry)||proof.selection!==pinnedPrimitiveFrom(input,target))throw new TypeError('Primitive From needs its private unmodified original parsed body');return proof;}
export function hasSourceFixedFrom(inputName,targetName){
  if(!fixedName(inputName)||!fixedName(targetName)||inputName===targetName)return false;
  return originalFixedFromInvocations().some(call=>call.input===inputName&&call.target===targetName);
}

// Read-only pinned originals; these do not issue body or caller authority.
export const primitiveFromPinnedSource=path=>{const source=sources().get(path);if(!source)throw new TypeError('Unknown pinned primitive From source');return freeze({...source});};
export const primitiveFromNamespace=()=>standardPrelude();
