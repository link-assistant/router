import {copyMetadata} from './source-links.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from './host-contracts.mjs';
import {assertOriginalParserIdentity} from '../original-parser-identity.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './text.mjs';
// Read actual pinned Rust bodies. This module selects source and expands the
// original Default macro; it supplies neither per-method JavaScript templates
// nor authority to resolve a caller's receiver or trait implementation.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sourceItems} from '../rust-structure.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from '../declarative-token-macros.mjs';
import {originalTopLevelMacroInvocations,originalMacroTreeText} from '../macro-token-trees.mjs';
import {tokenizeRust} from './lexical.mjs';
import {originalContainerDefaultBody,assertOriginalContainerDefaultBody} from '../default-container-source.mjs';
import {originalOptionCloneBody,assertOriginalOptionCloneBody} from '../clone-container-source.mjs';
import {originalPrimitiveCloneExpansion,assertOriginalPrimitiveCloneExpansion} from './primitive-clone-source.mjs';
import {originalStringCloneMethod,requireOriginalStringCloneMethod,requireOriginalStringClonePlan} from '../string-clone-source.mjs';
import {originalJsonDefaultBody,assertOriginalJsonDefaultBody} from '../json-default-source.mjs';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';

const root=new URL('../source-profiles/standard-method-bodies/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const sources=new Map(),selections=new WeakMap(),parsed=new WeakMap(),cache=new Map();
for(const input of manifest.sources){
  const encoded=readFileSync(new URL(input.file,root)),raw=gunzipSync(encoded,{maxOutputLength:128000});
  if(encoded.length!==input.compressedBytes||hash(encoded)!==input.compressedSha256||raw.length!==input.bytes||hash(raw)!==input.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==input.gitBlobSha)throw new Error('standard body source differs from its complete pinned original');
  sources.set(input.rustPath,{source:raw.toString('utf8'),input});
}
export const STANDARD_BODY_SOURCE_PROFILE=freeze({id:manifest.profile,rust:manifest.rust,sourceInputs:manifest.sources.map(({url,sha256})=>({url,sha256})),wholeCoreTranslated:false,namespaceComplete:false,traitComplete:false,dropSemanticsComplete:false});
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
const exactHeader=(item,header)=>{
  const tokens=significant(item.tokens),begin=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>begin&&token.text==='{');
  return begin>=0&&open>=0&&tokens.slice(begin,open).map(token=>token.text).join('')===header;
};
function methodIn(source,header,name){
  const owners=sourceItems(source).filter(item=>item.term==='impl'&&exactHeader(item,header));
  if(owners.length!==1)throw new TypeError('standard method requires one exact original impl owner');
  const owner=owners[0],tokens=significant(owner.tokens),open=tokens.findIndex(token=>token.text==='{'),close=tokens.at(-1);
  if(open<0||close?.text!=='}')throw new TypeError('standard impl requires complete original delimiters');
  const offset=tokens[open].end,members=sourceItems(source.slice(offset,close.start)).filter(item=>item.term==='fn'&&item.name===name);
  if(members.length!==1)throw new TypeError('standard method requires one actual original member');
  const member=members[0],written=significant(member.tokens),fn=written.findIndex(token=>token.text==='fn'),body=written.findIndex((token,index)=>index>fn&&token.text==='{'),end=written.at(-1);
  if(fn<0||body<0||end?.text!=='}')throw new TypeError('standard member requires one complete original function body');
  const definitionSpan={start:offset+written[fn].start,end:offset+end.end},bodySpan={start:offset+written[body].start,end:offset+end.end};
  // FnOnce(T) in a generic bound is not the member's parameter group.
  // Consume the complete balanced generic prefix before selecting `(self, ...)`.
  let paren=fn+2;
  if(written[paren]?.text==='<'){
    let genericDepth=0,groupDepth=0;
    for(;paren<written.length;paren++){
      const token=written[paren].text;
      if(['(','['].includes(token))groupDepth++;
      else if([')',']'].includes(token))groupDepth--;
      else if(!groupDepth&&token==='<')genericDepth++;
      else if(!groupDepth&&token==='>'&&--genericDepth===0){paren++;break;}
      if(groupDepth<0||genericDepth<0)throw new TypeError('standard member generic prefix is unbalanced');
    }
    if(genericDepth||groupDepth)throw new TypeError('standard member requires its complete original generic prefix');
  }
  if(written[paren]?.text!=='(')throw new TypeError('standard member parameter group must follow its actual generic prefix');
  let endParams=-1,parameterDepth=0;for(let at=paren;at<written.length;at++){if(written[at].text==='(')parameterDepth++;else if(written[at].text===')'&&--parameterDepth===0){endParams=at;break;}}
  if(paren<0||endParams<0||endParams>=body)throw new TypeError('standard method requires its complete original parameter group');
  const parameterGroups=[],parameters=[];let group=[];
  let nested=0;for(const token of written.slice(paren+1,endParams)){if(['(','[','<'].includes(token.text))nested++;if([')',']','>'].includes(token.text))nested--;if(token.text===','&&nested===0){parameterGroups.push(group);group=[];}else group.push(token);}
  if(group.length)parameterGroups.push(group);
  for(const tokens of parameterGroups){
    if(tokens.length===2&&tokens[0].text==='&'&&tokens[1].text==='self')parameters.push({name:'self',receiver:true,reference:'shared',rustTypeSyntax:['&','Self']});
    else if(tokens.length===1&&tokens[0].text==='self')parameters.push({name:'self',receiver:true,rustTypeSyntax:['Self']});
    else if(tokens[0]?.type==='ident'&&tokens[1]?.text===':'&&tokens.length>2)parameters.push({name:tokens[0].text,receiver:false,rustTypeSyntax:tokens.slice(2).map(token=>token.text)});
    else throw new TypeError('standard body parameter requires a separately checked source signature');
  }
  return {name,ownerHeader:header,parameters,definitionSpan,bodySpan,signatureSource:source.slice(definitionSpan.start,bodySpan.start),bodySource:source.slice(bodySpan.start,bodySpan.end),definitionSource:source.slice(definitionSpan.start,definitionSpan.end)};
}
function seal(key,method,evidence,cacheValue=true){
  const value=freeze({profile:manifest.profile,key,method:structuredClone(method),sourceInputs:evidence.sourceInputs??STANDARD_BODY_SOURCE_PROFILE.sourceInputs.filter((input,index)=>key.startsWith('Result::')?manifest.sources[index].rustPath==='library/core/src/result.rs':manifest.sources[index].rustPath!=='library/core/src/result.rs'),evidence:structuredClone(evidence),bodySha256:hash(method.bodySource),namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false});
  selections.set(value,{method,evidence});if(cacheValue)cache.set(key,value);return value;
}
export function pinnedOptionBody(name){
  if(!['unwrap_or','unwrap_or_default','unwrap_or_else','or_else','as_ref','is_none_or','is_some_and','map_or_else','filter'].includes(name))throw new TypeError('standard method is outside the initial body profile');
  const key='Option::'+name;if(cache.has(key))return cache.get(key);
  const source=sources.get('library/core/src/option.rs'),method=methodIn(source.source,'impl<T>Option<T>',name);
  return seal(key,method,{kind:'original-inherent-method',rustPath:source.input.rustPath,sourceSha256:source.input.sha256,owner:'core::option::Option<T>',genericParameter:'T'});
}
export function pinnedSharedBody(kind){
  if(!['Option','Result'].includes(kind))throw new TypeError('shared body requires an actual canonical standard family');
  if(kind==='Option')return pinnedOptionBody('as_ref');
  const key='Result::as_ref';if(cache.has(key))return cache.get(key);
  const source=sources.get('library/core/src/result.rs'),method=methodIn(source.source,'impl<T,E>Result<T,E>','as_ref');
  return seal(key,method,{kind:'original-inherent-method',rustPath:source.input.rustPath,sourceSha256:source.input.sha256,owner:'core::result::Result<T,E>',genericParameters:['T','E']});
}
export function pinnedMappedBody(kind,name){
  if(!(kind==='Result'&&name==='map'||kind==='Option'&&name==='map_or'))throw new TypeError('mapped body requires a checked canonical mapped method');
  const key=kind+'::'+name;if(cache.has(key))return cache.get(key);
  const source=sources.get('library/core/src/'+kind.toLowerCase()+'.rs'),method=methodIn(source.source,kind==='Option'?'impl<T>Option<T>':'impl<T,E>Result<T,E>',name);
  return seal(key,method,{kind:'original-inherent-method',rustPath:source.input.rustPath,sourceSha256:source.input.sha256,owner:'core::'+kind.toLowerCase()+'::'+kind,genericParameters:kind==='Option'?['T','U']:['T','U','E']});
}
const scalarNames=new Set(['bool','char','usize','u8','u16','u32','u64','u128','isize','i8','i16','i32','i64','i128','f64']);
let defaultDefinition,defaultInvocations;
export function pinnedCloneBody(owner){
 if(typeof owner!=='string'||owner.length>64||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(owner))throw new TypeError('Clone owner requires bounded original nominal name');
 const key='Clone::'+owner;if(cache.has(key))return cache.get(key);
 if(owner==='Option'){const selected=assertOriginalOptionCloneBody(originalOptionCloneBody());return seal(key,selected.method,{...selected.evidence,sourceSelection:selected});}
 const expansion=originalPrimitiveCloneExpansion();assertOriginalPrimitiveCloneExpansion(expansion);const members=expansion.members.filter(member=>member.target===owner);if(members.length!==1)throw new TypeError('Clone owner requires separately checked original source');const member=members[0],tokens=tokenizeRust(member.methodSource),open=tokens.findIndex(token=>token.value==='{'),close=tokens.findLastIndex(token=>token.value==='}');if(open<0||close<open)throw new TypeError('Actual primitive Clone body absent');
 const bodySpan={start:tokens[open].start,end:tokens[close].end},method={name:'clone',ownerHeader:'actual original expanded primitive Clone',parameters:[{name:'self',receiver:true,reference:'shared',rustTypeSyntax:['&','Self']}],definitionSpan:{start:0,end:member.methodSource.length},bodySpan,signatureSource:member.methodSource.slice(0,bodySpan.start),definitionSource:member.methodSource,bodySource:member.methodSource.slice(bodySpan.start,bodySpan.end)};
 return seal(key,method,{kind:'original-macro-expanded-primitive-clone-method',owner,trait:'core::clone::Clone',originalMember:member,expansionDigest:expansion.digest,sourceInputs:[{rustPath:expansion.source.path,sha256:expansion.source.sha256}],sourceCoordinates:'actual original declarative expansion method; full macro/input/opaque type origins retained',wholeTraitTranslated:false,runtimeParity:false});
}
// Separate source selection only. Ordinary caller/storage/loan admission stays
// outside this API, and the existing Clone dispatch is unchanged.
export function pinnedStringCloneBody(role){
 const selected=requireOriginalStringCloneMethod(originalStringCloneMethod(role)),key='StringCloneSource::'+role;
 return seal(key,selected.method,{kind:'original-standard-string-clone-prerequisite',sourceSelection:selected,rustPath:selected.path,sourceSha256:selected.sourceSha256,sourceInputs:[{rustPath:selected.path,sha256:selected.sourceSha256}],callerTypeResolved:false,privateStorageJoined:false,allocatorCompiled:false,unsafeCompiled:false,oomCompiled:false,runtimeParity:false},false);
}
export function pinnedStringCloneParsingFrontier(plan,Parser){
 requireOriginalStringClonePlan(plan);if(Parser!==HostRustParser)throw new TypeError('String Clone parsing requires the actual Host parser');
 const rows=Object.keys(plan.selections).map(role=>{const selection=pinnedStringCloneBody(role);try{const syntax=parsePinnedBody(Parser,selection);return {role,selection,syntax,evidence:parsedPinnedBodyEvidence(syntax),parsed:true};}catch(error){if(!(error instanceof TranslationError))throw error;return {role,selection,parsed:false,refusal:{name:error.name,message:error.message,span:error.span??null}};}});
 return freeze({schema:'original-string-clone-parsing-frontier-v1',sourcePlan:plan,rows,callerTypeResolved:false,privateStorageJoined:false,allocatorCompiled:false,unsafeCompiled:false,oomCompiled:false,runtimeParity:false},false);
}
export function pinnedDefaultBody(owner){
  const key='Default::'+owner;if(cache.has(key))return cache.get(key);
  if(['String','Option','Vec'].includes(owner)){const selected=assertOriginalContainerDefaultBody(originalContainerDefaultBody(owner));return seal(key,selected.method,{...selected.evidence,sourceSelection:selected});}
  if(owner==='&str'){
    const source=sources.get('library/core/src/str/mod.rs'),method=methodIn(source.source,'implDefaultfor&str','default');
    return seal(key,method,{kind:'original-trait-method',rustPath:source.input.rustPath,sourceSha256:source.input.sha256,owner:'&str',trait:'core::default::Default'});
  }
  if(!scalarNames.has(owner))throw new TypeError('Default owner needs a separately checked original implementation');
  const source=sources.get('library/core/src/default.rs');
  defaultDefinition??=compileDeclarativeMacro(source.source,{name:'default_impl',owner:['core','default']});
  defaultInvocations??=originalTopLevelMacroInvocations(source.source);
  const calls=defaultInvocations.filter(call=>call.path.length===1&&call.path[0]==='default_impl'&&call.trees[0]?.kind==='token'&&call.trees[0].text===owner&&call.trees[1]?.text===',');
  if(calls.length!==1||calls[0].sourceFileSha256!==source.input.sha256)throw new TypeError('Default owner requires one original pinned macro invocation');
  const invocation=calls[0],expansion=expandDeclarativeMacro(defaultDefinition,invocation.trees),expandedSource=expansion.trees.map(originalMacroTreeText).join(' ');
  const method=methodIn(expandedSource,'implDefaultfor'+owner,'default');
  return seal(key,method,{kind:'original-macro-expanded-trait-method',rustPath:source.input.rustPath,sourceSha256:source.input.sha256,owner,trait:'core::default::Default',definitionDigest:defaultDefinition.digest,definitionSpan:defaultDefinition.definitionSpan,invocationSourceSha256:invocation.sourceSha256,invocationSpan:invocation.sourceSpan,expansionDigest:expansion.digest,expandedSourceSha256:hash(expandedSource),expandedTrees:expansion.trees,macroOwnerNamespaceComplete:false});
}
// Kept separate from the scalar owner API: external Default needs the actual
// Cargo/source owner and cannot borrow an unqualified caller name.
export function pinnedJsonDefaultBody(dependencies){
  const selected=assertOriginalJsonDefaultBody(originalJsonDefaultBody(dependencies),dependencies);
  return seal('serde_json::Value::Default',selected.method,{...selected.evidence,sourceSelection:selected},false);
}
export function parsePinnedBody(Parser,selection){
  const state=selections.get(selection);if(!state||Parser!==HostRustParser)throw new TypeError('standard parsing requires an actual privately selected pinned body');
  const snapshot=originalHostParserIdentitySnapshot(),guard=new HostRustParser(tokenizeRust(state.method.bodySource));
  const identity=()=>assertOriginalParserIdentity(guard,HostRustParser.prototype,new Map(snapshot.parserMethods));identity();
  const ActualParser=state.method.name==='as_ref'?class extends Parser{
    pattern(path,aliases){if(this.cursor.is('ref')){const token=this.cursor.next(),value=super.pattern(path,aliases);if(value.k!=='bindOrCtor'||this.cursor.is('mut'))throw new TypeError('Original shared body requires its actual immutable ref binder');return {...value,pinnedSourceRefBinder:{kind:'ref',span:{start:token.start,end:token.end}}};}return super.pattern(path,aliases);}
  }:state.method.name==='or_else'?class extends Parser{
    pattern(path,aliases){
      // The selected original @ pattern returns the complete Some value.
      // Name its one wildcard field for the existing reconstruction adapter;
      // caller payload Copy/no-Drop and canonical Option checks remain mandatory.
      if(this.cursor.is('_')){const token=this.cursor.next();return {k:'bindOrCtor',name:'ml_standard_alias_field',span:{start:token.start,end:token.end}};}
      return super.pattern(path,aliases);
    }
  }:Parser;
  const parser=new ActualParser(tokenizeRust(state.method.bodySource)),node=parser.block([]);identity();
  assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
  if(!parser.cursor.atEnd())throw new TypeError('standard body requires complete original block parsing');
  parsed.set(node,{selection,syntaxSha256:hash(JSON.stringify(copyMetadata(node,{preserveKeyOrder:true})))});return node;
}
export function parsedPinnedBodyEvidence(node){
  const state=parsed.get(node);if(!state||hash(JSON.stringify(copyMetadata(node,{preserveKeyOrder:true})))!==state.syntaxSha256)throw new TypeError('standard body syntax differs from its private actual parse');
  return freeze({selection:state.selection,syntaxSha256:state.syntaxSha256,parsedBodySource:state.selection.method.bodySource,sourceCoordinates:'exact original body fragment; enclosing full-source bodySpan retained separately'});
}
