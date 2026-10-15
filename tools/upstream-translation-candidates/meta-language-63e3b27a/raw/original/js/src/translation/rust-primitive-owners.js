// Owned source facts accompany the canonical primitive value identity.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {unsupported,typeError} from './diagnostics.js';
import {acceptRustStandardPrimitiveOwner,acceptRustPrimitiveOwnerValueType,acceptRustPrimitiveOwnerExpression,readRustPrimitiveOwnerConstantValue} from './rust-primitive-owner-rules.js';
import {RUST_SOURCE_SIGNATURE_POLICY} from './rust-source-signatures.js';
import {acceptRustSourceLifetimeBinding} from './rust-indirection-rules.js';
import {acceptSharedNumericContextFlag} from '../shared-numeric-function-rules.js';
export const RUST_PRIMITIVE_OWNER_POLICY=readRuntimeProjectData(new URL('./data/rust-primitive-owners.lino',import.meta.url));
const fail=detail=>{throw typeError('Rust primitive owner proof: '+detail);};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
export function acceptRustPrimitiveOwnerImportName(name){return typeof name==='string'&&new RegExp(RUST_PRIMITIVE_OWNER_POLICY.aliasPattern,'u').test(name)&&!RUST_PRIMITIVE_OWNER_POLICY.forbiddenAliases.includes(name)&&acceptRustSourceLifetimeBinding(name,false,false);}
function exact(value,fields){if(!value||typeof value!=='object'||Array.isArray(value)||!same(Object.keys(value).sort(),[...fields].sort()))fail('unrecognized or missing owned fields');}

export function readRustStandardPrimitivePosition(parser,sourcePath,path=parser.modulePath){
 if(!parser.primitiveOwnerModel)return null;
 const resolved=parser.resolve(sourcePath,path),spelling=resolved.join('::');
 if(!RUST_PRIMITIVE_OWNER_POLICY.paths.includes(spelling)&&!(sourcePath.length===1&&sourcePath[0]==='f64'))return null;
 const kinds=RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds;
 const declared=Boolean(parser.origins.lookup(sourcePath,path,kinds)||parser.origins.lookup(resolved,path,kinds));
 const first=[resolved[0]],shadowed=resolved.length>1&&Boolean(parser.origins.lookup(first,path,kinds));
 if(spelling!=='f64'&&!acceptRustStandardPrimitiveOwner(spelling,declared,shadowed)||spelling==='f64'&&declared){
  if(!parser.origins.collecting)throw unsupported('Rust primitive owner','the actual standard primitive path and namespace must be unshadowed');
 }
 const alias=sourcePath.length===1&&spelling!=='f64'?sourcePath[0]:null;
 return {sourcePath:[...sourcePath],resolvedPath:[...resolved],alias};
}

export function createRustPrimitiveOwnerProof(parser,params,result,body){
 const position=origin=>origin.type?.kind==='float'?{
  ...(origin.primitiveOwnerPosition??{sourcePath:['f64'],resolvedPath:['f64'],alias:null}),
  wrappers:[...origin.wrappers],lifetimes:[...(origin.sourceLifetimes??[])],
 }:null;
 const imports=[...(parser.aliases.get('')??[])].map(([name,target])=>({name,target:[...target]}));
 return {model:parser.primitiveOwnerModel,language:'Rust',namespace:{declaredTypeOwners:[],externalPrimitiveRoots:['std','core'],imports},parameters:params.map(position),result:position(result),constants:parser.primitiveConstantSites.filter(site=>site.span.start>=body.span.start&&site.span.end<=body.span.end).map(site=>({...site,path:null}))};
}

function bodySites(body){
 const pending=[{value:body,path:[]}],sites=[];let visits=0;
 while(pending.length){
  if(++visits>100000)fail('the body exceeds its owned-site limit');
  const {value,path}=pending.pop();
  if(!value||typeof value!=='object')continue;
  if(value.k==='lit')sites.push({value,path});
  for(const [key,child]of Object.entries(value)){
   if(['span','type','domain','from','to'].includes(key))continue;
   if(Array.isArray(child)){for(let index=child.length-1;index>=0;index--)if(child[index]&&typeof child[index]==='object')pending.push({value:child[index],path:[...path,key,index]});}
   else if(child&&typeof child==='object')pending.push({value:child,path:[...path,key]});
  }
 }
 return sites;
}

