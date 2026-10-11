// Tool spelling is only a candidate. Actual source bindings own the proof.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sourceItems} from './rust-structure.mjs';
import {compilationProfile,itemConfiguration} from './cfg-profile.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const contexts=new WeakMap(),certificates=new WeakMap();
const id=(module,item,attribute)=>`${module.file}:${item.start}:${item.end}:${attribute.span.start}:${attribute.span.end}`;
const scopeKey=path=>['crate',...path].join('::');
export const TOOL_ATTRIBUTE_PROFILE=freeze({id:'rust-1.89-original-rustfmt-skip',rust:'1.89.0',path:['rustfmt','skip'],sources:[
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/compiler/rustc_resolve/src/macros.rs',archive:'rust-resolve-macros-1.89.0.rs.gz',bytes:49779,sha256:'301b413a2fe0c2aaee658165993272a9fa39f4aca6cc22b0ca38d08ef80b405e',archiveSha256:'f8b07424cafe525fb9ab14238a7c71c2cde9b2d3b52ab6dffb1b1b0224a5a697'},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/compiler/rustc_resolve/src/ident.rs',archive:'rust-resolve-ident-1.89.0.rs.gz',bytes:80854,sha256:'aa296cdcb826154034b13eb55e09bd477f4bb4a3f3f966e01f94e61a8bcfeadd',archiveSha256:'c676462dc5004d03d5d811603e1692890c4838fa5019f74f5b074ed07a4590cf'},
  {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/compiler/rustc_feature/src/builtin_attrs.rs',archive:'rust-builtin-attrs-1.89.0.rs.gz',bytes:53039,sha256:'2f6de6720effcaef643447287b65cc471e8f0f00122e3ec8dae3fb129f106a32',archiveSha256:'1146eb5e90bf1f88a57daac5be5d2596d5256beeb0a82e82c2e853061ff2050e'},
]});
for(const entry of TOOL_ATTRIBUTE_PROFILE.sources){
  const packed=readFileSync(new URL('./source-profiles/tool-attributes/'+entry.archive,import.meta.url));
  if(hash(packed)!==entry.archiveSha256)throw new TypeError('Tool attribute source archive checksum mismatch');
  const source=gunzipSync(packed,{maxOutputLength:120000});
  if(source.length!==entry.bytes||hash(source)!==entry.sha256)throw new TypeError('Tool attribute source checksum mismatch');
}
// A bounded subset of the actual builtin lint-list grammar. No procedural
// attribute, tool input, reason expression or macro invocation is admitted.
export function inertInnerLintItem(item,source){
  if(item.tokens[0]?.text!=='#'||item.tokens[1]?.text!=='!')return null;
  const actual=sourceItems(source).find(candidate=>candidate.start===item.start&&candidate.end===item.end);
  if(!actual||actual.tokens[0]?.text!=='#'||actual.tokens[1]?.text!=='!')return null;
  const tokens=actual.tokens.filter(token=>token.type!=='comment'),condition=itemConfiguration(tokens,null);
  if(condition.status!=='active'||!condition.attributes.length||condition.attributes.at(-1).span.end!==tokens.at(-1)?.end)return null;
  const ident=/^[\p{L}_][\p{L}\p{N}_]*$/u;
  for(const attribute of condition.attributes){
    const body=attribute.tokens.slice(3,-1);
    if(!['allow','warn','deny','forbid'].includes(body[0])||body[1]!=='('||body.at(-1)!==')')return null;
    let at=2,count=0;
    while(at<body.length-1){
      if(++count>256||!ident.test(body[at++]??''))return null;
      let segments=1;while(body[at]==='::'){if(++segments>16||!ident.test(body[++at]??''))return null;at++;}
      if(at===body.length-1)break;
      if(body[at++]!==',')return null;
    }
    if(at!==body.length-1)return null;
  }
  return freeze({profile:TOOL_ATTRIBUTE_PROFILE,sourceInputsVerified:true,sourceSha256:hash(source),span:{start:actual.start,end:actual.end},attributes:condition.attributes,runtimeBehavior:false});
}
function originalHeader(item,condition){
  const tokens=item.tokens.filter(token=>token.type!=='comment');
  let at=tokens.findIndex(token=>token.start>=(condition.attributes.at(-1)?.span.end??item.start));
  if(tokens[at]?.text==='pub'){
    at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return false;}
  }
  while(['async','unsafe'].includes(tokens[at]?.text))at++;
  if(tokens[at]?.text==='const'&&tokens[at+1]?.text==='fn')at++;
  return ['fn','const','struct','enum'].includes(tokens[at]?.text);
}
function sourceModules(modules,profile){
  return modules.map(module=>{
    if(typeof module.file!=='string'||typeof module.source!=='string'||!Array.isArray(module.path))throw new TypeError('Tool attributes require original tracked modules');
    const allItems=sourceItems(module.source).filter(item=>!item.comment);
    return {file:module.file,source:module.source,path:[...module.path],allItems,items:allItems.filter(item=>itemConfiguration(item.tokens,profile).status!=='inactive'),compilationProfile:profile};
  });
}
export function createToolAttributeContext({modules,externalModules=new Map(),deriveContext=null,compilationProfile:input=null}={}){
  if(!Array.isArray(modules)||!(externalModules instanceof Map))throw new TypeError('Tool attributes require tracked modules and external namespace tables');
  const profile=compilationProfile(input),originals=sourceModules(modules,profile),candidates=new Map();
  for(const module of originals)for(const item of module.items){
    const condition=itemConfiguration(item.tokens.filter(token=>token.type!=='comment'),profile);
    if(condition.status!=='active'||!originalHeader(item,condition))continue;
    for(const attribute of condition.attributes){
      if(attribute.tokens.join('')!=='#[rustfmt::skip]')continue;
      candidates.set(id(module,item,attribute),freeze({source:module.file,module:[...module.path],sourceSha256:hash(module.source),itemSpan:{start:item.start,end:item.end},itemSha256:hash(module.source.slice(item.start,item.end)),attribute}));
    }
  }
  const byId=new Map(),diagnostics=[];
  if(candidates.size){
    // This provisional context never escapes this function. Project only the
    // candidate attributes, then independently resolve every actual binding.
    const projection=Object.freeze({});contexts.set(projection,{byId:candidates,provisional:true});
    let baseline;
    try{baseline=resolveModuleBindings({modules:originals,externalModules,deriveContext,toolContext:projection,compilationProfile:profile});}
    finally{contexts.delete(projection);}
    const scopes=new Map(baseline.scopes.map(scope=>[scopeKey(scope.path),scope]));
    for(const [key,candidate]of candidates){
      const ancestors=candidate.module.map((_,index)=>scopes.get(scopeKey(candidate.module.slice(0,index+1))));ancestors.unshift(scopes.get('crate'));
      if(ancestors.some(scope=>!scope||scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.bindings.some(binding=>binding.namespace==='type'&&binding.name==='rustfmt')||scope.unresolvedImports.some(entry=>entry.glob||entry.name==='rustfmt'))){
        diagnostics.push({source:candidate.source,span:candidate.attribute.span,message:'Original tool prefix lacks closed active tool-prelude ownership'});continue;
      }
      const evidence={schema:'original-tool-attribute-v1',profile:TOOL_ATTRIBUTE_PROFILE,sourceInputsVerified:true,...candidate,owner:{namespace:'tool-prelude',path:['rustfmt']},dimensions:{typeNamespaceComplete:true,valueNamespaceComplete:true,attributeMacroComplete:true,bangMacroComplete:true},runtimeBehavior:false};
      const certificate=freeze({...evidence,digest:hash(JSON.stringify(evidence))});certificates.set(certificate,candidate);byId.set(key,certificate);
    }
  }
  const evidence={schema:'original-tool-context-v1',compilationProfile:profile,certificates:[...byId.values()],diagnostics};
  const context=freeze({...evidence,digest:hash(JSON.stringify(evidence))});contexts.set(context,{byId,provisional:false});return context;
}
export const isToolAttributeContext=context=>!!context&&contexts.has(context);
export const isToolAttributeCertificate=certificate=>!!certificate&&certificates.has(certificate);
export function toolAttributeAt(context,module,item,attribute){
  const state=contexts.get(context);if(!state)throw new TypeError('Unsealed tool attribute context');
  const proof=state.byId.get(id(module,item,attribute));if(!proof)return null;
  if(proof.sourceSha256!==hash(module.source)||proof.itemSha256!==hash(module.source.slice(item.start,item.end))||JSON.stringify(proof.module)!==JSON.stringify(module.path))throw new TypeError('Tool attribute original source mismatch');
  return proof;
}
export function assertToolAttributeCertificate(certificate,source,offset){
  if(!isToolAttributeCertificate(certificate)||hash(source)!==certificate.itemSha256||offset!==certificate.itemSpan.start)throw new TypeError('Unsealed or mismatched tool attribute certificate');
  return certificate;
}
