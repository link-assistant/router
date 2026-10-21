// Complete source selections for an explicit library ABI, not a default issuer.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-inputs.mjs';
import {proveJsonMacroFeatures} from './json-macro-features.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalImplMemberItems} from './rust-member-boundaries.mjs';
import {originalUseDeclarationLeaves} from './module-bindings.mjs';
import {itemConfiguration,compilationProfile} from './cfg-profile.mjs';
import {captureOriginalCargoEdition,originalCargoEditionEvidence} from './cargo-edition-context.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('JSON edit library source: '+message);};
const significant=item=>item.tokens.filter(token=>token.type!=='comment');
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
function guard(){if(!originalDataFreezeIntrinsicsUnchanged())fail('original source DATA operations changed');}
function one(rows,label){if(rows.length!==1)fail('one exact original '+label+' required');return rows[0];}
function witness(input,item){return {path:input.path,sourceSha256:input.sha256,span:{start:item.start,end:item.end},source:input.source.slice(item.start,item.end)};}
function freshSources(directory,manifestName,manifestSha,paths){
 const base=new URL(directory,import.meta.url),raw=readFileSync(new URL(manifestName,base));guard();
 if(hash(raw)!==manifestSha)fail('retained standard profile changed');
 const manifest=JSON.parse(raw);guard();
 return paths.map(path=>{
  const pin=one(manifest.sources.filter(row=>(row.rustPath??row.path)===path),'registered source '+path),packed=readFileSync(new URL(pin.file,base));guard();
  const raw=pin.encoding==='complete-original-utf8'?packed:gunzipSync(packed,{maxOutputLength:200000});guard();
  if(pin.compressedBytes!==undefined&&(packed.length!==pin.compressedBytes||hash(packed)!==pin.compressedSha256)||raw.length!==pin.bytes||hash(raw)!==pin.sha256||createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex')!==pin.gitBlobSha)fail('complete standard source changed');
  const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);guard();
  return {path,source,sha256:pin.sha256,bytes:raw.length,profileSha256:manifestSha};
 });
}
function contents(input,item){
 const tokens=significant(item),open=tokens.find(token=>token.text==='{'),close=tokens.at(-1);
 if(!open||close?.text!=='}')fail('complete original item delimiters required');
 return {start:open.end,end:close.start};
}
function implHeader(item){const tokens=significant(item),at=tokens.findIndex(token=>token.text==='impl'),end=tokens.findIndex((token,index)=>index>at&&token.text==='{');return words(tokens.slice(at,end));}
function method(input,header,name,profile){
 const implementations=sourceItems(input.source).filter(item=>item.term==='impl'&&implHeader(item)===header&&itemConfiguration(item.tokens,profile).status==='active');
 const selected=one(implementations.flatMap(implementation=>originalImplMemberItems(input.source,contents(input,implementation)).filter(member=>member.term==='fn'&&member.name===name&&itemConfiguration(member.tokens,profile).status==='active').map(member=>({implementation,member}))),header+'::'+name);
 const tokens=significant(selected.member),at=tokens.findIndex(token=>token.text==='fn'),open=tokens.findIndex((token,index)=>index>at&&token.text==='{');
 if(at<0||open<0||tokens.at(-1)?.text!=='}')fail('complete original method signature/body required');
 return {...witness(input,selected.member),implementation:witness(input,selected.implementation),signature:words(tokens.slice(at,open)),body:words(tokens.slice(open))};
}
function exported(input,target,name,profile,publicOnly=true){
 const candidates=sourceItems(input.source).filter(item=>item.term==='use'&&itemConfiguration(item.tokens,profile).status==='active'&&(!publicOnly||significant(item).some(token=>token.text==='pub'))).flatMap(item=>originalUseDeclarationLeaves(item).filter(leaf=>!leaf.glob&&!leaf.validateOnly&&leaf.name===name&&leaf.segments.join('::')===target).map(leaf=>({item,leaf})));
 const selected=one(candidates,'public export '+name);return {...witness(input,selected.item),leaf:copyMetadata(selected.leaf)};
}
function editionRoute(input,target,editionName){
 const edition=one(sourceItems(input.source).filter(item=>item.term==='mod'&&item.name==='rust_'+editionName),'Rust'+editionName+' edition prelude'),span=contents(input,edition),items=sourceItems(input.source.slice(span.start,span.end)).filter(item=>!item.comment);
 if(items.some(item=>item.term!=='use'||words(item.tokens).includes('#[cfg')))fail('edition prelude alternatives need a separate proof');
 const matches=items.flatMap(item=>originalUseDeclarationLeaves(item).filter(leaf=>leaf.glob&&leaf.segments.join('::')===target).map(leaf=>({item,leaf})));
 const selected=one(matches,'edition route '+target);return {edition:witness(input,edition),span:{start:span.start+selected.item.start,end:span.start+selected.item.end},source:input.source.slice(span.start+selected.item.start,span.start+selected.item.end),leaf:copyMetadata(selected.leaf)};
}
function snapshot(input){
 const cst=transportConcreteSyntaxSource(input.source,{language:'Rust'});
 if(transportConcreteSyntaxMeta(cst.meta).source!==input.source)fail('complete original source CST differs');
 return {...input,concreteMeta:cst.meta};
}