export function prepareRustPrimitiveOwnerProof(proof,body){
 const result=structuredClone(proof),sites=bodySites(body);
 for(const constant of result.constants??[]){
  if(constant.path!==null)continue;
  const matches=sites.filter(site=>same(site.value.span,constant.span)&&site.value.type?.kind==='float'&&site.value.value===readRustPrimitiveOwnerConstantValue(constant.name));
  if(matches.length!==1)fail('a source constant must own exactly one checked literal site');
  constant.path=matches[0].path;
 }
 return result;
}

export function checkRustPrimitiveOwnerProof(program){
 const entries=[...program.declarations.values()];
 if(!entries.some(entry=>Object.hasOwn(entry,'sourcePrimitiveOwners')))return;
 if(program.sourceLanguage!=='Rust'||program.imports?.length||program.externals?.length||program.main?.effects?.length||['outputThreaded','abortsThreaded','referenceSemantics','utf16Strings'].some(field=>Object.hasOwn(program,field)&&program[field]!==false)||program.items.some(item=>item.k!=='fn')||entries.some(entry=>entry.k!=='fn'||entry.modulePath?.length||!acceptSharedNumericContextFlag(Object.hasOwn(entry,'generated'),typeof entry.generated==='boolean',entry.generated===false)||Object.hasOwn(entry,'sourceLoop')))fail('the selected model requires a complete flat primitive leaf program without declared types, imports or effects');
 let importTable=null;
 for(const entry of entries){
  if(Object.keys(entry).some(field=>!RUST_PRIMITIVE_OWNER_POLICY.declarationFields.includes(field)))fail('a primitive function has unrepresented own fields');
  if(Object.values(entry).some(value=>value===undefined))fail('an owned primitive function field has no paired native representation');
  if(Object.hasOwn(entry,'sourceSignature')&&(!entry.sourceSignature||typeof entry.sourceSignature!=='object'||Array.isArray(entry.sourceSignature)))fail('a present source signature must retain its owned record');
  if(!Array.isArray(entry.modulePath)||entry.recursive!==false||entry.decreasing!=null||!acceptSharedNumericContextFlag(Object.hasOwn(entry,'mutual'),typeof entry.mutual==='boolean',entry.mutual===false))fail('the declared function context contradicts its primitive leaf ownership');
  const proof=entry.sourcePrimitiveOwners;
  exact(proof,['model','language','namespace','parameters','result','constants']);
  if(proof.model!==RUST_PRIMITIVE_OWNER_POLICY.model||proof.language!=='Rust')fail('unknown selected source interpretation');
  exact(proof.namespace,['declaredTypeOwners','externalPrimitiveRoots','imports']);
  if(!same(proof.namespace.declaredTypeOwners,[])||!same(proof.namespace.externalPrimitiveRoots,['std','core'])||!Array.isArray(proof.namespace.imports))fail('the actual declared-type namespace contradicts its primitive premise');
  if(importTable===null)importTable=proof.namespace.imports;else if(!same(importTable,proof.namespace.imports))fail('function owners disagree about their shared import namespace');
  const aliases=new Map();
  for(const alias of proof.namespace.imports){
   exact(alias,['name','target']);
   if(!acceptRustPrimitiveOwnerImportName(alias.name)||aliases.has(alias.name)||!Array.isArray(alias.target)||!same(alias.target,alias.target.join('::').split('::'))||!acceptRustStandardPrimitiveOwner(alias.target.join('::'),false,false))fail('an import alias has no admitted standard primitive target');
   aliases.set(alias.name,alias.target);
  }
  const owner=position=>{
   exact(position,['sourcePath','resolvedPath','alias']);
   if(!Array.isArray(position.sourcePath)||!Array.isArray(position.resolvedPath)||position.sourcePath.some(value=>typeof value!=='string'||!value)||position.resolvedPath.some(value=>typeof value!=='string'||!value))fail('an actual source owner path is malformed');
   const spelling=position.resolvedPath.join('::');
   if(!same(position.resolvedPath,spelling.split('::'))||spelling!=='f64'&&!acceptRustStandardPrimitiveOwner(spelling,false,false))fail('an actual owner is not a standard primitive reexport');
   if(position.alias===null){if(!same(position.sourcePath,position.resolvedPath))fail('an unaliased source path differs from its owner');}
   else if(typeof position.alias!=='string'||!same(position.sourcePath,[position.alias])||!same(aliases.get(position.alias),position.resolvedPath))fail('the actual imported source owner differs from its owned alias resolution');
  };
  const position=(value,type,signature)=>{
   if(!acceptRustPrimitiveOwnerValueType(type?.kind??'')||Object.keys(type).length!==1)fail('an interface contains a nonprimitive value type');
   if(type.kind!=='float'){if(value!==null)fail('binary64 source evidence belongs to a different parameter');return;}
   exact(value,['sourcePath','resolvedPath','alias','wrappers','lifetimes']);
   owner({sourcePath:value.sourcePath,resolvedPath:value.resolvedPath,alias:value.alias});
   if(!Array.isArray(value.wrappers)||value.wrappers.some(layer=>layer!=='reference')||!Array.isArray(value.lifetimes)||value.lifetimes.length!==value.wrappers.length||value.lifetimes.some(lifetime=>lifetime!==null&&lifetime!=='static'&&lifetime!=='_'))fail('source owner reference layers are inconsistent');
   if(signature&&(!same(signature.wrappers,value.wrappers)||!same(signature.lifetimes,value.lifetimes)||signature.owner.kind!=='primitive'||!same(signature.owner.path,['f64'])))fail('the canonical signature disagrees with its actual qualified source owner');
  };
  if(!Array.isArray(proof.parameters)||proof.parameters.length!==entry.params.length||!Array.isArray(proof.constants))fail('owner positions differ from their declaration');
  entry.params.forEach((parameter,index)=>{
   if(Object.keys(parameter).some(field=>!RUST_PRIMITIVE_OWNER_POLICY.parameterFields.includes(field)))fail('a primitive parameter has unrepresented own fields');
   if(Object.values(parameter).some(value=>value===undefined))fail('an owned primitive parameter field has no paired native representation');
   if(parameter.guard!=null||parameter.default!=null||parameter.optional)fail('parameter guards, defaults and optionality need a separate owner interface proof');
   position(proof.parameters[index],parameter.type,entry.sourceSignature?.parameters[index]);
  });
  position(proof.result,entry.ret,entry.sourceSignature?.result);
  if(proof.result?.wrappers.length)fail('borrowed results need a separate region and source owner interpretation');
  const sites=bodySites(entry.body),visited=new Set();
  for(const constant of proof.constants){
   exact(constant,['owner','name','span','path']);owner(constant.owner);
   exact(constant.span,['start','end']);
   if(!Number.isSafeInteger(constant.span.start)||!Number.isSafeInteger(constant.span.end)||constant.span.start<0||constant.span.end<=constant.span.start)fail('an actual constant source span is malformed');
   if(!readRustPrimitiveOwnerConstantValue(constant.name)||!Array.isArray(constant.path)||constant.path.some(part=>typeof part!=='string'&&!Number.isSafeInteger(part))||visited.has(JSON.stringify(constant.path)))fail('a constant has an invalid or duplicate owned body site');
   visited.add(JSON.stringify(constant.path));
   const site=sites.find(site=>same(site.path,constant.path));
   if(!site||site.value.type.kind!=='float'||site.value.value!==readRustPrimitiveOwnerConstantValue(constant.name)||!same(site.value.span,constant.span))fail('the source constant disagrees with its checked body literal');
  }
  const pending=[entry.body];let visits=0;
  while(pending.length){
   if(++visits>100000)fail('the primitive leaf body exceeds its resource limit');
   const node=pending.pop();
   if(!node||!acceptRustPrimitiveOwnerExpression(node.k)||!acceptRustPrimitiveOwnerValueType(node.type?.kind??'')||Object.keys(node.type).length!==1)fail('the source profile requires primitive leaf value expressions');
   if(Object.keys(node).some(field=>!RUST_PRIMITIVE_OWNER_POLICY.expressionFields[node.k].includes(field)))fail('a primitive body expression has unrepresented own fields');
   if(Object.values(node).some(value=>value===undefined))fail('an owned primitive body field has no paired native representation');
   for(const child of [node.arg,node.left,node.right,node.value,node.body,node.cond,node.then,node.else,...(node.args??[])])if(child&&typeof child==='object')pending.push(child);
  }
 }
}
