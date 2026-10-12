// Specialize actual selected Rust bodies through the existing checker. The
// returned semantic tree uses the ordinary let/match/literal emitter.
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {rustFixedType,sameType} from '../checked-types.mjs';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {pinnedOptionBody,pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence,STANDARD_BODY_SOURCE_PROFILE} from './standard-body-source.mjs';

const refuse=span=>{throw unsupported('pinned standard body owner','requires an actual by-value canonical Option with a checked scalar or borrowed str payload',span);};
function scalarOwner(type,span){
  if(!type||type.rustReference||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse(span);
  if(type.kind==='string'&&(type.rustSourceType||type.rustBorrowLifetime?.kind==='static'&&type.rustBorrowLifetime.source==='string-literal')&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return '&str';
  if(type.kind==='bool'&&!type.rustOwnership)return 'bool';
  if(type.kind==='fixed'){
    const actual=rustFixedType(type.rustPrimitiveName);
    if(actual&&sameType(type,actual))return type.rustPrimitiveName;
  }
  if(type.kind==='float'&&type.rustPrimitiveName==='f64')return 'f64';
  return refuse(span);
}
function optionPayload(checker,type,path,span){
  if(type?.kind!=='data'||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse(span);
  const entry=checker.items.get(type.name),source=type.rustStandardGeneric;
  if(entry?.k!=='data'||entry.fullName!==type.name||!Array.isArray(entry.modulePath)||entry.standardGeneric?.kind!=='Option'||entry.standardGeneric.arguments?.length!==1||source?.kind!=='Option'||source.arguments?.length!==1||entry.ctors?.length!==2)refuse(span);
  const some=entry.ctors.filter(ctor=>ctor.name==='Some'),none=entry.ctors.filter(ctor=>ctor.name==='None');
  if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length)refuse(span);
  const payload=checker.resolveType(source.arguments[0],entry.modulePath,span),owner=scalarOwner(payload,span);
  for(const written of [entry.standardGeneric.arguments[0],some[0].fields[0].type]){
    const actual=checker.resolveType(written,entry.modulePath,span);
    if(!sameType(payload,actual)||scalarOwner(actual,span)!==owner)refuse(span);
    checker.expectedOwnership(actual,payload,path,span);checker.expectedPrimitiveIdentity(actual,payload,path,span);
  }
  return {payload,owner};
}
const sourceTree=value=>{
  if(Array.isArray(value))return value.map(sourceTree);
  if(!value||typeof value!=='object')return value;
  const node=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,sourceTree(item)]));
  // These names occur in the privately selected core Option module, rather
  // than in the caller's namespace. The checked monomorphic owner is still
  // required by HostChecker.normalisePattern.
  if(node.k==='ctor'&&node.path?.length===1&&['Some','None'].includes(node.path[0]))node.registeredGenericOwner='Option';
  return node;
};
function freeNames(node,names){
  if(Array.isArray(node))return node.map(child=>freeNames(child,names));
  if(!node||typeof node!=='object')return node;
  if(node.k==='var'&&names.has(node.name))return {...node,name:names.get(node.name)};
  if(node.k==='let'){
    const inner=new Map(names);inner.delete(node.name);
    return {...node,value:freeNames(node.value,names),body:freeNames(node.body,inner)};
  }
  if(node.k==='match')return {...node,scrutinee:freeNames(node.scrutinee,names),cases:node.cases.map(arm=>{
    const inner=new Map(names);for(const name of arm.pattern.binds??[])if(name)inner.delete(name);
    return {...arm,body:freeNames(arm.body,inner)};
  })};
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,['type','span','patternControl'].includes(key)?value:freeNames(value,names)]));
}
const nonlocal=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>!['type','span'].includes(key)&&(Array.isArray(value)?value.some(nonlocal):nonlocal(value))));
function replaceTraitCall(node,generic,defaultBody){
  if(Array.isArray(node))return node.map(child=>replaceTraitCall(child,generic,defaultBody));
  if(!node||typeof node!=='object')return node;
  if(node.k==='app'&&node.fn?.k==='name'&&node.fn.path?.join('::')===generic+'::default'){
    if(node.args.length||!defaultBody)throw new TypeError('standard trait call requires the actual selected Default body');
    return structuredClone(defaultBody);
  }
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,replaceTraitCall(value,generic,defaultBody)]));
}
function stableBody(node){
  if(Array.isArray(node))return node.map(stableBody);
  if(!node||typeof node!=='object')return typeof node==='bigint'?node.toString():node;
  return Object.fromEntries(Object.entries(node).filter(([key])=>!['span','type','patternControl'].includes(key)).map(([key,value])=>[key,stableBody(value)]));
}
const bodyDigest=body=>createHash('sha256').update(JSON.stringify(stableBody(body))).digest('hex');
export function checkPinnedOptionBody(checker,node,receiver,env,path,expected,Parser){
  const method=node.method,{payload,owner}=optionPayload(checker,receiver.type,path,node.span),selection=pinnedOptionBody(method),parameters=selection.method.parameters;
  if(parameters[0]?.receiver!==true||parameters.some((param,index)=>index>0&&param.rustTypeSyntax.join('')!=='T')||node.args.length!==parameters.length-1)throw typeError('standard method arguments differ from its actual original signature',node.span);
  if(nonlocal(node.object)||node.args.some(nonlocal))throw unsupported('standard body call control','nonlocal argument exits require independent statement lowering',node.span);
  const values=[receiver,...node.args.map(arg=>checker.expr(arg,env,path,payload))];
  for(const value of values.slice(1)){if(!sameType(value.type,payload)||scalarOwner(value.type,node.span)!==owner)throw typeError('standard eager argument differs from its actual Rust payload',node.span);checker.expectedOwnership(value.type,payload,path,node.span);checker.expectedPrimitiveIdentity(value.type,payload,path,node.span);}
  const original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original),defaultSelection=method==='unwrap_or_default'?pinnedDefaultBody(owner):null;
  const defaultBody=defaultSelection?parsePinnedBody(Parser,defaultSelection):null,defaultSyntax=defaultBody?parsedPinnedBodyEvidence(defaultBody):null;
  const specialized=replaceTraitCall(sourceTree(original),selection.evidence.genericParameter,defaultBody),bodyEnv=new Map(parameters.map((param,index)=>[param.name,values[index].type]));
  let body=checker.expr(specialized,bodyEnv,[],payload);
  if(!sameType(body.type,payload))throw typeError('original standard body result differs from its actual Rust payload',node.span);
  checker.expectedOwnership(body.type,payload,path,node.span);checker.expectedPrimitiveIdentity(body.type,payload,path,node.span);
  if(expected){checker.expectedOwnership(body.type,expected,path,node.span);checker.expectedPrimitiveIdentity(body.type,expected,path,node.span);}
  body={...body,type:{...payload,...body.type}};
  const names=new Map(parameters.map(param=>[param.name,checker.freshName('ml_standard_body_')]));body=freeNames(body,names);
  for(let index=values.length-1;index>=0;index--)body={k:'let',name:names.get(parameters[index].name),value:values[index],body,type:body.type,span:node.span};
  const proof={profile:STANDARD_BODY_SOURCE_PROFILE.id,method,owner,selection,syntaxSha256:syntax.syntaxSha256,defaultSelection,defaultSyntaxSha256:defaultSyntax?.syntaxSha256??null,evaluationOrder:'actual-source-parameters-left-to-right-once; selected-original-body',constEligible:false,namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false,checkedBodyDigest:bodyDigest(body)};
  return {k:'routerPinnedStandardBody',body,type:body.type,constEligible:false,pinnedStandardBodyProof:proof,span:node.span};
}
export function requirePinnedStandardBody(node,Parser){
  const proof=node.pinnedStandardBodyProof;
  if(node.k!=='routerPinnedStandardBody'||!proof||!['unwrap_or','unwrap_or_default'].includes(proof.method)||node.constEligible!==false||proof.profile!==STANDARD_BODY_SOURCE_PROFILE.id||proof.constEligible!==false||proof.namespaceComplete!==false||proof.traitComplete!==false||proof.wholeCoreTranslated!==false||proof.evaluationOrder!=='actual-source-parameters-left-to-right-once; selected-original-body')throw new Error('missing pinned standard body proof');
  const selection=pinnedOptionBody(proof.method),original=parsePinnedBody(Parser,selection);
  if(!isDeepStrictEqual(proof.selection,selection)||proof.syntaxSha256!==parsedPinnedBodyEvidence(original).syntaxSha256||proof.checkedBodyDigest!==bodyDigest(node.body)||scalarOwner(node.type,node.span)!==proof.owner)throw new Error('standard body proof differs from its actual source or checked tree');
  const expected=proof.method==='unwrap_or_default'?pinnedDefaultBody(proof.owner):null;
  if(!isDeepStrictEqual(proof.defaultSelection,expected)||(expected?proof.defaultSyntaxSha256!==parsedPinnedBodyEvidence(parsePinnedBody(Parser,expected)).syntaxSha256:proof.defaultSyntaxSha256!==null))throw new Error('Default body differs from its actual original implementation');
}
