// Exact original trait/macro bodies and private original caller namespace facts.
// This supplies a bounded primitive conversion, never a public closed-scope flag.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {matchesParserFacts} from '../matches-macro-context.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput} from '../declarative-token-macros.mjs';
import {originalTopLevelMacroInvocations,originalMacroTreeText} from '../macro-token-trees.mjs';
import {tokenizeRust} from './lexical.mjs';
import {rustFixedType,fixedBounds} from '../checked-types.mjs';
import {metadataDigest,copyMetadata} from './source-links.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const root=new URL('../source-profiles/primitive-bool-from/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root));
if(hash(manifestBytes)!=='27251e2c43b8a4cad6b127ab526749cee245cb6613cfbc2e87e30044a80803f5')throw new TypeError('Boolean From source profile differs from its original pins');
const manifest=JSON.parse(manifestBytes),selections=new WeakSet(),bodies=new WeakMap(),scopeProofs=new Map(),cache=new Map();let files,definition,invocations,prelude;
const significant=tokens=>tokens.filter(token=>token.type!=='comment'),texts=tokens=>significant(tokens).map(token=>token.text),same=(a,b)=>a.length===b.length&&a.every((part,index)=>part===b[index]);
function sources(){
  if(files)return files;files=new Map();for(const pin of manifest.sources){const encoded=readFileSync(new URL(pin.file,root)),raw=gunzipSync(encoded,{maxOutputLength:128000});if(encoded.length!==pin.compressedBytes||hash(encoded)!==pin.compressedSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==pin.gitBlobSha)throw new TypeError('Original Boolean From source/namespace input differs');files.set(pin.path,{...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});}return files;
}
export const PRIMITIVE_BOOL_FROM_PROFILE=freeze({rust:manifest.rust,schema:manifest.schema,manifestSha256:hash(manifestBytes),sources:manifest.sources,constTraitCall:false,wholeTraitAuthority:false,wholeCoreTranslated:false,formatterEquivalence:false,runtimeParity:false});
function standardPrelude(){
  if(prelude)return prelude;const input=sources(),trait=input.get('library/core/src/convert/mod.rs'),traits=sourceItems(trait.source).filter(item=>item.term==='trait'&&item.name==='From');if(traits.length!==1)throw new TypeError('Original From trait owner is absent or ambiguous');
  const words=texts(traits[0].tokens),fn=words.indexOf('fn');if(!same(words.slice(fn,fn+11),['fn','from','(','value',':','T',')','->','Self',';','}'])||words[fn-1]==='const')throw new TypeError('Original From requires its non-const by-value trait member');
  const num=input.get('library/core/src/convert/num.rs'),numWords=texts(rustTokens(num.source));if(!numWords.join('').includes('usesuper::{From,TryFrom};')||!texts(rustTokens(trait.source)).join('').includes('modnum;'))throw new TypeError('Original numeric From impl does not use the actual parent trait');
  const core=input.get('library/core/src/prelude/v1.rs'),std=input.get('library/std/src/prelude/v1.rs');for(const original of [core,std])if(!texts(rustTokens(original.source)).join('').includes('pubusecrate::convert::{AsMut,AsRef,From,Into};'))throw new TypeError('Original common prelude From reexport differs');
  if(!texts(rustTokens(input.get('library/std/src/lib.rs').source)).join('').includes('pubusecore::convert;'))throw new TypeError('Original std From does not share the core trait');
  const editions=[];for(const family of ['core','std']){
    const original=input.get('library/'+family+'/src/prelude/mod.rs');for(const edition of ['2015','2018','2021','2024']){const modules=sourceItems(original.source).filter(item=>item.term==='mod'&&item.name==='rust_'+edition);if(modules.length!==1||!texts(modules[0].tokens).join('').includes('pubusesuper::v1::*;'))throw new TypeError('Original common From prelude needs every supported edition route');editions.push({family,edition,sourceSha256:original.sha256,originalSpan:{start:modules[0].start,end:modules[0].end}});}
  }
  prelude=freeze({trait:['core','convert','From'],traitSource:trait.path,traitSourceSha256:trait.sha256,originalSpan:{start:traits[0].start,end:traits[0].end},constTraitCall:false,commonPreludeEditions:editions,callerCargoEditionInferred:false,wholeTraitAuthority:false});return prelude;
}
export function pinnedPrimitiveBoolFrom(target){
  const primitive=rustFixedType(target?.rustPrimitiveName);if(target?.kind!=='fixed'||!primitive||primitive.bits!==target.bits||primitive.signed!==target.signed)throw new TypeError('Boolean From target needs its actual checked primitive identity');
  const key=target.rustPrimitiveName;if(cache.has(key))return cache.get(key);const namespace=standardPrelude(),input=sources().get('library/core/src/convert/num.rs');
  definition??=compileDeclarativeMacro(input.source,{name:'impl_from',owner:['core','convert','num']});invocations??=originalTopLevelMacroInvocations(input.source);
  const calls=invocations.filter(call=>call.path.join('::')==='impl_from'&&same(call.trees.map(tree=>tree.kind==='token'?tree.text:null),['bool','=>',key]));if(calls.length!==1||calls[0].sourceFileSha256!==input.sha256)throw new TypeError('Boolean From target has no original checked macro invocation');
  const first=expandDeclarativeMacro(definition,calls[0].trees);if(first.trees[0]?.text!=='impl_from'||first.trees[1]?.text!=='!'||first.trees[2]?.kind!=='group')throw new TypeError('Original bool From rule forwarding differs');
  const second=expandDeclarativeMacro(definition,declarativeSubInput(first,[2])),expandedSource=second.trees.map(originalMacroTreeText).join(' '),owners=sourceItems(expandedSource).filter(item=>item.term==='impl');
  if(owners.length!==1)throw new TypeError('Original bool From expansion requires one impl');const owner=owners[0],ot=significant(owner.tokens),begin=ot.findIndex(token=>token.text==='impl'),open=ot.findIndex((token,index)=>index>begin&&token.text==='{');if(!same(ot.slice(begin,open).map(token=>token.text),['impl','From','<','bool','>','for',key]))throw new TypeError('Original bool From expanded trait/primitive owner differs');
  const bodyOffset=ot[open].end,members=sourceItems(expandedSource.slice(bodyOffset,ot.at(-1).start)).filter(item=>item.term==='fn'&&item.name==='from');if(members.length!==1)throw new TypeError('Original bool From member is absent or ambiguous');const mt=significant(members[0].tokens),fn=mt.findIndex(token=>token.text==='fn'),method=mt.slice(fn),signature=method.slice(0,11).map(token=>token.text);if(!same(signature,['fn','from','(','small',':','bool',')','->','Self','{','small'])||mt[fn-1]?.text==='const')throw new TypeError('Original bool From member requires its actual non-const bool/Self signature');
  const source=expandedSource.slice(bodyOffset+mt[fn].start,bodyOffset+mt.at(-1).end),value=freeze({schema:'original-macro-expanded-primitive-bool-from-v1',profileSha256:hash(manifestBytes),rust:manifest.rust,target:{...primitive,rustPrimitiveName:key},namespace,originalSourceSha256:input.sha256,definitionDigest:definition.digest,definitionOriginalSpan:definition.definitionSpan,invocationOriginalSpan:calls[0].sourceSpan,firstExpansionDigest:first.digest,expansionDigest:second.digest,expandedSourceSha256:hash(expandedSource),member:{source,sha256:hash(source),signature,owner:['core','convert','From','bool',key],constTraitCall:false},wholeMacroAuthority:false,wholeTraitAuthority:false,runtimeParity:false});selections.add(value);cache.set(key,value);return value;
}
// Parse the actual expanded member. Self is its genuine original impl binding,
// rather than a target source rewrite or a caller-selected type substitution.
export function parsePrimitiveBoolFromBody(Parser,selection){
  if(!selections.has(selection)||typeof Parser!=='function')throw new TypeError('Boolean From body parsing requires private original selection');const target=selection.target;
  class BoundSelfParser extends Parser{hostTypeSyntax(){if(this.cursor.is('Self')){this.cursor.next();return {...target};}return super.hostTypeSyntax();}}
  const parser=new BoundSelfParser(tokenizeRust(selection.member.source)),entry=parser.fn(['core','convert',target.rustPrimitiveName]);if(!parser.cursor.atEnd()||entry.constFunction||entry.params.length!==1||entry.params[0].name!=='small'||entry.params[0].type.kind!=='bool'||entry.params[0].type.rustReference||entry.ret.rustPrimitiveName!==target.rustPrimitiveName)throw new TypeError('Original bool From parsed signature is not its selected source signature');
  const body=entry.body;if(body.k!=='cast'||body.arg.k!=='name'||!same(body.arg.path,['small'])||body.to.rustPrimitiveName!==target.rustPrimitiveName||body.to.bits!==target.bits||body.to.signed!==target.signed)throw new TypeError('Original bool From body requires a separately checked primitive cast');
  const proof=freeze({selection,parsedMemberSha256:metadataDigest(entry),checkedOperation:{kind:'primitive-bool-to-fixed',target:{...target},input:'actual by-value bool',falseResidue:'0',trueResidue:'1'},constTraitCall:false});bodies.set(proof,{entry,digest:metadataDigest(entry)});return proof;
}
export function requirePrimitiveBoolFromBody(proof,target){const state=bodies.get(proof);if(!state||state.digest!==metadataDigest(state.entry)||proof.selection!==pinnedPrimitiveBoolFrom(target)||proof.checkedOperation.target.rustPrimitiveName!==target.rustPrimitiveName)throw new TypeError('Boolean From requires its private unmodified original parsed body');const bounds=fixedBounds(target);if(bounds.min>0n||bounds.max<1n)throw new TypeError('Boolean residues are not infallible in the checked target');return proof;}
const fail=message=>{throw new TypeError('Primitive bool From namespace: '+message);};
export function capturePrimitiveBoolFromScope(parser,target,start){
  const state=matchesParserFacts(parser),facts=state.facts,consumer=state.module,scope=facts.evidence.scopes.find(scope=>scope.file===consumer.file&&same(scope.path,consumer.path)),ancestors=facts.evidence.scopes.filter(parent=>parent.path.every((name,index)=>consumer.path[index]===name));
  if(!scope||ancestors.some(parent=>parent.configurationCondition!=='active'||parent.unresolvedTypeScope!==false||parent.unresolvedBangMacroScope!==false||parent.unresolvedAttributeMacroScope!==false))fail('original active type/bang/attribute scopes are unproved');
  if(!Number.isSafeInteger(start)||start<0||start>=state.sourceLength||!state.tokens.some(token=>token.start===start&&token.kind==='identifier'))fail('call point escapes its original source tokens');
  const enclosing=originalSourceModuleItems(consumer).filter(item=>item.start<=state.offset+start&&item.end>state.offset+start);
  for(const item of enclosing){
    const tokens=significant(item.tokens),body=tokens.findIndex(token=>token.text==='{');if(body<0)continue;const local=tokens.slice(body+1);
    if(local.some((token,index)=>['use','extern','trait','impl','type','mod','macro','macro_rules!'].includes(token.text)||token.text.length>1&&token.text.endsWith('!')||token.text==='!'&&local[index-1]?.type==='ident'&&local[index+1]&&['(','[','{'].includes(local[index+1].text)))fail('function-local declarations/imports/macros require their original lexical trait resolution');
  }
  if(parser.builtinShadow(target.rustPrimitiveName,consumer.path)||!same(parser.resolveSourceNamespace([target.rustPrimitiveName],consumer.path,'type'),[target.rustPrimitiveName]))fail('actual primitive target is shadowed or unresolved');
  for(const module of facts.modules.filter(module=>module.path.every((name,index)=>consumer.path[index]===name))){
    const inner=originalSourceModuleItems(module).filter(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!').flatMap(item=>significant(item.tokens));
    const outer=module.sourceView.declaration?significant(rustTokens(module.source.slice(module.sourceView.declaration.span.start,module.sourceView.bodySpan.start))):[];
    if([...inner,...outer].some((token,index,tokens)=>['no_implicit_prelude','no_core'].includes(token.text)&&tokens[index-1]?.text==='['))fail('disabled implicit/core prelude requires an explicit proven trait route');
  }
  const traits=[];
  for(const binding of scope.bindings.filter(binding=>binding.namespace==='type')){
    if(binding.name==='From'||['std','core'].includes(binding.name))fail('trait or standard source namespace is shadowed/imported without this proof');
    if(binding.status!=='resolved')fail('visible type/trait alias is ambiguous or unresolved');if(binding.kind!=='trait')continue;
    const declaration=binding.declaration;if(!declaration||binding.target?.[0]!=='crate')fail('visible imported trait has no original source method proof');
    const owners=facts.modules.flatMap(module=>module.file===declaration.source?originalSourceModuleItems(module).filter(item=>item.term==='trait'&&item.start===declaration.span.start&&item.end===declaration.span.end).map(item=>({module,item})):[]);if(owners.length!==1)fail('visible trait declaration has no unique original owner');
    const {module,item}=owners[0],tokens=significant(item.tokens),open=tokens.findIndex(token=>token.text==='{'),header=tokens.slice(0,open);if(open<0||header.some(token=>token.text===':')||tokens.some(token=>token.text.endsWith('!')))fail('visible macro/supertrait methods remain unproved');
    if(tokens.some((token,index)=>token.text==='fn'&&tokens[index+1]?.text==='from'))fail('alternative visible trait declares from');traits.push({name:binding.name,target:binding.target,source:module.file,sourceSha256:hash(module.source),originalSpan:{start:item.start,end:item.end},fromMemberAbsent:true});
  }
  const body=pinnedPrimitiveBoolFrom(target),issued={schema:'original-private-primitive-bool-from-scope-v1',target:body.target,trait:body.namespace.trait,source:consumer.file,module:[...consumer.path],sourceSha256:hash(consumer.source),sourceViewDigest:consumer.sourceView.digest,originalSpan:{start:state.offset+start,end:state.offset+start},visibleOriginalTraits:traits,commonPreludeProfileSha256:hash(manifestBytes),callerCargoEditionInferred:false,wholeTraitAuthority:false,runtimeParity:false},digest=metadataDigest(issued),proof=freeze({...issued,digest});scopeProofs.set(digest,proof);return proof;
}
// The source witness may be serialized/relocated with ordinary checked IR;
// identical fields must replay an actually issued private original source proof.
export function requirePrimitiveBoolFromScope(proof,target){let snapshot;try{snapshot=copyMetadata(proof);}catch{throw new TypeError('Boolean From caller has no issued original trait/primitive scope proof');}const original=snapshot&&scopeProofs.get(snapshot.digest);if(!original||metadataDigest(Object.fromEntries(Object.entries(snapshot).filter(([name])=>name!=='digest')))!==snapshot.digest||snapshot.digest!==original.digest||snapshot.target.rustPrimitiveName!==target.rustPrimitiveName||snapshot.target.bits!==target.bits||snapshot.target.signed!==target.signed)throw new TypeError('Boolean From caller has no issued original trait/primitive scope proof');return original;}
