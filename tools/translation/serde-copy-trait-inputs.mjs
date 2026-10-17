// Source namespace identity only. Neither Deserialize dispatch nor a caller's
// Copy/layout/Drop obligations are supplied by this independently sealed proof.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {isJsonMacroSourceProof,JSON_MACRO_SOURCE_PROFILE} from './json-macro-inputs.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalTopLevelMacroInvocations,originalMacroTrees} from './macro-token-trees.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const proofs=new WeakSet(),cache=new WeakMap();
// Additional members come from the same complete retained locked archive;
// they are not acquired from an unchecked URL or a public source-hash claim.
function coreMembers(dependencies){
 const pin=JSON_MACRO_SOURCE_PROFILE.packages.find(entry=>entry.name==='serde_core'),locked=dependencies.packages.find(entry=>entry.name==='serde_core');
 if(!pin||locked?.version!==pin.version||locked.archiveSha256!==pin.sha256)throw new TypeError('Serde trait identity requires its genuine locked serde_core owner');
 const archive=readFileSync(new URL('./source-profiles/json-macro/'+pin.archive,import.meta.url));
 if(archive.length!==pin.bytes||hash(archive)!==pin.sha256)throw new TypeError('Serde trait namespace archive changed');
 const tar=gunzipSync(archive,{maxOutputLength:8*1024*1024}),members=new Map();let longName=null;
 const field=(header,start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
 for(let at=0;at+512<=tar.length;){
  const header=tar.subarray(at,at+512);if(header.every(value=>value===0))break;
  const octal=field(header,124,12).trim();if(!/^[0-7]+$/u.test(octal))throw new TypeError('Serde trait archive size is unproved');
  const size=parseInt(octal,8),sum=header.reduce((total,value,index)=>total+(index>=148&&index<156?32:value),0);
  if(size>2*1024*1024||at+512+size>tar.length||sum!==parseInt(field(header,148,8).trim(),8))throw new TypeError('Serde trait archive header changed');
  let name=field(header,0,100),prefix=field(header,345,155);if(prefix)name=prefix+'/'+name;
  const kind=field(header,156,1),body=tar.subarray(at+512,at+512+size);
  if(kind==='L'){if(size>4096)throw new TypeError('Serde trait archive long path exceeds its bound');longName=body.toString('utf8').split('\0')[0];}
  else {if(longName){name=longName;longName=null;}if(name.startsWith('/')||name.split('/').includes('..'))throw new TypeError('Serde trait archive path escapes');if(kind==='0'||kind===''){if(members.has(name))throw new TypeError('Serde trait archive member is ambiguous');members.set(name,body);}else if(!['5','x','g'].includes(kind))throw new TypeError('Serde trait archive member kind is unproved');}
  at+=512+Math.ceil(size/512)*512;
 }
 if(longName)throw new TypeError('Serde trait archive long path was not consumed');
 return path=>{const bytes=members.get('serde_core-'+pin.version+'/'+path);if(!bytes)throw new TypeError('Serde trait original module member is absent');return {package:'serde_core',version:pin.version,path,source:bytes.toString('utf8'),sha256:hash(bytes),archiveSha256:pin.sha256};};
}
const plain=item=>item.tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
function literalDeclarationProjection(origin,owner){
 const definitions=sourceItems(origin.source).filter(item=>item.term==='macro_rules!'&&item.name==='crate_root');if(definitions.length!==1)throw new TypeError('Serde facade requires one actual original macro definition');
 const item=definitions[0],written=origin.source.slice(item.start,item.end),trees=originalMacroTrees(written),at=trees.findIndex(tree=>tree.text==='macro_rules'),body=trees[at+3];
 if(at<0||trees[at+1]?.text!=='!'||trees[at+2]?.text!=='crate_root'||body?.delimiter!=='{'||at+4!==trees.length)throw new TypeError('Serde facade literal definition delimiters changed');
 const arm=body.children,matcher=arm[0],transcriber=arm[2];
 if(matcher?.delimiter!=='('||matcher.children.length||arm[1]?.text!=='=>'||transcriber?.delimiter!=='{'||arm.length!==3&&!(arm.length===4&&arm[3].text===';'))throw new TypeError('Serde facade literal declaration projection requires its one original empty arm');
 const offset=item.start+transcriber.span.start+1,source=origin.source.slice(offset,item.start+transcriber.span.end-1),items=sourceItems(source),unresolvedNestedMacros=items.filter(item=>item.term==='macro_rules!').map(item=>({name:item.name,span:{start:offset+item.start,end:offset+item.end},sourceSha256:hash(source.slice(item.start,item.end)),expanded:false}));
 // The selected declarations have no interpolation. Unrelated nested macro
 // definitions remain opaque; this does not repair or certify full expansion.
 if(items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text.startsWith('$'))))throw new TypeError('Serde facade reexport depends on unresolved transcription');
 return {source,proof:{package:origin.package,path:origin.path,sourceSha256:origin.sha256,owner,definitionSpan:{start:item.start,end:item.end},definitionSha256:hash(written),transcriberSpan:{start:offset,end:item.start+transcriber.span.end-1},transcriberSha256:hash(source),unresolvedNestedMacros,namespaceDeclarationProjectionOnly:true,completeExpansion:false,expansionAuthority:false}};
}
function originalUse(source,written){const matches=sourceItems(source).filter(item=>item.term==='use'&&plain(item)===written);if(matches.length!==1)throw new TypeError('Serde trait original reexport differs');return {span:{start:matches[0].start,end:matches[0].end},source:source.slice(matches[0].start,matches[0].end)};}
function privateIncludeNamespaces(origin,version){
 const constants=sourceItems(origin.source).filter(item=>item.term==='const'&&item.name==='PRIVATE');if(constants.length!==1)throw new TypeError('Serde generated include has no unique original literal input');
 const item=constants[0],tokens=item.tokens.filter(token=>token.type!=='comment'),literal=tokens.find(token=>token.type==='string');
 if(!literal||tokens.slice(0,tokens.indexOf(literal)).map(token=>token.text).join('')!=='constPRIVATE:&str='||tokens.at(-1)?.text!==';')throw new TypeError('Serde generated include literal declaration changed');
 let source=literal.text.slice(1,-1);if(source.startsWith('\\\n'))source=source.slice(2);if(source.includes('\\')||!/^[\t\n\r\x20-\x7e]*$/u.test(source))throw new TypeError('Serde generated namespace literal has unproved escapes');
 const patch=version.split('.')[2];if(!/^[0-9]+$/u.test(patch??''))throw new TypeError('Serde generated module version is unproved');
 // Only namespace names are projected from the actual original literal. The
 // build's file write, Rustc invocation, private globs and methods stay opaque.
 const projected=source.replaceAll('$$',patch),items=sourceItems(projected),names=items.map(item=>item.name);
 if(!items.length||items.some(item=>!['mod','use'].includes(item.term))||names.includes('Deserialize')||items.some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='*')))throw new TypeError('Serde generated include may collide with the exact Deserialize binding');
 if(!origin.source.includes('let module = PRIVATE.replace("$$", &patch_version);')||!origin.source.includes('let patch_version = env::var("CARGO_PKG_VERSION_PATCH").unwrap();'))throw new TypeError('Serde original version-to-private-module namespace flow changed');
 return {package:origin.package,path:origin.path,sourceSha256:origin.sha256,literalSpan:{start:literal.start,end:literal.end},literalSha256:hash(literal.text),version,projectedSourceSha256:hash(projected),projectedRootNames:names,executionAuthority:false};
}
function exactBindingClosure(projected,generated){
 const items=sourceItems(projected.source),include=items.filter(item=>item.term==='opaque');
 if(include.length!==1||plain(include[0])!=='include!(concat!(env!("OUT_DIR"),"/private.rs"));')throw new TypeError('Serde exact type binding has an unresolved root include');
 if(items.some(item=>item.name==='Deserialize'&&item.term!=='use'||item.term.endsWith('!')&&!['macro_rules!','include!'].includes(item.term)))throw new TypeError('Serde exact type binding has an unresolved root collision');
 return {includeSpan:{start:include[0].start,end:include[0].end},includeSource:projected.source.slice(include[0].start,include[0].end),generated,completeNamespace:false};
}
function originalTrait(origin){
 const matches=sourceItems(origin.source).filter(item=>item.term==='trait'&&item.name==='Deserialize');if(matches.length!==1)throw new TypeError('Serde Deserialize requires one original trait declaration');
 const item=matches[0],tokens=item.tokens.filter(token=>token.type!=='comment'),start=tokens.findIndex(token=>token.text==='pub'),open=tokens.findIndex(token=>token.text==='{');
 if(start<0||open<0||tokens.slice(start,open).map(token=>token.text).join('')!=="pubtraitDeserialize<'de>:Sized"||tokens.slice(0,start).some(token=>['lang','unsafe','cfg'].includes(token.text)))throw new TypeError('Serde trait original identity or unconditional non-Drop header changed');
 return {package:origin.package,path:origin.path,sourceSha256:origin.sha256,span:{start:item.start,end:item.end},declarationSha256:hash(origin.source.slice(item.start,item.end)),header:origin.source.slice(tokens[start].start,tokens[open].start),executionAuthority:false};
}
export function originalSerdeCopyTraitInputs({deriveDependencies,jsonMacroDependencies}={}){
 if(!isDeriveDependencyProof(deriveDependencies)||!isJsonMacroSourceProof(jsonMacroDependencies)||deriveDependencies.manifestSha256!==jsonMacroDependencies.manifestSha256||deriveDependencies.lockSha256!==jsonMacroDependencies.lockSha256)throw new TypeError('Serde trait identity requires genuine locked derive and JSON source dependencies');
 let values=cache.get(deriveDependencies);if(!values){values=new WeakMap();cache.set(deriveDependencies,values);}if(values.has(jsonMacroDependencies))return values.get(jsonMacroDependencies);
 const facade=deriveDependencySource(deriveDependencies,'serde','src/lib.rs'),docs=deriveDependencySource(deriveDependencies,'serde','src/core/crate_root.rs'),localTrait=deriveDependencySource(deriveDependencies,'serde','src/core/de/mod.rs'),build=deriveDependencySource(deriveDependencies,'serde','build.rs'),core=coreMembers(jsonMacroDependencies),coreRoot=core('src/lib.rs'),coreMacro=core('src/crate_root.rs'),coreTrait=core('src/de/mod.rs'),coreBuild=core('build.rs');
 const normal=literalDeclarationProjection(facade,'serde'),doc=literalDeclarationProjection(docs,'serde'),central=literalDeclarationProjection(coreMacro,'serde_core');
 const normalUse=originalUse(normal.source,'pubuseserde_core::{de,forward_to_deserialize_any,ser,Deserialize,Deserializer,Serialize,Serializer,};');
 const docUse=originalUse(doc.source,'#[doc(inline)]pubusecrate::de::{Deserialize,Deserializer};'),coreUse=originalUse(central.source,'#[doc(inline)]pubusecrate::de::{Deserialize,Deserializer};');
 // Preserve both original conditional facade routes. Literal build-output
 // facts select only their documented module paths; this executes no build.
 const rootItems=sourceItems(facade.source),docOwner=rootItems.filter(item=>item.term==='mod'&&item.name==='crate_root'),normalOwner=rootItems.filter(item=>item.term==='macro_rules!'&&item.name==='crate_root');
 if(docOwner.length!==1||plain(docOwner[0])!=='#[cfg(docsrs)]#[macro_use]#[path="core/crate_root.rs"]modcrate_root;'||normalOwner.length!==1||!plain(normalOwner[0]).startsWith('#[cfg(not(docsrs))]macro_rules!crate_root'))throw new TypeError('Serde original conditional facade routes changed');
 for(const origin of [facade,coreRoot])if(originalTopLevelMacroInvocations(origin.source).filter(call=>call.path.join('::')==='crate_root'&&call.trees.length===0).length!==1)throw new TypeError('Serde facade requires its actual empty original macro invocation');
 if(!build.source.includes('println!("cargo:rustc-cfg=if_docsrs_then_no_serde_core");')||coreBuild.source.includes('println!("cargo:rustc-cfg=if_docsrs_then_no_serde_core"'))throw new TypeError('Serde documented module-path build output changed');
 const deDeclaration=source=>{const items=sourceItems(source).filter(item=>item.term==='mod'&&item.name==='de');if(items.length!==1||plain(items[0])!=='#[cfg_attr(all(docsrs,if_docsrs_then_no_serde_core),path="core/de/mod.rs")]pubmodde;')throw new TypeError('Serde literal de module path changed');return {source:source.slice(items[0].start,items[0].end),span:{start:items[0].start,end:items[0].end}};};
 const generated=privateIncludeNamespaces(build,facade.version),coreGenerated=privateIncludeNamespaces(coreBuild,coreTrait.version),closures={normal:exactBindingClosure(normal,generated),docs:exactBindingClosure(doc,generated),core:exactBindingClosure(central,coreGenerated)};
 const docModule=deDeclaration(doc.source),coreModule=deDeclaration(central.source),traits=[originalTrait(localTrait),originalTrait(coreTrait)];
 const proof=freeze({profile:'locked-original-serde-deserialize-non-drop-identity-v1',trait:['serde','Deserialize'],genericArguments:['lifetime'],deriveDependencyDigest:deriveDependencies.digest,jsonDependencyDigest:jsonMacroDependencies.digest,manifestSha256:deriveDependencies.manifestSha256,lockSha256:deriveDependencies.lockSha256,routes:[{condition:'not(docsrs)',macro:normal.proof,exactBindingClosure:closures.normal,reexport:normalUse,coreMacro:central.proof,coreExactBindingClosure:closures.core,coreReexport:coreUse,module:coreModule,trait:traits[1]},{condition:'docsrs',macro:doc.proof,exactBindingClosure:closures.docs,reexport:docUse,module:docModule,trait:traits[0]}],buildSources:[{package:'serde',path:build.path,sha256:build.sha256},{package:'serde_core',path:coreBuild.path,sha256:coreBuild.sha256}],namespaceAuthority:'exact non-Drop implementation classification only',deserializeExecution:false,copyAuthority:false,dropExecution:false,completeExternalNamespace:false,sourceInputs:[facade,docs,localTrait,build,coreRoot,coreMacro,coreTrait,coreBuild].map(({package:packageName,path,sha256,archiveSha256})=>({package:packageName,path,sha256,archiveSha256}))});
 proofs.add(proof);values.set(jsonMacroDependencies,proof);return proof;
}
export const isOriginalSerdeCopyTraitInputs=proof=>!!proof&&proofs.has(proof);
