// Complete official inputs and selected written generator routes only. This
// registry cannot select a caller's macro owner, feature branch or edition.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {rustTokens} from './rust-structure.mjs';
const plans=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original standard bang source: '+message);};
const manifestSha256='b42662682e70f19e28844150363768d22da4fbc486c6c7be86f38e4259ef49d8';
function declaration(origin,name,kind){
 const syntax=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000}),hits=[];
 function visit(nodes){for(let at=0;at<nodes.length;at++){
  let nameAt=at+1;
  if(kind==='macro_rules'&&nodes[at]?.text==='macro_rules'&&nodes[at+1]?.text==='!')nameAt++;
  if(nodes[at]?.text===kind&&nodes[nameAt]?.text===name){
   let end=nameAt+1;while(end<nodes.length&&!(nodes[end].kind==='group'&&nodes[end].delimiter==='{')&&nodes[end].text!==';')end++;
   if(nodes[end]?.kind==='group'&&nodes[end].delimiter==='{'){
    let begin=at;if(nodes[begin-1]?.text==='pub')begin--;
    while(nodes[begin-1]?.kind==='group'&&nodes[begin-1].delimiter==='['&&nodes[begin-2]?.text==='#')begin-=2;
    const span={start:nodes[begin].span.start,end:nodes[end].span.end};hits.push({sourcePath:origin.sourcePath,sourceSha256:origin.sha256,name,kind,span,original:origin.source.slice(span.start,span.end),syntax:nodes.slice(begin,end+1)});
   }
  }
  if(nodes[at].kind==='group')visit(nodes[at].children);
 }}visit(syntax);if(!hits.length)fail('complete original declaration absent: '+name);return hits;
}
const words=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join(' ');
function route(callback,selected,role){const whole=words(callback.original),part=words(selected),at=whole.indexOf(part);if(at<0||whole.indexOf(part,at+1)>=0)fail('complete generator route absent or ambiguous: '+role);return {callback,selected,role};}
export function originalStandardBangOutputSourcePlan(){
 const bytes=readFileSync(new URL('./source-profiles/standard-bang-output/manifest.json',import.meta.url));if(hash(bytes)!==manifestSha256)fail('source inventory changed');const manifest=JSON.parse(bytes.toString('utf8'));
 const sources=manifest.sources.map(pin=>{
  const packed=readFileSync(new URL('./source-profiles/standard-bang-output/'+pin.archive,import.meta.url));if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete original archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:2*1024*1024});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete original source changed');return {...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)};
 });
 const source=path=>{const hits=sources.filter(row=>row.sourcePath===path);if(hits.length!==1)fail('complete input missing or repeated');return hits[0];};
 const one=(path,name,kind='fn')=>{const hits=declaration(source(path),name,kind);if(hits.length!==1)fail('original declaration ambiguous: '+name);return hits[0];};
 const alloc=source('library/alloc/src/macros.rs'),vec=one(alloc.sourcePath,'vec','macro_rules'),edition='compiler/rustc_builtin_macros/src/edition_panic.rs',registry=one('compiler/rustc_builtin_macros/src/lib.rs','register_builtin_macros');
 const callbacks={panic:one(edition,'expand_panic'),unreachable:one(edition,'expand_unreachable'),expand:one(edition,'expand'),edition:one(edition,'use_panic_2021')};
 const recipes=[
  route(registry,'core_panic: edition_panic::expand_panic,','registered core panic generator'),
  route(registry,'std_panic: edition_panic::expand_panic,','registered std panic generator'),
  route(registry,'unreachable: edition_panic::expand_unreachable,','registered unreachable generator'),
  route(callbacks.panic,'let mac = if use_panic_2021(sp) { sym::panic_2021 } else { sym::panic_2015 };','both original panic edition routes'),
  route(callbacks.unreachable,'let mac = if use_panic_2021(sp) { sym::unreachable_2021 } else { sym::unreachable_2015 };','both original unreachable edition routes'),
  route(callbacks.expand,'ExpandResult::Ready(MacEager::expr(','selected compiler generator emits one expression'),
  route(callbacks.expand,'.std_path(&[sym::panic, mac])','definition owner path retained'),
  route(callbacks.expand,'tokens: tts,','exact original input tokens forwarded'),
  route(callbacks.edition,'break expn.edition >= Edition::Edition2021;','actual expansion-stack edition still required'),
 ];
 const core='library/core/src/panic.rs',panicDefinitions={core2015:declaration(source(core),'panic_2015','macro'),core2021:declaration(source(core),'panic_2021','macro'),unreachable2015:declaration(source(core),'unreachable_2015','macro'),unreachable2021:declaration(source(core),'unreachable_2021','macro'),std2015:declaration(source('library/std/src/panic.rs'),'panic_2015','macro')};
 const plan=freeze({schema:'original-standard-bang-output-source-v1',manifestSha256,manifest,sources,vec,registry,callbacks,recipes,panicDefinitions,
  pending:['actual caller macro namespace and all competing original/generated alternatives','original macro attribute owner and availability','genuine original callsite expansion-stack edition','core panic_immediate_abort alternatives','complete nested panic/format_args/const_format_args output closure','core panic_2015 literal fragment grammar remains unsupported'],
  compilerGeneratorExecuted:false,callerMacroOwnerResolved:false,globalBangComplete:false,namespaceAuthority:false,runtimeAuthority:false});plans.add(plan);return plan;
}
export function requireOriginalStandardBangOutputSourcePlan(plan){if(!plans.has(plan))fail('copied or foreign source plan');return plan;}
