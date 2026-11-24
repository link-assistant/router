// A parser-free leaf for the selected original rustc repetition FOLLOW rule.
// Archive identity precedes source control-flow selection; neither grants a
// macro owner, complete namespace, primitive layout, or runtime trait body.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
const root=new URL('./source-profiles/source-clone/',import.meta.url);
const manifestBytes=readFileSync(new URL('manifest.json',root)),manifest=JSON.parse(manifestBytes);
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text);
const syntax=source=>words(rustTokens(source)).join(' ');
const pins={bytes:56723,sha256:'8e6dbbb0ec8bcb49b2f8e5b943621a95039c2779131a34930f516db13ff7a8d5',archiveBytes:14900,archiveSha256:'ee1c5bd38944837a73044b3879966e612876ab169c8a8547ff05cd5af27b74d2'};
const path='compiler/rustc_expand/src/mbe/macro_rules.rs',brands=new WeakSet();let selected;
export const MACRO_FOLLOW_SOURCE_PROFILE=freeze({schema:manifest.schema,rust:manifest.rust,manifestSha256:hash(manifestBytes),source:{path,...pins},wholeCompilerExecuted:false,namespaceAuthority:false,runtimeAuthority:false});
function original(){
  const rows=manifest.sources.filter(row=>row.path===path);
  if(manifest.rust!=='1.89.0'||rows.length!==1||Object.entries(pins).some(([key,value])=>rows[0][key]!==value))throw new TypeError('Original macro FOLLOW source profile differs');
  const packed=readFileSync(new URL(rows[0].archive,root)),raw=gunzipSync(packed,{maxOutputLength:64000});
  if(packed.length!==pins.archiveBytes||hash(packed)!==pins.archiveSha256||raw.length!==pins.bytes||hash(raw)!==pins.sha256)throw new TypeError('Original macro FOLLOW source bytes differ');
  return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
}
function oneFunction(source,name){const rows=sourceItems(source).filter(item=>item.term==='fn'&&item.name===name);if(rows.length!==1)throw new TypeError('Original macro FOLLOW function is absent or ambiguous: '+name);return rows[0];}
function selectedBlock(source,tokens,prefix){
  const needle=words(rustTokens(prefix)),significant=tokens.filter(token=>token.type!=='comment'),hits=[];
  for(let at=0;at<significant.length;at++)if(needle.every((word,index)=>significant[at+index]?.text===word))hits.push(at+needle.length-1);
  if(hits.length!==1||significant[hits[0]].text!=='{')throw new TypeError('Original macro FOLLOW source branch differs');
  const at=hits[0];let depth=1,end=at+1;
  for(;end<significant.length&&depth;end++){if(significant[end].text==='{')depth++;else if(significant[end].text==='}')depth--;}
  if(depth)throw new TypeError('Original macro FOLLOW branch is unterminated');
  const span={start:significant[at].start,end:significant[end-1].end};return {span,original:source.slice(span.start,span.end)};
}
export function originalMacroSequenceFollowRule(){
  if(selected)return selected;
  const source=original(),matcher=oneFunction(source,'check_matcher_core');
  const suffix=selectedBlock(source,matcher.tokens,'let build_suffix_first = || {');
  const sequence=selectedBlock(source,matcher.tokens,'TokenTree::Sequence(_, seq_rep) => {');
  // Complete selected blocks, including all conditional branches and the
  // actual recursive arguments, must match this bounded source grammar.
  // An extra constraint, macro, helper call or own-FIRST contribution refuses.
  if(syntax(suffix.original)!==syntax(`{let mut s=first_sets.first(suffix);if s.maybe_empty{s.add_all(follow);}s}`))throw new TypeError('Original macro FOLLOW suffix flow is unsupported');
  if(syntax(sequence.original)!==syntax(`{
    suffix_first=build_suffix_first();
    let mut new;
    let my_suffix=if let Some(sep)=&seq_rep.separator{
      new=suffix_first.clone();new.add_one_maybe(TtHandle::from_token(*sep));&new
    }else{&suffix_first};
    let next=check_matcher_core(sess,node_id,first_sets,&seq_rep.tts,my_suffix)?;
    if next.maybe_empty{last.add_all(&next);}else{last=next;}
    continue 'each_token;
  }`))throw new TypeError('Original macro FOLLOW repetition flow is unsupported');
  const evidence={schema:'original-rustc-sequence-follow-rule-v1',rust:manifest.rust,path,sourceSha256:pins.sha256,matcherSpan:{start:matcher.start,end:matcher.end},suffix,sequence,operations:[{kind:'suffix-first',nullable:'include-enclosing-follow'},{kind:'optional-separator',operation:'add-one-maybe'},{kind:'recursive-check',sequence:'seq_rep.tts',follow:'my_suffix'}],includeOwnFirst:false,includeSeparator:true,wholeCompilerExecuted:false,namespaceAuthority:false,runtimeAuthority:false};
  selected=freeze({...evidence,digest:hash(JSON.stringify(evidence))});brands.add(selected);return selected;
}
export function assertOriginalMacroSequenceFollowRule(rule){if(!brands.has(rule)||rule!==selected)throw new TypeError('Macro FOLLOW needs its private original source rule');return rule;}
