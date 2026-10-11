// Candidates describe original declarations; only a verified owner can consume
// them. This census supplies no layouts, constructors, glob or runtime authority.
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const identifier=/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u;
const inert=new Set(['stable','doc','derive','allow','warn','deny','forbid','must_use','lang','rustc_diagnostic_item','rustc_on_unimplemented','rustc_trivial_field_reads','rustc_do_not_implement_via_object','rustc_coinductive','rustc_unsafe_specialization_marker']);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
function checkedItems(source){
  if(typeof source!=='string'||Buffer.byteLength(source)>2_000_000)throw new TypeError('Namespace source census exceeds its original-byte bound');
  const items=sourceItems(source).filter(item=>!item.comment);
  if(items.length>10_000)throw new TypeError('Namespace source census exceeds its item bound');
  return items;
}
function header(item,{requireStable=true}={}){
  const tokens=item.tokens.filter(token=>token.type!=='comment');
  if(tokens.length>100_000)return null;
  const condition=itemConfiguration(tokens,null);
  if(condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name)))return null;
  if(requireStable&&!condition.attributes.some(attribute=>attribute.name==='stable'))return null;
  const at=tokens.findIndex(token=>token.start>=(condition.attributes.at(-1)?.span.end??item.start));
  if(at<0||tokens[at]?.text!=='pub'||tokens[at+1]?.text==='(')return null;
  return {tokens,at:at+1,attributes:condition.attributes};
}
function evidence(source,item,extra){
  return {status:'candidate',sourceSha256:hash(source),span:{start:item.start,end:item.end},itemSha256:hash(source.slice(item.start,item.end)),...extra,runtimeAuthority:false,namespaceComplete:false};
}
export function stablePublicTypeCandidates(source){
  const candidates=[];
  for(const item of checkedItems(source)){
    const parsed=header(item);if(!parsed)continue;
    let at=parsed.at;
    if(parsed.tokens[at]?.text==='unsafe')at++;
    if(parsed.tokens[at]?.text==='auto')at++;
    const kind=parsed.tokens[at]?.text,name=parsed.tokens[at+1]?.text;
    if(!['struct','enum','trait','type'].includes(kind)||item.term!==kind||!identifier.test(name??''))continue;
    candidates.push(evidence(source,item,{name,kind,namespace:'type',attributes:parsed.attributes}));
  }
  return freeze(candidates);
}
// The bounded grammar retains exact explicit leaves, aliases and group paths.
// A glob or an unsupported import never becomes a list of guessed names.
export function stablePublicReexportCandidates(source){
  const candidates=[];
  for(const item of checkedItems(source)){
    const parsed=header(item);if(!parsed||parsed.tokens[parsed.at]?.text!=='use')continue;
    const tokens=parsed.tokens;let at=parsed.at+1,count=0;
    const leaves=[],eat=text=>tokens[at]?.text===text?tokens[at++]:null;
    const name=()=>{const token=tokens[at++];if(token?.type!=='ident'||!identifier.test(token.text))throw new Error('Unresolved namespace import');return token.text;};
    const tree=(prefix,depth)=>{
      if(depth>32||++count>256)throw new Error('Namespace import exceeds its bound');
      if(eat('{')){
        if(tokens[at]?.text==='}')throw new Error('Empty namespace import group');
        while(tokens[at]?.text!=='}'){tree(prefix,depth+1);if(!eat(','))break;}
        if(!eat('}'))throw new Error('Unclosed namespace import group');return;
      }
      const segment=name(),path=[...prefix,segment];
      if(eat('::')){tree(path,depth+1);return;}
      const alias=eat('as')?name():null;
      if(segment==='self'||alias==='_')throw new Error('Namespace self/unnamed imports need a separate proof');
      leaves.push({path,name:alias??segment});
    };
    try{tree([],0);if(!eat(';')||at!==tokens.length)continue;}
    catch{continue;}
    for(const leaf of leaves)candidates.push(evidence(source,item,{...leaf,attributes:parsed.attributes}));
  }
  return freeze(candidates);
}
export function originalPublicModuleCandidate(source,name){
  if(!identifier.test(name??''))throw new TypeError('Namespace module candidate needs an identifier');
  const matches=checkedItems(source).filter(item=>{
    const parsed=header(item,{requireStable:false});
    return parsed&&parsed.tokens.slice(parsed.at).map(token=>token.text).join('')===`mod${name};`;
  });
  return matches.length===1?freeze(evidence(source,matches[0],{name,kind:'mod'})):null;
}
export function originalExternAliasCandidate(source,crate,alias){
  if(![crate,alias].every(name=>identifier.test(name??'')))throw new TypeError('Namespace crate aliases need identifiers');
  const matches=[];
  for(const item of checkedItems(source)){
    const tokens=item.tokens.filter(token=>token.type!=='comment'),condition=itemConfiguration(tokens,null);
    if(condition.status!=='active'||condition.attributes.some(attribute=>!['allow','warn','deny','forbid','doc','stable','macro_use'].includes(attribute.name)||attribute.name==='macro_use'&&attribute.tokens.join('')!=='#[macro_use]'))continue;
    const at=tokens.findIndex(token=>token.start>=(condition.attributes.at(-1)?.span.end??item.start));
    if(at>=0&&tokens.slice(at).map(token=>token.text).join('')===`externcrate${crate}as${alias};`)matches.push({item,attributes:condition.attributes});
  }
  return matches.length===1?freeze(evidence(source,matches[0].item,{crate,alias,attributes:matches[0].attributes,macroImportsComplete:false})):null;
}
