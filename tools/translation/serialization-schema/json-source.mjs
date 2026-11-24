// Registered external source identity and bounded direction contracts. The
// selected trait bodies are source evidence, not per-owner JS body templates.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { sourceItems } from '../rust-structure.mjs';
import { itemConfiguration, compilationProfile } from '../cfg-profile.mjs';
import { loadJsonMacroSourceProof, isJsonMacroSourceProof } from '../json-macro-sources.mjs';
import { proveJsonMacroFeatures, isJsonMacroFeatureProof } from '../json-macro-features.mjs';
import { actualJsonCapabilityProfile, isJsonCapabilityProfile } from '../json-capabilities.mjs';
import { isDeriveDependencyProof, deriveDependencySource } from '../derive-dependencies.mjs';
import { HostRustParser, HostChecker } from '../extensions/host-contracts.mjs';
import { tokenizeRust } from '../extensions/lexical.mjs';
import { JSON_DATA } from '../extensions/json-contracts.mjs';
import { STANDARD_BODY_SOURCE_PROFILE } from '../extensions/standard-body-source.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const frozen=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};
const encoded=readFileSync(new URL('./json-source-profile.json',import.meta.url));
if(hash(encoded)!=='147deb834d920e56f8df48454e359488afb4526e729df8b19b92ad9e9b7d9ec5')throw new TypeError('JSON schema source profile differs from its audited pins');
const profile=frozen(JSON.parse(encoded)),contexts=new WeakMap();let original;
function sources() {
  if(original)return original;
  const archive=readFileSync(new URL(profile.archive,import.meta.url));
  if(archive.length!==profile.archiveBytes||hash(archive)!==profile.archiveSha256)throw new TypeError('JSON source archive differs from its actual locked package');
  const tar=gunzipSync(archive,{maxOutputLength:8*1024*1024}),members=new Map();let longName=null;
  const text=(bytes,start,count)=>bytes.subarray(start,start+count).toString('utf8').split('\0')[0];
  for(let at=0;at+512<=tar.length;) {
    const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const octal=text(header,124,12).trim();if(!/^[0-7]+$/.test(octal))throw new TypeError('JSON archive member size is unproved');
    const size=parseInt(octal,8),sum=header.reduce((total,byte,index)=>total+(index>=148&&index<156?32:byte),0);
    if(!Number.isSafeInteger(size)||size>2*1024*1024||at+512+size>tar.length||sum!==parseInt(text(header,148,8).trim(),8))throw new TypeError('JSON archive member exceeds checked bytes/checksum');
    const body=tar.subarray(at+512,at+512+size),kind=text(header,156,1);let name=text(header,0,100),prefix=text(header,345,155);if(prefix)name=prefix+'/'+name;
    if(kind==='L'){if(size>4096)throw new TypeError('JSON archive name exceeds its bound');longName=body.toString('utf8').split('\0')[0];}
    else {
      if(longName){name=longName;longName=null;}
      if(name.startsWith('/')||name.split('/').includes('..'))throw new TypeError('JSON source member escapes its archive');
      if(kind==='0'||kind===''){if(members.has(name))throw new TypeError('Duplicate JSON source member');members.set(name,body);}
      else if(!['5','x','g'].includes(kind))throw new TypeError('Unsupported JSON source archive member');
    }
    at+=512+Math.ceil(size/512)*512;
  }
  if(longName)throw new TypeError('Unconsumed JSON source archive name');
  original=new Map(profile.members.map(pin=>{
    const bytes=members.get(profile.package+'-'+profile.version+'/'+pin.path);
    if(!bytes||bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)throw new TypeError('Original JSON schema member differs from its pinned complete source');
    return [pin.path,frozen({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)})];
  }));return original;
}
const tokens=item=>item.tokens.filter(token=>token.type!=='comment');
function originalLayout(item) {
  const t=tokens(item),start=t.findIndex(token=>token.text===item.term),open=t.findIndex((token,index)=>index>start&&token.text==='{'),pairs={'(':')','[':']','{':'}','<':'>'};
  if(open<0||t.at(-1)?.text!=='}')throw new TypeError('External declaration needs its complete original named body');
  const groups=input=>{
    const result=[];let row=[],stack=[];
    for(const token of input) {
      if(token.text===','&&!stack.length){if(row.length)result.push(row);row=[];continue;}
      row.push(token);if(pairs[token.text])stack.push(pairs[token.text]);else if(token.text===stack.at(-1))stack.pop();
      if(stack.length>32||result.length>128)throw new TypeError('External layout exceeds bounded original nesting/members');
    }
    if(stack.length)throw new TypeError('External layout has unsupported original delimiters');if(row.length)result.push(row);return result;
  };
  const span=row=>({start:row[0].start,end:row.at(-1).end,unit:'utf16'});
  function attributes(row) {
    const attrs=[];let at=0;
    while(row[at]?.text==='#'&&row[at+1]?.text==='[') {
      const begin=at;let depth=0;do{const text=row[at++].text;if(text==='[')depth++;if(text===']')depth--;}while(at<row.length&&(at<begin+2||depth));
      if(depth)throw new TypeError('External field attribute is incomplete');attrs.push({span:span(row.slice(begin,at)),tokens:row.slice(begin,at).map(token=>token.text)});
    }
    return {attrs,at};
  }
  const rows=groups(t.slice(open+1,-1)),headerTokens=t.slice(0,open).map(token=>token.text);
  if(item.term==='enum')return {headerTokens,variants:rows.map(row=>{
    const {attrs,at}=attributes(row),name=row[at]?.text,tuple=row[at+1]?.text==='(';
    if(row[at]?.type!=='ident'||tuple&&row.at(-1)?.text!==')'||!tuple&&at+1!==row.length)throw new TypeError('External enum layout needs a separately checked shape');
    return {name,span:span(row),attributes:attrs,fields:tuple?groups(row.slice(at+2,-1)).map((field,index)=>({name:'field'+index,span:span(field),typeTokens:field.map(token=>token.text)})):[]};
  })};
  return {headerTokens,fields:rows.map(row=>{const {attrs,at}=attributes(row),colon=row.findIndex((token,index)=>index>=at&&token.text===':');if(colon<1)throw new TypeError('External struct field needs original named type tokens');return {name:row[colon-1].text,span:span(row),attributes:attrs,typeTokens:row.slice(colon+1).map(token=>token.text)};})};
}
function selectMethod(input,selection,features) {
  const owners=sourceItems(input.source).filter(item=>{
    if(item.term!=='impl')return false;const t=tokens(item),begin=t.findIndex(token=>token.text==='impl'),end=t.findIndex((token,index)=>index>begin&&token.text==='{');
    return begin>=0&&end>=0&&t.slice(begin,end).map(token=>token.text).join('')===selection.header;
  });
  if(owners.length!==1)throw new TypeError('External trait requires one exact original impl owner');
  const owner=owners[0],t=tokens(owner),open=t.find(token=>token.text==='{'),close=t.at(-1);
  if(!open||close.text!=='}')throw new TypeError('External impl needs its complete original body');
  const candidates=sourceItems(input.source.slice(open.end,close.start)).filter(item=>item.term==='fn'&&item.name===selection.method&&itemConfiguration(item.tokens,compilationProfile({flags:{test:false},values:{feature:features},closedKeys:['feature']})).status==='active');
  if(candidates.length!==1)throw new TypeError('External trait requires one actual feature-selected method');
  const member=candidates[0],mt=tokens(member),body=mt.find(token=>token.text==='{'),end=mt.at(-1),start=open.end+member.start;
  if(!body||end.text!=='}')throw new TypeError('External method needs its complete original body');
  const bodySpan={start:open.end+body.start,end:open.end+end.end,unit:'utf16'},methodSpan={start,end:open.end+member.end,unit:'utf16'};
  return frozen({source:input.path,sourceSha256:input.sha256,implSpan:{start:owner.start,end:owner.end,unit:'utf16'},implSha256:hash(input.source.slice(owner.start,owner.end)),header:selection.header,method:selection.method,methodSpan,methodSha256:hash(input.source.slice(methodSpan.start,methodSpan.end)),bodySpan,bodySha256:hash(input.source.slice(bodySpan.start,bodySpan.end))});
}
export function captureJsonSerializationSources({manifest,lock,deriveDependencies,compilationProfile:callerProfile=null}={}) {
  if(!isDeriveDependencyProof(deriveDependencies))throw new TypeError('JSON schema requires the original sealed Serde dependency bridge');
  if(deriveDependencies.rustVersion+'.0'!==STANDARD_BODY_SOURCE_PROFILE.rust)throw new TypeError('JSON Default requires its actual pinned standard trait source profile');
  const dependencies=loadJsonMacroSourceProof({manifest,lock});if(!isJsonMacroSourceProof(dependencies))throw new TypeError('JSON schema dependencies are unsealed');
  const features=proveJsonMacroFeatures(dependencies);if(!isJsonMacroFeatureProof(features))throw new TypeError('JSON schema needs original locked Cargo feature activation');
  const parser=actualJsonCapabilityProfile({manifest,lock,compilationProfile:callerProfile});
  if(!isJsonCapabilityProfile(parser)||parser.kind!=='actual-locked-Cargo-profile')throw new TypeError('JSON schema needs its actual Cargo parser capability, without an override');
  const serdeBridge=deriveDependencySource(deriveDependencies,'serde','src/lib.rs'),files=sources(),root=files.get(profile.publicExports.source);
  // The two public namespaces share the locked serde_core trait owner. These
  // exact bridge/reexport bytes are part of the original pinned archive inputs.
  if(!root.source.includes('extern crate serde_core as serde;')||!root.source.includes(profile.publicExports.declaration)||!serdeBridge.source.includes('pub use serde_core::'))throw new TypeError('External JSON/Serde trait or public type bridge remains unproved');
  const core=dependencies.packages.find(entry=>entry.name==='serde_core');
  if(!core||core.version!=='1.0.229')throw new TypeError('External JSON trait does not share the actual Serde core owner');
  const traits=Object.fromEntries(profile.types.map(type=>{
    const input=files.get(type.declaration.source),decl=sourceItems(input.source).filter(item=>item.term===type.declaration.term&&item.name===type.declaration.name);
    if(decl.length!==1)throw new TypeError('External JSON type needs its one original declaration');
    const layout=originalLayout(decl[0]),localLayouts=[];
    for(const field of layout.fields??[])if(field.typeTokens.length===1) {
      const name=field.typeTokens[0],items=sourceItems(input.source).filter(item=>['struct','enum'].includes(item.term)&&item.name===name&&itemConfiguration(item.tokens,compilationProfile({flags:{test:false},values:{feature:features.features},closedKeys:['feature']})).status==='active');
      if(items.length>1)throw new TypeError('External local representation has ambiguous original owners');
      if(items.length===1)localLayouts.push({qualifiedOwner:[...type.declaration.qualifiedOwner.slice(0,-1),name],span:{start:items[0].start,end:items[0].end,unit:'utf16'},sha256:hash(input.source.slice(items[0].start,items[0].end)),layout:originalLayout(items[0])});
    }
    return [type.name,{owner:type.owner,declaration:{...type.declaration,sourceSha256:input.sha256,span:{start:decl[0].start,end:decl[0].end,unit:'utf16'},sha256:hash(input.source.slice(decl[0].start,decl[0].end)),layout,localLayouts},serialize:selectMethod(files.get(type.serialize.source),type.serialize,features.features),deserialize:selectMethod(files.get(type.deserialize.source),type.deserialize,features.features)}];
  }));
  const registered=JSON_DATA.find(item=>item.k==='module'&&item.name==='serde_json').items.find(item=>item.k==='data'&&item.name==='Value'),variants=traits.Value.declaration.layout.variants;
  if(registered.ctors.length!==variants.length||registered.ctors.some((ctor,index)=>ctor.name!==variants[index].name||ctor.fields.length!==variants[index].fields.length))throw new TypeError('Registered recursive JSON ABI differs from its actual original constructor layout');
  const certificate=frozen({schema:profile.schema,profileSha256:hash(encoded),package:profile.package,version:profile.version,archiveSha256:profile.archiveSha256,dependencyDigest:dependencies.digest,featureProof:features,actualParserProfile:parser,traitOwner:{package:core.name,version:core.version,archiveSha256:core.archiveSha256,serialize:['serde_core','ser','Serialize'],deserialize:['serde_core','de','Deserialize']},serdeBridge:{source:serdeBridge.path,sha256:serdeBridge.sha256,archiveSha256:serdeBridge.archiveSha256},publicExports:{...profile.publicExports,sourceSha256:root.sha256},types:traits,domain:profile.serializeDomain,finiteFloatFormattingAvailable:false,manualTraitCompleteness:false,runtimeAuthority:false,generatedTraitBehavior:false});
  contexts.set(certificate,{files,features,traits});return certificate;
}
export function jsonSerializationExternalModule(context) {
  if(!contexts.has(context))throw new TypeError('External JSON bindings require a private actual source certificate');
  return {complete:false,kind:'mod',bindings:['Value','Map'].map(name=>({name,namespace:'type',kind:context.types[name].declaration.term,target:['serde_json',name],source:'original-json-source:'+context.profileSha256}))};
}
export function jsonSerializationType(context,name) {
  if(!contexts.has(context)||!['Value','Map'].includes(name))throw new TypeError('External JSON type has no private supported source owner');
  return frozen({schema:context.schema,owner:['serde_json',name],declaration:context.types[name].declaration,traits:{serialize:context.types[name].serialize,deserialize:context.types[name].deserialize,number:context.types.Number},traitOwner:context.traitOwner,featureProof:context.featureProof,actualParserProfile:context.actualParserProfile,profileSha256:context.profileSha256,archiveSha256:context.archiveSha256,domain:context.domain,finiteFloatFormattingAvailable:false,manualTraitCompleteness:false,runtimeAuthority:false,generatedTraitBehavior:false});
}
export function jsonValueDefault(context) {
  const state=contexts.get(context);if(!state)throw new TypeError('JSON Default requires its private external source owner');
  const type=profile.types.find(type=>type.name==='Value'),input=state.files.get(type.default.source),selection=selectMethod(input,type.default,state.features.features),body=input.source.slice(selection.bodySpan.start,selection.bodySpan.end);
  const parser=new HostRustParser(tokenizeRust(body)),surface=parser.block(['serde_json']);if(!parser.cursor.atEnd())throw new TypeError('Original JSON Default body is incomplete');
  const checker=new HostChecker('Rust',[]);checker.program({language:'Rust',items:structuredClone(JSON_DATA),main:null});
  const expected={kind:'data',name:'serde_json.Value'},checked=checker.expr(surface,new Map(),['serde_json'],expected);
  if(checked.k!=='ctor'||checked.data!==expected.name||checked.args?.length)throw new TypeError('JSON Default needs a separately checked non-unit constructor body');
  return frozen({schema:'original-json-value-default-v1',owner:'serde_json::Value',traitOwner:['core','default','Default'],standardSources:STANDARD_BODY_SOURCE_PROFILE,selection,parsedBodySha256:hash(JSON.stringify(surface)),checkedBodySha256:hash(JSON.stringify(checked)),value:{$:checked.ctor},manualTraitCompleteness:false,runtimeAuthority:false,generatedTraitBehavior:false});
}