export function originalJsonRemoveLibrarySources(input){
 guard();const caller=copyMetadata(input);
 if(!caller||Object.keys(caller).sort().join(',')!=='lock,manifest'||typeof caller.manifest!=='string'||typeof caller.lock!=='string')fail('exact original Cargo manifest/lock inputs required');
 // Caller flags, copied feature objects and package spellings are not issuers.
 const dependencies=loadJsonMacroSourceProof(caller),features=proveJsonMacroFeatures(dependencies),profile=compilationProfile({flags:{test:false},values:{feature:features.features},closedKeys:['feature']});guard();
 const inputs=['src/lib.rs','src/value/mod.rs','src/map.rs'].map(path=>jsonMacroOriginalSource(dependencies,'serde_json',path)),[root,value,map]=inputs;
 const declaration=one(sourceItems(value.source).filter(item=>item.term==='enum'&&item.name==='Value'&&itemConfiguration(item.tokens,profile).status==='active'),'Value declaration');
 if(!words(declaration.tokens).includes('Object(Map<String,Value>),'))fail('actual Value Object payload differs');
 const mapDeclaration=one(sourceItems(map.source).filter(item=>item.term==='struct'&&item.name==='Map'&&itemConfiguration(item.tokens,profile).status==='active'),'Map declaration');
 if(!words(mapDeclaration.tokens).endsWith('pubstructMap<K,V>{map:MapImpl<K,V>,}'))fail('actual private Map storage differs');
 const alternatives=sourceItems(map.source).filter(item=>item.term==='type'&&item.name==='MapImpl');
 if(alternatives.length!==2||!alternatives.some(item=>words(item.tokens)==='#[cfg(not(feature="preserve_order"))]typeMapImpl<K,V>=BTreeMap<K,V>;')||!alternatives.some(item=>words(item.tokens)==='#[cfg(feature="preserve_order")]typeMapImpl<K,V>=IndexMap<K,V>;'))fail('complete Map representation alternatives differ');
 const active=one(alternatives.filter(item=>itemConfiguration(item.tokens,profile).status==='active'),'feature-selected Map representation');
 if(!words(active.tokens).endsWith('=BTreeMap<K,V>;'))fail('only the genuine default Map representation is modeled');
 const asObject=method(value,'implValue','as_object_mut',profile),remove=method(map,'implMap<String,Value>','remove',profile);
 if(asObject.signature!=='fnas_object_mut(&mutself)->Option<&mutMap<String,Value>>'||asObject.body!=='{matchself{Value::Object(map)=>Some(map),_=>None,}}')fail('actual mutable Object projection differs');
 if(remove.signature!=='fnremove<Q>(&mutself,key:&Q)->Option<Value>whereString:Borrow<Q>,Q:?Sized+Ord+Eq+Hash,'||remove.body!=='{#[cfg(feature="preserve_order")]returnself.swap_remove(key);#[cfg(not(feature="preserve_order"))]returnself.map.remove(key);}')fail('actual complete Map remove forwarding differs');
 const routes=[exported(root,'crate::value::Value','Value',profile),exported(root,'crate::value::Map','Map',profile),exported(value,'crate::map::Map','Map',profile),exported(map,'crate::value::Value','Value',profile,false)];
 const standard=freshSources('./source-profiles/primitive-try-from/','manifest.json','d69968bad587c3c42e6536d31356abab2ebee03f46d6e215a46bb6824edd4c51',['library/core/src/prelude/mod.rs','library/core/src/prelude/v1.rs','library/std/src/prelude/mod.rs','library/std/src/prelude/v1.rs']);
 const option=one(freshSources('./source-profiles/standard-method-bodies/','manifest.json','ec9578c7548c68f775837584b7f7663a8e35f534a8a45db97c2f2f62bcf3cf52',['library/core/src/option.rs']),'Option source'),optionDeclaration=one(sourceItems(option.source).filter(item=>item.term==='enum'&&item.name==='Option'),'Option declaration');
 const optionText=words(optionDeclaration.tokens);
 if(!optionText.includes('#[lang="Option"]')||!optionText.includes('pubenumOption<T>{')||!optionText.includes('#[lang="Some"]')||!optionText.includes('Some(#[stable(feature="rust1",since="1.0.0")]T),'))fail('actual Option Some lang constructor differs');
 const packageManifest=jsonMacroOriginalSource(dependencies,'serde_json','Cargo.toml'),libraryEdition=originalCargoEditionEvidence(captureOriginalCargoEdition(packageManifest.source,{sourcePath:'serde_json-1.0.151/Cargo.toml'})),callerEdition=originalCargoEditionEvidence(captureOriginalCargoEdition(caller.manifest,{sourcePath:'provided-package/Cargo.toml'}));if(libraryEdition?.status!=='explicit-package-edition'||libraryEdition.edition!=='2021'||callerEdition?.status!=='explicit-package-edition'||callerEdition.edition!=='2024')fail('actual original library/caller editions required');const [coreEdition,coreV1,stdEdition,stdV1]=standard,prelude={libraryCoreEdition:editionRoute(coreEdition,'super::v1',libraryEdition.edition),libraryStdEdition:editionRoute(stdEdition,'core::prelude::rust_'+libraryEdition.edition,libraryEdition.edition),callerCoreEdition:editionRoute(coreEdition,'super::v1',callerEdition.edition),callerStdEdition:editionRoute(stdEdition,'core::prelude::rust_'+callerEdition.edition,callerEdition.edition),coreSome:exported(coreV1,'crate::option::Option::Some','Some',null),stdSome:exported(stdV1,'crate::option::Option::Some','Some',null),declaration:witness(option,optionDeclaration)};
 // Freshly reissue all external archives/features after structural extraction.
 const snapshots=[...inputs,...standard,option].map(snapshot),after=loadJsonMacroSourceProof(caller),afterFeatures=proveJsonMacroFeatures(after);guard();
 const standardAfter=freshSources('./source-profiles/primitive-try-from/','manifest.json','d69968bad587c3c42e6536d31356abab2ebee03f46d6e215a46bb6824edd4c51',standard.map(row=>row.path)),optionAfter=one(freshSources('./source-profiles/standard-method-bodies/','manifest.json','ec9578c7548c68f775837584b7f7663a8e35f534a8a45db97c2f2f62bcf3cf52',[option.path]),'fresh Option source');if(standardAfter.some((row,index)=>row.source!==standard[index].source)||optionAfter.source!==option.source)fail('fresh complete standard source join differs');
 if(after.digest!==dependencies.digest||JSON.stringify(afterFeatures)!==JSON.stringify(features)||inputs.some(source=>jsonMacroOriginalSource(after,'serde_json',source.path).source!==source.source))fail('fresh package/feature source join differs');
 return {schema:'source-json-remove-library-owners-candidate-v1',cargo:{manifest:caller.manifest,lock:caller.lock,manifestSha256:hash(caller.manifest),lockSha256:hash(caller.lock)},dependencyProof:copyMetadata(dependencies),featureProof:copyMetadata(features),packageManifest:copyMetadata(packageManifest),editions:{library:copyMetadata(libraryEdition),caller:copyMetadata(callerEdition)},sources:snapshots,declaration:witness(value,declaration),mapDeclaration:witness(map,mapDeclaration),mapAlternatives:alternatives.map(item=>({...witness(map,item),condition:itemConfiguration(item.tokens,profile).status})),selectedMapRepresentation:witness(map,active),methods:{asObject,remove},publicRoutes:routes,prelude,libraryAbi:'owned-json-edit-slot-remove-unit-v1',semanticAuthority:false,applicationAdmission:false,wholeNamespaceClosure:false,untranslatedNativeBoundary:['alloc::collections::BTreeMap<String,serde_json::Value>::remove::<str>','native Borrow/Ord/Eq/Hash and allocation/drop internals'],remainingJoins:['real application Cargo unit/flags and whole parent producer closure','caller unique-root/reborrow/live-loan and Rust/JS call-site association','native library ABI behavioral and strict-target receiving qualification']};
}
