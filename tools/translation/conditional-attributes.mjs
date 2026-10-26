// Validate original cfg_attr syntax before proving a false predicate absent.
// Exact builtin lint alternatives retain the existing inert contract. Literal
// documentation supplies source candidates only until caller ownership closes.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tokenizeRust} from './extensions/lexical.mjs';
import {rustTokens} from './rust-structure.mjs';
import {types} from 'node:util';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('./source-profiles/conditional-attributes/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const keywords=new Set(),originalSources=new Map(),documentationInspections=new WeakMap();
for(const input of manifest.sources){
  const packed=readFileSync(new URL(input.archive,root));
  if(hash(packed)!==input.archiveSha256)throw new TypeError('Conditional attribute source archive changed');
  const source=gunzipSync(packed,{maxOutputLength:120_000});
  if(source.length!==input.bytes||hash(source)!==input.sha256)throw new TypeError('Conditional attribute original source changed');
  originalSources.set(input.archive,{pin:input,raw:source});
  if(input.keywordLines){const [start,end]=input.keywordLines;for(const line of source.toString('utf8').split('\n').slice(start-1,end)){const match=/^\s+[A-Za-z]+:\s+"([A-Za-z]+)"/u.exec(line);if(match)keywords.add(match[1]);}}
}
export const CONDITIONAL_ATTRIBUTE_PROFILE=freeze({...manifest,activeExpansionAuthority:false,namespaceAuthority:false,runtimeAuthority:false});
const text=token=>token?.text??token?.raw??token?.value;
const identifier=/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u;
const pathName=token=>{const name=text(token);return typeof name==='string'&&name!=='_'&&identifier.test(name)&&name.normalize('NFC')===name&&!keywords.has(name);};
const pairs={'(':')','[':']','{':'}'};
function groupEnd(tokens,start){
  const stack=[];
  for(let at=start;at<tokens.length;at++){
    const value=text(tokens[at]);
    if(Object.hasOwn(pairs,value)){if(stack.length>=64)throw new TypeError('Conditional attribute nesting exceeds its bound');stack.push(pairs[value]);}
    else if([')',']','}'].includes(value)){
      if(stack.pop()!==value)throw new TypeError('Conditional attribute has mismatched delimiters');
      if(!stack.length)return at;
    }
  }
  throw new TypeError('Conditional attribute has an unterminated group');
}
function argument(tokens){
  let at=0;
  if(!pathName(tokens[at++]))throw new TypeError('Conditional attribute input requires an original path');
  while(text(tokens[at])==='::'){at++;if(!pathName(tokens[at++]))throw new TypeError('Conditional attribute input has an incomplete path');}
  if(at===tokens.length)return;
  if(Object.hasOwn(pairs,text(tokens[at]))){if(groupEnd(tokens,at)!==tokens.length-1)throw new TypeError('Conditional attribute input has trailing tokens');return;}
  // Other expressions are valid in Rust but need their own checked grammar.
  if(text(tokens[at])==='='&&at+2===tokens.length){
    const literal=tokenizeRust(text(tokens[at+1])??'').filter(token=>token.kind!=='eof');
    if(literal.length===1&&literal[0].kind==='string')return;
  }
  throw new TypeError('Conditional attribute input is outside the bounded original grammar');
}
export function inspectConditionalAttribute(body){
  if(!Array.isArray(body)||body.length>8192||text(body[0])!=='cfg_attr'||text(body[1])!=='('||groupEnd(body,1)!==body.length-1)throw new TypeError('cfg_attr requires one bounded parenthesized original input');
  const tokens=body.slice(2,-1),parts=[];let start=0,separators=0;
  for(let at=0;at<tokens.length;at++){
    const value=text(tokens[at]);
    if(Object.hasOwn(pairs,value)){at=groupEnd(tokens,at);continue;}
    if([')',']','}'].includes(value))throw new TypeError('Conditional attribute has an unmatched delimiter');
    if(value===','){parts.push(tokens.slice(start,at));separators++;start=at+1;if(parts.length>257)throw new TypeError('Conditional attribute input count exceeds its bound');}
  }
  if(start<tokens.length)parts.push(tokens.slice(start));
  if(!parts.length||!parts[0].length||!separators)throw new TypeError('cfg_attr requires a predicate followed by a comma');
  const attributes=parts.slice(1);
  for(const entry of attributes){if(!entry.length)throw new TypeError('Conditional attribute has an empty input');argument(entry);}
  const inertDeadCodeLint=attributes.length>0&&attributes.every(entry=>['allow(dead_code)','allow(dead_code,)'].includes(entry.map(text).join('')));
  const inertBuiltinLint=attributes.length>0&&attributes.every(entry=>/^allow\((dead_code|unused_mut|unused_variables),?\)$/u.test(entry.map(text).join('')));
  const result={predicate:parts[0],inertDeadCodeLint,inertBuiltinLint,attributes:attributes.map(entry=>({tokens:entry.map(text),span:{start:entry[0].start,end:entry.at(-1).end}}))};
  const literalDoc=entry=>entry.length===3&&text(entry[0])==='doc'&&text(entry[1])==='='&&tokenizeRust(text(entry[2])??'').filter(token=>token.kind!=='eof').length===1&&tokenizeRust(text(entry[2])??'')[0].kind==='string';
  if(attributes.some(literalDoc)&&attributes.every(entry=>literalDoc(entry)||/^allow\((dead_code|unused_mut|unused_variables),?\)$/u.test(entry.map(text).join('')))){
    const source=originalConditionalDocumentation(),snapshot=cloneInspection(result);
    documentationInspections.set(result,{snapshot,evidence:freeze({languageRule:'rust.cfg-attr.literal-doc-alternatives.v1',source,inputs:result.attributes.map(entry=>({tokens:[...entry.tokens],span:{...entry.span}})),alternatives:{predicateFalse:'no-expanded-attribute',predicateTrue:'literal-documentation-and-original-inert-lints-if-builtin-owned'},predicateSelected:false,callerOwnerResolved:false,callerScopeComplete:false,itemAvailabilityProved:false,inertConditionalAttribute:false,builtinLiteralNamespaceTransformation:false,builtinLiteralRuntimeTransformation:false})});
  }
  return result;
}

// These new facts are private to the actual inspection, never a public flag.
// Descriptor-only equality also refuses edits/getters/proxies without invoking
// an inherited toJSON or accepting a copied inspection as a new authority.
function cloneInspection(value){
  if(value===null||typeof value!=='object')return value;
  return Array.isArray(value)?value.map(cloneInspection):Object.fromEntries(Object.entries(value).map(([key,child])=>[key,cloneInspection(child)]));
}
function sameInspection(value,expected){
  if(value===null||typeof value!=='object')return Object.is(value,expected);
  if(!expected||typeof expected!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.getPrototypeOf(expected))return false;
  const keys=Reflect.ownKeys(value),wanted=Reflect.ownKeys(expected);if(keys.length!==wanted.length)return false;
  return keys.every((key,index)=>{if(key!==wanted[index])return false;const actual=Object.getOwnPropertyDescriptor(value,key),prior=Object.getOwnPropertyDescriptor(expected,key);return Object.hasOwn(actual,'value')&&actual.enumerable===prior.enumerable&&sameInspection(actual.value,prior.value);});
}
export function conditionalLiteralDocEvidence(inspection){
  const state=documentationInspections.get(inspection);if(!state)return null;
  if(!sameInspection(inspection,state.snapshot))throw new TypeError('Conditional literal documentation inspection changed');
  return state.evidence;
}
const words=tokens=>tokens.map(text).join('');
const documentationFailure=()=>{throw new TypeError('Conditional documentation requires its complete original builtin owner');};
let documentationSource,documentationOriginalInputs;
function originalConditionalDocumentation(){
  if(documentationSource)return documentationSource;
  const original=name=>{const {pin,raw}=originalSources.get(name);return freeze({...pin,source:new TextDecoder('utf-8',{fatal:true}).decode(raw)});};
  const builtin=original('rust-builtin-attrs-1.89.0.rs.gz'),config=original('rust-expand-config-1.89.0.rs.gz'),parser=original('rust-parse-attr-1.89.0.rs.gz');
  documentationOriginalInputs=freeze([builtin,config,parser]);
  const significant=input=>rustTokens(input.source).filter(token=>token.type!=='comment').flatMap(token=>token.type==='ident'&&token.text.endsWith('!')?[{...token,text:token.text.slice(0,-1),end:token.end-1},{...token,text:'!',start:token.end-1}]:[token]);
  const witness=(input,tokens)=>({url:input.url,sourceSha256:input.sha256,span:{start:tokens[0].start,end:tokens.at(-1).end},original:input.source.slice(tokens[0].start,tokens.at(-1).end)});
  const item=(input,name,macro=false)=>{
    const tokens=significant(input),starts=[];
    for(let at=0;at<tokens.length;at++)if(macro?text(tokens[at])==='macro_rules'&&text(tokens[at+1])==='!'&&text(tokens[at+2])===name:text(tokens[at])==='fn'&&text(tokens[at+1])===name)starts.push(at);
    if(starts.length!==1)documentationFailure();const start=starts[0];let open=start;while(open<tokens.length&&text(tokens[open])!=='{')open++;if(open===tokens.length)documentationFailure();
    return witness(input,tokens.slice(start,groupEnd(tokens,open)+1));
  };
  const registration=name=>{
    const tokens=significant(builtin),start=tokens.findIndex((token,index)=>text(token)==='static'&&text(tokens[index+1])==='BUILTIN_ATTRIBUTES');if(start<0)documentationFailure();
    let begin=start;while(begin<tokens.length&&text(tokens[begin])!=='=')begin++;begin++;if(text(tokens[begin++])!=='&'||text(tokens[begin])!=='[')documentationFailure();
    const end=groupEnd(tokens,begin),rows=[];
    for(let at=begin+1;at<end;at++)if(text(tokens[at])==='ungated'&&text(tokens[at+1])==='!'&&text(tokens[at+2])==='('){const last=groupEnd(tokens,at+2);if(text(tokens[at+3])===name)rows.push(tokens.slice(at,last+1));at=last;}
    if(rows.length!==1)documentationFailure();return witness(builtin,rows[0]);
  };
  const ungated=item(builtin,'ungated',true),template=item(builtin,'template',true),cfgAttr=registration('cfg_attr'),doc=registration('doc'),process=item(config,'process_cfg_attr'),expand=item(config,'expand_cfg_attr'),expandItem=item(config,'expand_cfg_attr_item'),parse=item(parser,'parse_cfg_attr'),lookup=item(builtin,'is_builtin_attr_name');
  const normalized=value=>words(rustTokens(value.original).filter(token=>token.type!=='comment'));
  if(normalized(cfgAttr)!=='ungated!(cfg_attr,Normal,template!(List:"predicate, attr1, attr2, ..."),DuplicatesOk,EncodeCrossCrate::Yes)'||normalized(doc)!=='ungated!(doc,Normal,template!(List:"hidden|inline|...",NameValueStr:"string"),DuplicatesOk,EncodeCrossCrate::Yes)')documentationFailure();
  const requirePart=(value,fragment)=>{if(!normalized(value).includes(words(rustTokens(fragment).filter(token=>token.type!=='comment'))))documentationFailure();};
  requirePart(ungated,'BuiltinAttribute { name: sym::$attr, encode_cross_crate: $encode_cross_crate, type_: $typ, safety: AttributeSafety::Normal, template: $tpl, gate: Ungated, duplicates: $duplicates, }');
  requirePart(template,'(List: $descr1: expr, NameValueStr: $descr2: expr) => { $crate::template!(@ false, Some($descr1), &[], Some($descr2)) }');
  requirePart(process,'if attr.has_name(sym::cfg_attr) { self.expand_cfg_attr(attr, true) } else { vec![attr.clone()] }');
  requirePart(expand,'rustc_parse::parse_cfg_attr(cfg_attr, &self.sess.psess)');requirePart(expand,'if !attr::cfg_matches(&cfg_predicate, &self.sess, self.lint_node_id, self.features) { return vec![trace_attr]; }');
  requirePart(expand,'self.process_cfg_attr(&self.expand_cfg_attr_item(cfg_attr, item))');requirePart(expandItem,'ast::attr::mk_attr_from_item(');requirePart(parse,'let item = self.parse_attr_item(ForceCollect::Yes)?;');requirePart(lookup,'BUILTIN_ATTRIBUTE_MAP.get(&name).is_some()');
  documentationSource=freeze({profile:'rust-1.89-original-conditional-literal-doc',owners:{ungated,template,cfgAttr,doc,process,expand,expandItem,parse,lookup},sourceInputs:[builtin,config,parser].map(({url,bytes,sha256})=>({url,bytes,sha256})),domain:'literal NameValueStr documentation only; already established direct-doc metadata kernel',compilerBodiesExecuted:false,featureSelection:false,arbitraryAttributeExpansion:false,namespaceAuthority:false,runtimeAuthority:false});
  return documentationSource;
}
// Complete source is evidence only, never a caller-supplied replacement input.
export function originalConditionalDocumentationInputs(){originalConditionalDocumentation();return documentationOriginalInputs;}

import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';

// Fresh complete original grammar inputs only; no source/namespace capability.
export function originalFreshConditionalAttributeSourceInputs(){
 const inventory=readFileSync(new URL('manifest.json',root));if(hash(inventory)!=='cd8ea647208ae2ff5bb67ead9fc896552360654eda42cff3c1d85a3708f7aefa')throw new TypeError('Complete original conditional grammar inventory changed');let retained=inventory.length;const inputs=[];
 for(const pin of manifest.sources){const url=new URL(pin.archive,root),packed=readFileSync(url),raw=gunzipSync(packed,{maxOutputLength:120000});retained+=packed.length+raw.length;if(retained>8388608||packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||!raw.equals(originalSources.get(pin.archive)?.raw))throw new TypeError('Complete current conditional grammar source differs');const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete conditional grammar source inverse differs');inputs.push({path:pin.url,source,concreteSyntax:concrete.meta,inverse:source,url,packed});}
 for(const row of inputs)if(!readFileSync(row.url).equals(row.packed))throw new TypeError('Complete conditional grammar sources changed during proof');if(!readFileSync(new URL('manifest.json',root)).equals(inventory))throw new TypeError('Complete conditional grammar inventory changed during proof');
 return freeze({schema:'fresh-original-conditional-attribute-source-inputs-v1',manifestSha256:hash(inventory),sources:inputs.map(({path,source,concreteSyntax,inverse})=>({path,source,concreteSyntax,inverse})),retainedSourceBytes:retained,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false});
}
