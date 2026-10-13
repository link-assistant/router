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
  const paren=written.findIndex((token,index)=>index>fn&&token.text==='('),endParams=written.findIndex((token,index)=>index>paren&&token.text===')');
  if(paren<0||endParams<0||endParams>=body)throw new TypeError('standard method requires its complete original parameter group');
  const parameterGroups=[],parameters=[];let group=[];
  for(const token of written.slice(paren+1,endParams)){if(token.text===','){parameterGroups.push(group);group=[];}else group.push(token);}
  if(group.length)parameterGroups.push(group);
  for(const tokens of parameterGroups){
    if(tokens.length===1&&tokens[0].text==='self')parameters.push({name:'self',receiver:true,rustTypeSyntax:['Self']});
    else if(tokens[0]?.type==='ident'&&tokens[1]?.text===':'&&tokens.length>2)parameters.push({name:tokens[0].text,receiver:false,rustTypeSyntax:tokens.slice(2).map(token=>token.text)});
    else throw new TypeError('standard body parameter requires a separately checked source signature');
  }
  return {name,ownerHeader:header,parameters,definitionSpan,bodySpan,signatureSource:source.slice(definitionSpan.start,bodySpan.start),bodySource:source.slice(bodySpan.start,bodySpan.end),definitionSource:source.slice(definitionSpan.start,definitionSpan.end)};
}
function seal(key,method,evidence){
  const value=freeze({profile:manifest.profile,key,method:structuredClone(method),sourceInputs:STANDARD_BODY_SOURCE_PROFILE.sourceInputs,evidence:structuredClone(evidence),bodySha256:hash(method.bodySource),namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false});
  selections.set(value,{method,evidence});cache.set(key,value);return value;
}
export function pinnedOptionBody(name){
  if(!['unwrap_or','unwrap_or_default','unwrap_or_else','or_else'].includes(name))throw new TypeError('standard method is outside the initial body profile');
  const key='Option::'+name;if(cache.has(key))return cache.get(key);
  const source=sources.get('library/core/src/option.rs'),method=methodIn(source.source,'impl<T>Option<T>',name);
  return seal(key,method,{kind:'original-inherent-method',rustPath:source.input.rustPath,sourceSha256:source.input.sha256,owner:'core::option::Option<T>',genericParameter:'T'});
}
const scalarNames=new Set(['bool','char','usize','u8','u16','u32','u64','u128','isize','i8','i16','i32','i64','i128','f64']);
let defaultDefinition,defaultInvocations;
export function pinnedDefaultBody(owner){
  const key='Default::'+owner;if(cache.has(key))return cache.get(key);
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
export function parsePinnedBody(Parser,selection){
  const state=selections.get(selection);if(!state||typeof Parser!=='function')throw new TypeError('standard parsing requires an actual privately selected pinned body');
  const ActualParser=state.method.name==='or_else'?class extends Parser{
    pattern(path,aliases){
      // The selected original @ pattern returns the complete Some value.
      // Name its one wildcard field for the existing reconstruction adapter;
      // caller payload Copy/no-Drop and canonical Option checks remain mandatory.
      if(this.cursor.is('_')){const token=this.cursor.next();return {k:'bindOrCtor',name:'ml_standard_alias_field',span:{start:token.start,end:token.end}};}
      return super.pattern(path,aliases);
    }
  }:Parser;
  const parser=new ActualParser(tokenizeRust(state.method.bodySource)),node=parser.block([]);
  if(!parser.cursor.atEnd())throw new TypeError('standard body requires complete original block parsing');
  parsed.set(node,{selection,syntaxSha256:hash(JSON.stringify(node))});return node;
}
export function parsedPinnedBodyEvidence(node){
  const state=parsed.get(node);if(!state||hash(JSON.stringify(node))!==state.syntaxSha256)throw new TypeError('standard body syntax differs from its private actual parse');
  return freeze({selection:state.selection,syntaxSha256:state.syntaxSha256,parsedBodySource:state.selection.method.bodySource,sourceCoordinates:'exact original body fragment; enclosing full-source bodySpan retained separately'});
}
