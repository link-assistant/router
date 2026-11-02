// Fixed original Rust source selections. Public descriptors never accept an
// arbitrary host/type owner; fresh source receipts retain all complete inputs.
import {lstatSync} from 'node:fs';
import {types} from 'node:util';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {originalExternAliasCandidate,originalPublicModuleCandidate} from './namespace-census.mjs';
import {itemConfiguration,compilationProfile} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const initialSourceIngress=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const sourceJSON=initialSourceIngress?Object.getOwnPropertyDescriptor(globalThis,'JSON')?.value:null,sourceParse=sourceJSON?Object.getOwnPropertyDescriptor(sourceJSON,'parse'):null;
const sourceInitiallyQualified=!!(sourceParse&&Object.hasOwn(sourceParse,'value')&&originalCapturedFunctionSource(sourceParse.value)==='function parse() { [native code] }');
export function requireOrderedMapSourceDataIngress(){
 if(!sourceInitiallyQualified||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||Object.getOwnPropertyDescriptor(globalThis,'JSON')?.value!==sourceJSON)throw TypeError('Ordered map original source DATA ingress changed');const now=Object.getOwnPropertyDescriptor(sourceJSON,'parse');if(!now||!Object.hasOwn(now,'value')||now.value!==sourceParse.value||now.writable!==sourceParse.writable||now.enumerable!==sourceParse.enumerable||now.configurable!==sourceParse.configurable)throw TypeError('Ordered map original source JSON parser changed');
}
export function parseOrderedMapSourceData(text){requireOrderedMapSourceDataIngress();if(typeof text!=='string'||Buffer.byteLength(text)>4194304)throw TypeError('Bounded complete map source JSON required');const value=sourceParse.value(text);requireOrderedMapSourceDataIngress();return value;}
// Equality never invokes toJSON, accessors or caller serialization machinery.
export function sameOrderedMapSourceData(actual,expected){
 requireOrderedMapSourceDataIngress();let cells=300000,bytes=0;
 const compare=(left,right,depth=0)=>{if(--cells<0||depth>256)throw TypeError('Bounded original map source DATA comparison required');if(left===null||typeof left!=='object'){if(['function','symbol'].includes(typeof left)||['function','symbol'].includes(typeof right))return false;if(typeof left==='string'&&(bytes+=Buffer.byteLength(left))>16777216)throw TypeError('Original map source DATA byte budget');return left===right?(left!==0||1/left===1/right):(left!==left&&right!==right);}if(!right||typeof right!=='object'||types.isProxy(left)||types.isProxy(right)||Array.isArray(left)!==Array.isArray(right))return false;for(const value of [left,right]){const parent=Object.getPrototypeOf(value);if(parent!==null&&parent!==Object.prototype&&parent!==Array.prototype)return false;}const keys=Reflect.ownKeys(left),other=Reflect.ownKeys(right);if(keys.length!==other.length)return false;for(let at=0;at<keys.length;at++){const key=keys[at];if(typeof key!=='string'||key!==other[at])return false;const a=Object.getOwnPropertyDescriptor(left,key),b=Object.getOwnPropertyDescriptor(right,key);if(!a||!b||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||!compare(a.value,b.value,depth+1))return false;}return true;};
 const result=compare(actual,expected);requireOrderedMapSourceDataIngress();return result;
}
const base=new URL('./source-profiles/ordered-text-map-callers-20261102-standard/',import.meta.url),manifest=new URL('ordered-text-map-callers-20261102-standard.json',base);
const selectedSourceRoot=fileURLToPath(new URL('./source-profiles/',import.meta.url)),stableDirectory=(left,right)=>['dev','ino','mode','uid','gid'].every(key=>left[key]===right[key]);
const sameDirectory=(row,next)=>(row.path===selectedSourceRoot.slice(0,-1)||row.path.startsWith(selectedSourceRoot))?sameCompactPhysicalSourceStamp(row.stat,next):stableDirectory(row.stat,next);
// Explicit supported standard SOURCE ABI; this is never an assertion about
// unknown receiving compiler flags or an invocation's custom std replacement.
const standardSourceProfile=sourceInitiallyQualified?compilationProfile({flags:{test:false,no_global_oom_handling:false,rustfmt:false}}):null;
const manifestPin='f043032d02050b015812e595f3890c9be39addd885f3942b5cea3e3f68036aa2';
const hash=value=>createHash('sha256').update(value).digest('hex'),issued=new WeakMap(),factOrigins=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const field of Object.values(value))freeze(field);Object.freeze(value);}return value;};
const fail=message=>{throw TypeError('Original ordered-map standard source: '+message);};
const one=(rows,name)=>{if(rows.length!==1)fail('one complete original '+name+' required');return rows[0];};
const tokens=item=>item.tokens.filter(token=>token.type!=='comment'),words=input=>input.map(token=>token.text).join('');
function protect(custody,run){
 if(custody.failed)throw custody.primary;
 try{requireOrderedMapSourceDataIngress();const value=withSourceInputValidation(run);requireOrderedMapSourceDataIngress();return value;}catch(error){if(!custody.failed){custody.failed=true;custody.primary=error;}throw error;}
}
function reclose(custody){
 let failed=false,primary;const check=run=>{try{run();}catch(error){if(!failed){failed=true;primary=error;}}};check(requireOrderedMapSourceDataIngress);
 for(const row of custody.files)check(()=>{if(!readCompactSparsePhysicalFile(row).equals(row.raw))fail('whole original source custody bytes changed');});
 for(const row of custody.directories)check(()=>{const current=lstatSync(row.path,{bigint:true});if(!current.isDirectory()||current.isSymbolicLink()||!sameDirectory(row,current))fail('original source ancestor identity changed');});
 if(failed){if(!custody.failed){custody.failed=true;custody.primary=primary;}throw primary;}
 if(custody.failed)throw custody.primary;
}
function regular(url,max,custody){
 return protect(custody,()=>withCompleteSourceClosingFence(()=>{
  const path=fileURLToPath(url),ancestors=[];let parent=dirname(path);
  while(true){ancestors.push(parent);const next=dirname(parent);if(next===parent)break;parent=next;if(ancestors.length>128)fail('source ancestor bound');}
  for(const name of ancestors.reverse()){const stat=lstatSync(name,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary original source ancestor required');const previous=custody.directories.find(row=>row.path===name);if(previous){if(!sameDirectory(previous,stat))fail('source ancestor replaced');}else custody.directories.push({path:name,stat});}
  const stat=lstatSync(path,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.size<0n||stat.size>BigInt(max))fail('bounded regular source input required');
  const row={path,stat},bytes=readCompactSparsePhysicalFile(row);row.raw=bytes;custody.files.push(row);if(custody.files.length>15||custody.directories.length>256)fail('source custody census bound');return bytes;
 },[()=>reclose(custody)]));
}
function inputs(custody){
 const bytes=regular(manifest,32768,custody);if(hash(bytes)!==manifestPin)fail('fixed source profile changed');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);requireOrderedMapSourceDataIngress();if(hash(text)!==manifestPin)fail('complete decoded source profile differs');const profile=parseOrderedMapSourceData(text);
 if(profile.schema!=='ordered-text-map-original-standard-inputs-v1'||profile.rust!=='1.89.0'||profile.revision!=='29483883eed69d5fb4db01964cdf2af4d86e9cb2'||profile.sources.length!==14)fail('complete immutable profile required');
 let total=0;const paths=new Set(),sources=profile.sources.map(row=>{
  if(paths.has(row.path))fail('duplicate source input');paths.add(row.path);const url=new URL(row.archive,base);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('source archive escapes retained originals');
  const packed=regular(url,131072,custody);if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('original packed bytes changed');
  const raw=gunzipSync(packed,{maxOutputLength:160000});total+=raw.length;if(raw.length!==row.bytes||hash(raw)!==row.sha256||total>524288)fail('complete original source bytes/budget differ');
  const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);if(hash(source)!==row.sha256)fail('source scalar decoding differs');return {...row,source};
 });
 return {bytes,profile,sources,custody};
}
const witness=(source,item)=>({path:source.path,sourceSha256:source.sha256,span:{start:item.start,end:item.end},original:source.source.slice(item.start,item.end)});
function item(source,term,name){return one(sourceItems(source.source).filter(row=>row.term===term&&row.name===name),name);}
function body(source,owner){const ts=tokens(owner),open=ts.find(token=>token.text==='{'),end=ts.at(-1);if(!open||end?.text!=='}')fail('complete original module body required');return {source:source.source.slice(open.end,end.start),offset:open.end};}
function explicit(source,path,name){
 const candidates=[];
 for(const owner of sourceItems(source.source).filter(row=>row.term==='use')){
  const ts=tokens(owner),condition=itemConfiguration(ts,standardSourceProfile),begin=ts.findIndex(token=>token.start>=(condition.attributes.at(-1)?.span.end??owner.start));
  if(condition.status!=='active'||ts[begin]?.text!=='pub'||ts[begin+1]?.text!=='use')continue;
  let at=begin+2,cells=0;const leaves=[],take=text=>ts[at]?.text===text?ts[at++]:null;
  const ident=()=>{const token=ts[at++];if(token?.type!=='ident'||!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text))throw Error('original export segment');return token.text;};
  const tree=(prefix,depth)=>{if(depth>32||++cells>256)throw Error('original export bound');if(take('{')){while(ts[at]?.text!=='}'){tree(prefix,depth+1);if(!take(','))break;}if(!take('}'))throw Error('original export group');return;}const segment=ident(),route=[...prefix,segment];if(take('::')){tree(route,depth+1);return;}const alias=take('as')?ident():null;leaves.push({path:segment==='self'?prefix:route,name:alias??(segment==='self'?prefix.at(-1):segment)});};
  try{tree([],0);if(!take(';')||at!==ts.length)continue;}catch{continue;}
  for(const leaf of leaves)if(leaf.path.join('::')===path&&leaf.name===name)candidates.push({...witness(source,owner),...leaf,configuration:condition,supportedSourceProfile:standardSourceProfile});
 }
 return one(candidates,'explicit '+path+' export');
}
function spelling(source,owner,expected){const ts=tokens(owner),condition=itemConfiguration(ts,standardSourceProfile),at=ts.findIndex(token=>token.start>=(condition.attributes.at(-1)?.span.end??owner.start));if(condition.status!=='active'||words(ts.slice(at))!==expected)fail('original declaration syntax differs');return {...witness(source,owner),configuration:condition,supportedSourceProfile:standardSourceProfile};}
function glob(source,owner,path){
 const inner=body(source,owner),rows=sourceItems(inner.source).filter(row=>row.term==='use');
 const selected=one(rows.filter(row=>{const ts=tokens(row),at=ts.findIndex(token=>token.text==='pub');return words(ts.slice(at))==='pubuse'+path+'::*;';}),'selected original glob '+path);
 const ts=tokens(selected),at=ts.findIndex(token=>token.text==='pub');if(ts.slice(0,at).some(token=>['cfg','cfg_attr'].includes(token.text)))fail('conditional glob requires original selection');
 return {path:source.path,sourceSha256:source.sha256,span:{start:inner.offset+selected.start,end:inner.offset+selected.end},original:inner.source.slice(selected.start,selected.end),selectedOnly:true,namespaceComplete:false};
}
function declaration(source,name){const owner=item(source,'struct',name),ts=tokens(owner),at=ts.findIndex(token=>token.text==='pub');if(at<0||ts[at+1]?.text!=='struct'||ts[at+2]?.text!==name||!ts.some(token=>token.text==='stable'))fail('stable public struct declaration required');return {...witness(source,owner),name,kind:'struct',namespaceComplete:false,layoutAuthority:false};}
function implementations(source,headers){
 return headers.map(header=>{const selected=one(sourceItems(source.source).filter(row=>{if(row.term!=='impl')return false;const ts=tokens(row),start=ts.findIndex(token=>token.text==='impl'),open=ts.findIndex((token,index)=>index>start&&token.text==='{');return words(ts.slice(start,open))===header;}),'original associated impl '+header);return {...witness(source,selected),header,configuration:itemConfiguration(selected.tokens,standardSourceProfile),genericObligationsSolved:false,generatedMethodDispatchAuthority:false};});
}
function prelude(source){
 const owner=item(source,'mod','rust_2024'),inner=body(source,owner),rows=sourceItems(inner.source).filter(row=>!row.comment);if(rows.some(row=>row.term!=='use'))fail('edition prelude unknown producer');
 return {module:witness(source,owner),v1:glob(source,owner,'super::v1'),...(source.path.startsWith('library/std/')?{core2024:glob(source,owner,'core::prelude::rust_2024')}:{})};
}
function injection(source){
 const owner=item(source,'fn','inject'),text=words(tokens(owner));
 for(const required of ['attr::contains_name(pre_configured_attrs,sym::no_core)','return0;','attr::contains_name(pre_configured_attrs,sym::no_std)','sym::core','sym::std','ast::ItemKind::ExternCrate(None,Ident::new(name,ident_span))','AstPass::StdImports','Edition2024=>sym::rust_2024','thin_vec![cx.attr_word(sym::prelude_import,span)]','kind:ast::UseTreeKind::Glob','krate.items.insert(0,use_item);'])if(!text.includes(required))fail('complete original standard injection branch differs');
 return {...witness(source,owner),edition:'2024',ordinaryStandardBranch:'std',externBindingGenerated:true,preludeAttributeGenerated:true,customCompilerInvocationProved:false};
}
export function originalOrderedTextMapStandardSources(){return withSourceFailureOperation(()=>captureStandardSources());}
function captureStandardSources(){
 const custody={files:[],directories:[],failed:false,primary:undefined},captured=protect(custody,()=>withCompleteSourceClosingFence(()=>inputs(custody),[()=>reclose(custody)])),source=path=>one(captured.sources.filter(row=>row.path===path),path),close=()=>reclose(custody);
 return protect(custody,()=>withCompleteSourceClosingFence(()=>createRulePipeline([{phase:'language',rules:[{id:'ordered-map:original-selected-standard-source-and-lossless-CST',apply:()=>{
  const snapshots=captured.sources.map(row=>{if(!row.path.endsWith('.rs'))return {...row,concreteMeta:null,privateOriginalCargoParserRequired:true};const concrete=transportConcreteSyntaxSource(row.source,{language:'Rust'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('serialized/reparsed full standard CST differs');return {...row,concreteMeta:concrete.meta};});
  const std=source('library/std/src/lib.rs'),alloc=source('library/alloc/src/lib.rs'),stdCollections=source('library/std/src/collections/mod.rs'),allocCollections=source('library/alloc/src/collections/mod.rs'),btree=source('library/alloc/src/collections/btree/mod.rs'),map=source('library/alloc/src/collections/btree/map.rs'),string=source('library/alloc/src/string.rs');
  const alias=originalExternAliasCandidate(std.source,'alloc','alloc_crate');if(!alias)fail('actual alloc external alias required');
  const collections=originalPublicModuleCandidate(std.source,'collections'),allocModule=originalPublicModuleCandidate(alloc.source,'collections'),stringModule=originalPublicModuleCandidate(alloc.source,'string');if(!collections||!allocModule||!stringModule)fail('actual complete external module declarations required');
  const privateBtree=spelling(allocCollections,item(allocCollections,'mod','btree'),'modbtree;'),privateMap=spelling(btree,item(btree,'mod','map'),'pub(super)modmap;'),mapModule=item(allocCollections,'mod','btree_map');
  const mapRoute={alias,stdModule:collections,stdExport:explicit(stdCollections,'alloc_crate::collections::BTreeMap','BTreeMap'),allocModule,allocExport:explicit(allocCollections,'btree_map::BTreeMap','BTreeMap'),selectedGlob:glob(allocCollections,mapModule,'super::btree::map'),privateBtree,privateMap,declaration:declaration(map,'BTreeMap'),declarationConfigurationAuthority:false,unknownGeneratedSiblingNamesAdmitted:false};
  const stringRoute={alias,stdExport:explicit(std,'alloc_crate::string','string'),allocModule:stringModule,declaration:declaration(string,'String')};
  const vec=source('library/alloc/src/vec/mod.rs'),vecRoute={alias,stdExport:explicit(std,'alloc_crate::vec','vec'),allocModule:spelling(alloc,item(alloc,'mod','vec'),'pubmodvec;'),declaration:declaration(vec,'Vec'),declarationConfigurationAuthority:false};
  const associatedTraitSources={map:implementations(map,['impl<K:Clone,V:Clone,A:Allocator+Clone>CloneforBTreeMap<K,V,A>','impl<K,V>DefaultforBTreeMap<K,V>','impl<K:PartialEq,V:PartialEq,A:Allocator+Clone>PartialEqforBTreeMap<K,V,A>','impl<K:Eq,V:Eq,A:Allocator+Clone>EqforBTreeMap<K,V,A>','impl<K:Debug,V:Debug,A:Allocator+Clone>DebugforBTreeMap<K,V,A>']),String:implementations(string,['implCloneforString','implDefaultforString','implfmt::DebugforString']),StringComparisonDerives:declaration(string,'String'),traitSelectionAuthority:false,allocatorAndOrdBorrowJoinsClosed:false};
  const stdPrelude=source('library/std/src/prelude/mod.rs'),stdV1=source('library/std/src/prelude/v1.rs'),corePrelude=source('library/core/src/prelude/mod.rs');
  return {snapshots,mapRoute,stringRoute,vecRoute,associatedTraitSources,prelude:{std2024:prelude(stdPrelude),core2024:prelude(corePrelude),String:explicit(stdV1,'crate::string::String','String'),Vec:explicit(stdV1,'crate::vec::Vec','Vec'),injection:injection(source('compiler/rustc_builtin_macros/src/standard_library_imports.rs'))}};
 }}]},{phase:'repository',rules:[{id:'router:original-registered-ordered-map-standard-namespace-candidates',apply:value=>{
  const fact=(name,target,route)=>{const evidence={schema:'original-ordered-map-standard-namespace-v1',name,target,kind:'struct',namespace:'type',route,profile:captured.profile,sourceProfileSha256:manifestPin,sourceInputsVerified:true,namespaceComplete:false,layoutAuthority:false,constructorAuthority:false,globAuthority:false,runtimeAuthority:false};// A stable label only; private origins and full original routes issue ownership.
 return {...evidence,digest:hash(manifestPin+'::'+name+'::'+target.join('::'))};};
  const valueWithFacts=freeze({schema:'original-ordered-map-standard-sources-v1',profile:captured.profile,profileSha256:manifestPin,...value,facts:[fact('BTreeMap',['std','collections','BTreeMap'],value.mapRoute),fact('String',['std','string','String'],value.stringRoute),fact('Vec',['std','vec','Vec'],value.vecRoute)],supportedStandardSourceProfile:standardSourceProfile,nativeUnitAuthority:false,traitDispatchAuthority:false,runtimeParity:false});issued.set(valueWithFacts,{captured});for(const fact of valueWithFacts.facts)factOrigins.set(fact,valueWithFacts);return valueWithFacts;
 }}]}]).run(null).value,[close]));
}
export function requireOriginalOrderedTextMapStandardSources(value){
 const record=issued.get(value);if(!record)fail('copied/foreign original source receipt');const custody=record.captured.custody;return protect(custody,()=>withCompleteSourceClosingFence(()=>{reclose(custody);const fresh=originalOrderedTextMapStandardSources();if(!sameOrderedMapSourceData(fresh,value))fail('fresh complete original source receipt differs');return value;},[()=>reclose(custody)]));
}

export function requireOriginalOrderedMapStandardNamespaceFact(fact){const source=factOrigins.get(fact);if(!source)fail('foreign registered source candidate');requireOriginalOrderedTextMapStandardSources(source);return fact;}
