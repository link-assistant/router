// Specialize actual selected Rust bodies through the existing checker. The
// returned semantic tree uses the ordinary let/match/literal emitter.
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {rustFixedType,sameType} from '../checked-types.mjs';
import {SOURCE_STR} from './source-contract-types.mjs';
import {tokenizeRust} from './lexical.mjs';
import {TranslationError,unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {pinnedOptionBody,pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence,STANDARD_BODY_SOURCE_PROFILE} from './standard-body-source.mjs';

const refuse=span=>{throw unsupported('pinned standard body owner','requires an actual by-value canonical Option with a checked scalar or borrowed str payload',span);};
function scalarOwner(type,span){
  if(!type||type.rustReference||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse(span);
  if(type.kind==='string'&&(type.rustSourceType||isDeepStrictEqual(type.rustStandardSignature,SOURCE_STR.rustStandardSignature)||type.rustBorrowLifetime?.kind==='static'&&type.rustBorrowLifetime.source==='string-literal')&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return '&str';
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
function replaceTraitCall(node,generic,defaultBody,originalEvidence){
  if(Array.isArray(node))return node.map(child=>replaceTraitCall(child,generic,defaultBody,originalEvidence));
  if(!node||typeof node!=='object')return node;
  const callee=node.k==='app'?node.fn:node;
  if(callee?.k==='name'&&callee.path?.join('::')===generic+'::default'){
    // RustParser represents a zero-argument call as a name. Establish the
    // call from the privately parsed original token interval before replacing
    // it; an associated value or a caller's similarly named item cannot pass.
    const tokens=tokenizeRust(originalEvidence.parsedBodySource).filter(token=>token.start>=node.span?.start&&token.start<node.span?.end&&token.kind!=='comment');
    const actual=tokens.map(token=>token.value);
    if(node.k==='app'&&node.args.length||!defaultBody||actual.slice(0,5).join('|')!==[generic,'::','default','(',')'].join('|')||actual.slice(5).some(value=>value!==','))throw new TypeError('standard trait call requires the actual selected zero-argument Default call');
    return structuredClone(defaultBody);
  }
  return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,replaceTraitCall(value,generic,defaultBody,originalEvidence)]));
}
function stableBody(node){
  if(Array.isArray(node))return node.map(stableBody);
  if(!node||typeof node!=='object')return typeof node==='bigint'?node.toString():node;
  return Object.fromEntries(Object.entries(node).filter(([key])=>!['span','type','patternControl'].includes(key)).map(([key,value])=>[key,stableBody(value)]));
}
const issuedContexts=new Map();
const bodyDigest=body=>createHash('sha256').update(JSON.stringify(stableBody(body))).digest('hex');
export function checkPinnedOptionBody(checker,node,receiver,env,path,expected,Parser){
  const method=node.method,{payload,owner}=optionPayload(checker,receiver.type,path,node.span),selection=pinnedOptionBody(method),parameters=selection.method.parameters;
  if(parameters[0]?.receiver!==true||parameters.some((param,index)=>index>0&&param.rustTypeSyntax.join('')!=='T')||node.args.length!==parameters.length-1)throw typeError('standard method arguments differ from its actual original signature',node.span);
  if(nonlocal(node.object)||node.args.some(nonlocal))throw unsupported('standard body call control','nonlocal argument exits require independent statement lowering',node.span);
  const values=[receiver,...node.args.map(arg=>checker.expr(arg,env,path,payload))];
  for(const value of values.slice(1)){if(!sameType(value.type,payload)||scalarOwner(value.type,node.span)!==owner)throw typeError('standard eager argument differs from its actual Rust payload',node.span);checker.expectedOwnership(value.type,payload,path,node.span);checker.expectedPrimitiveIdentity(value.type,payload,path,node.span);}
  const original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original),defaultSelection=method==='unwrap_or_default'?pinnedDefaultBody(owner):null;
  const defaultBody=defaultSelection?parsePinnedBody(Parser,defaultSelection):null,defaultSyntax=defaultBody?parsedPinnedBodyEvidence(defaultBody):null;
  const specialized=replaceTraitCall(sourceTree(original),selection.evidence.genericParameter,defaultBody,syntax),bodyEnv=new Map(parameters.map((param,index)=>[param.name,values[index].type]));
  let body;
  try{body=checker.expr(specialized,bodyEnv,[],payload);}catch(error){if(!(error instanceof TranslationError))throw error;throw new TranslationError(error.kind,error.reason,node.span,{...error.details,originalStandardDiagnostic:{span:error.span,reason:error.reason,bodySpan:selection.method.bodySpan,sourceInputs:selection.sourceInputs}});}
  if(!sameType(body.type,payload))throw typeError('original standard body result differs from its actual Rust payload',node.span);
  checker.expectedOwnership(body.type,payload,path,node.span);checker.expectedPrimitiveIdentity(body.type,payload,path,node.span);
  if(expected){checker.expectedOwnership(body.type,expected,path,node.span);checker.expectedPrimitiveIdentity(body.type,expected,path,node.span);}
  body={...body,type:{...payload,...body.type}};
  const names=new Map(parameters.map(param=>[param.name,checker.freshName('ml_standard_body_')]));body=freeNames(body,names);
  for(let index=values.length-1;index>=0;index--)body={k:'let',name:names.get(parameters[index].name),value:values[index],body,type:body.type,span:node.span};
  const proof={profile:STANDARD_BODY_SOURCE_PROFILE.id,method,owner,selection,syntaxSha256:syntax.syntaxSha256,defaultSelection,defaultSyntaxSha256:defaultSyntax?.syntaxSha256??null,evaluationOrder:'actual-source-parameters-left-to-right-once; selected-original-body',constEligible:false,namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false,checkedBodyDigest:bodyDigest(body)};
  issuedContexts.set(proof.checkedBodyDigest,{Checker:checker.constructor,entry:structuredClone(checker.items.get(receiver.type.name)),language:checker.language});
  return {k:'routerPinnedStandardBody',body,type:body.type,constEligible:false,pinnedStandardBodyProof:proof,span:node.span};
}
// Canonicalize only bound local names. Function/data references remain exact
// and are checked using the current real declaration registry, including the
// project's ordinary flattening pass. Literal types remain part of the tree.
function alphaTree(node,env=new Map(),counter={next:0}){
  if(Array.isArray(node))return node.map(child=>alphaTree(child,env,counter));
  if(!node||typeof node!=='object')return typeof node==='bigint'?{$bigint:node.toString()}:node;
  const clean=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['span','patternControl'].includes(key)).map(([key,item])=>[key,alphaTree(item,env,counter)]));
  if(node.k==='var')return {...clean(node),name:env.get(node.name)??node.name};
  if(node.k==='let'){
    const value=alphaTree(node.value,env,counter),name='bound:'+counter.next++,inner=new Map(env).set(node.name,name);
    return {...clean({...node,value:null,body:null}),name,value,body:alphaTree(node.body,inner,counter)};
  }
  if(node.k==='match')return {...clean({...node,scrutinee:null,cases:null}),scrutinee:alphaTree(node.scrutinee,env,counter),cases:node.cases.map(arm=>{
    const inner=new Map(env),pattern={...arm.pattern};
    if(pattern.binds)pattern.binds=pattern.binds.map(name=>{if(!name)return name;const target='bound:'+counter.next++;inner.set(name,target);return target;});
    if(['bind','natSucc'].includes(pattern.k)&&pattern.name){const target='bound:'+counter.next++;inner.set(pattern.name,target);pattern.name=target;}
    return {pattern:alphaTree(pattern,env,counter),body:alphaTree(arm.body,inner,counter)};
  })};
  return clean(node);
}
export function requirePinnedStandardBody(node,Parser,{Checker,program}={}){
  const proof=node.pinnedStandardBodyProof;
  if(node.k!=='routerPinnedStandardBody'||!proof||!['unwrap_or','unwrap_or_default'].includes(proof.method)||node.constEligible!==false||proof.profile!==STANDARD_BODY_SOURCE_PROFILE.id||proof.constEligible!==false||proof.namespaceComplete!==false||proof.traitComplete!==false||proof.wholeCoreTranslated!==false||proof.evaluationOrder!=='actual-source-parameters-left-to-right-once; selected-original-body')throw new Error('missing pinned standard body proof');
  const selection=pinnedOptionBody(proof.method),original=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(original);
  if(!isDeepStrictEqual(proof.selection,selection)||proof.syntaxSha256!==syntax.syntaxSha256||scalarOwner(node.type,node.span)!==proof.owner)throw new Error('standard body proof differs from its actual source');
  const expected=proof.method==='unwrap_or_default'?pinnedDefaultBody(proof.owner):null;
  const defaultBody=expected?parsePinnedBody(Parser,expected):null,defaultSyntax=defaultBody?parsedPinnedBodyEvidence(defaultBody):null;
  if(!isDeepStrictEqual(proof.defaultSelection,expected)||proof.defaultSyntaxSha256!==(defaultSyntax?.syntaxSha256??null))throw new Error('Default body differs from its actual original implementation');
  const parameters=selection.method.parameters,bindings=[];let inner=node.body;
  for(const parameter of parameters){
    if(inner?.k!=='let'||typeof inner.name!=='string'||!inner.name||bindings.some(binding=>binding.name===inner.name)||!inner.value?.type)throw new Error('standard body lacks actual eager parameter bindings');
    bindings.push({parameter,name:inner.name,value:inner.value});inner=inner.body;
  }
  const issued=issuedContexts.get(proof.checkedBodyDigest),ActualChecker=Checker??issued?.Checker;
  const entry=program?.declarations.get(bindings[0].value.type.name)??issued?.entry;
  if(typeof ActualChecker!=='function'||!entry||entry.fullName!==bindings[0].value.type.name)throw new Error('standard body validation requires actual checked declaration context');
  const checker=new ActualChecker(program?.sourceLanguage??issued.language,program?.externals??[]);
  // This actual canonical layout is the sole data dependency of the selected
  // original Option body. Its checked payload and constructor identities are
  // revalidated rather than reconstructed from public proof claims.
  checker.program({language:checker.language,items:[{...structuredClone(entry),name:entry.fullName}],main:null});
  const {payload,owner}=optionPayload(checker,bindings[0].value.type,[],node.span);
  if(owner!==proof.owner||!sameType(payload,node.type))throw new Error('standard body actual payload differs from its source owner');
  for(const binding of bindings.slice(1)){
    if(!sameType(binding.value.type,payload)||scalarOwner(binding.value.type,node.span)!==owner)throw new Error('standard body eager argument differs from its source payload');
    checker.expectedOwnership(binding.value.type,payload,[],node.span);checker.expectedPrimitiveIdentity(binding.value.type,payload,[],node.span);
  }
  const specialized=replaceTraitCall(sourceTree(original),selection.evidence.genericParameter,defaultBody,syntax);
  let reconstructed=checker.expr(specialized,new Map(bindings.map(binding=>[binding.parameter.name,binding.value.type])),[],payload);
  reconstructed={...reconstructed,type:{...payload,...reconstructed.type}};
  reconstructed=freeNames(reconstructed,new Map(bindings.map(binding=>[binding.parameter.name,binding.name])));
  if(!isDeepStrictEqual(alphaTree(inner),alphaTree(reconstructed)))throw new Error('standard body differs from the rechecked actual original specialization');
}
