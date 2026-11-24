// A checked zero branch excludes NaN without inventing observable NaN bits.
// Facts are lexical slots inside this pass, never caller-supplied type metadata.
import {createHash} from 'node:crypto';
import {BOOL} from '../checked-types.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {primitiveFloatSignContract,requirePrimitiveFloat} from './primitive-float-contracts.mjs';
export const FLOAT_ZERO_PROFILE=Object.freeze({id:'rust-1.89-f64-checked-zero-branch',nodesPerFunction:32768,depth:128,conditions:'actual-f64-zero-equality-and-true-conjunction',continuationFacts:false,constantEvaluation:false});
const seals=new WeakMap(),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(reason,span)=>{throw unsupported('f64 zero-sign refinement',reason,span);};
const evidenceKeys=new Set(['type','domain','from','to','span','sourcePattern','sourceParameterPatterns','sourceFloatLiteral','patternControl','integerRangeMatchProof','constantEvaluationProof','copyCertificate','primitiveFloatSignProof']);
function fields(node) {return Object.entries(node).filter(([key])=>!evidenceKeys.has(key)&&!key.endsWith('Proof'));}
function budget(node,state,depth) {
  if(++state.nodes>FLOAT_ZERO_PROFILE.nodesPerFunction||depth>FLOAT_ZERO_PROFILE.depth)fail('exceeds the bounded checked-function traversal',node?.span);
}
export function floatSignObligation(method,object,span) {
  requirePrimitiveFloat(object,span);
  const contract=primitiveFloatSignContract(method);
  if(!contract||object.k!=='var')fail('requires an actual lexical f64 variable, not a computed value or alias contract',span);
  const seal=Object.freeze({});
  seals.set(seal,{method,name:object.name,typeDigest:hash(object.type)});
  return {k:'routerFloatSignObligation',method,object,floatSignSeal:seal,type:BOOL,constEligible:false,span};
}
function hasObligation(node,state,depth=0) {
  if(!node||typeof node!=='object')return false;
  budget(node,state,depth);
  if(node.k==='routerFloatSignObligation')return true;
  for(const [,value]of fields(node)) {
    if(Array.isArray(value)){for(const child of value)if(hasObligation(child,state,depth+1))return true;}
    else if(hasObligation(value,state,depth+1))return true;
  }
  return false;
}
function sourceZero(node) {
  if(node?.k==='unary'&&node.op==='neg'&&node.semantics==='ieee')return sourceZero(node.arg);
  const source=node?.sourceFloatLiteral;
  return node?.k==='lit'&&typeof node.value==='string'&&node.type?.kind==='float'&&node.type.rustPrimitiveName==='f64'&&!node.type.rustReference&&/^-?0(?:\.0*)?$/u.test(node.value)&&source?.verified===true&&source.profile==='rust-1.89-binary64-decimal-literals';
}
function zeroFacts(condition,bindings) {
  if(condition?.k==='binary'&&condition.op==='and')return [...zeroFacts(condition.left,bindings),...zeroFacts(condition.right,bindings)];
  if(condition?.k!=='binary'||condition.op!=='eq'||condition.type?.kind!=='bool'||condition.domain?.kind!=='float'||condition.domain.rustPrimitiveName!=='f64'||condition.domain.rustReference)return [];
  for(const [variable,literal]of [[condition.left,condition.right],[condition.right,condition.left]]) {
    if(variable?.k!=='var'||!sourceZero(literal))continue;
    requirePrimitiveFloat(variable,condition.span);
    const slot=bindings.get(variable.name);
    if(slot&&!slot.mutable&&slot.typeDigest===hash(variable.type))return [{slot,guardDigest:hash(condition),guardSpan:condition.span??literal.span,literalSpan:literal.span}];
  }
  return [];
}
const values=new Set(['binary','unary','call','routerHostCall','ctor','array','lit','var','unit','routerReturn','routerDiscard']);
function resolve(node,bindings,facts,state,depth=0) {
  if(!node||typeof node!=='object')return node;
  budget(node,state,depth);
  if(node.k==='routerFloatSignObligation') {
    const seal=seals.get(node.floatSignSeal),slot=bindings.get(node.object?.name),fact=facts.get(slot);
    requirePrimitiveFloat(node.object,node.span);
    if(!seal||seal.method!==node.method||seal.name!==node.object.name||seal.typeDigest!==hash(node.object.type)||node.object.k!=='var'||!slot||slot.mutable||!fact)fail('requires this immutable f64 binding in an actual checked zero-equality true branch',node.span);
    const contract=primitiveFloatSignContract(seal.method);
    return {k:'routerHostCall',id:contract.id,args:[node.object],type:BOOL,constEligible:false,span:node.span,primitiveFloatSignProof:{profile:FLOAT_ZERO_PROFILE.id,verified:true,fact:'zero-excludes-NaN',binding:{name:slot.name,index:slot.index},guardDigest:fact.guardDigest,guardSpan:fact.guardSpan,literalSpan:fact.literalSpan}};
  }
  if(node.k==='let') {
    const value=resolve(node.value,bindings,facts,state,depth+1),inner=new Map(bindings);
    inner.set(node.name,{name:node.name,index:state.slots++,mutable:Boolean(node.mutable),typeDigest:hash(value.type)});
    return {...node,value,body:resolve(node.body,inner,facts,state,depth+1)};
  }
  if(node.k==='if'||node.k==='routerIf') {
    const cond=resolve(node.cond,bindings,facts,state,depth+1),selected=new Map(facts);
    for(const fact of zeroFacts(cond,bindings))selected.set(fact.slot,fact);
    const result={...node,cond,then:resolve(node.then,new Map(bindings),selected,state,depth+1),else:resolve(node.else,new Map(bindings),facts,state,depth+1)};
    if(node.k==='routerIf')result.body=resolve(node.body,bindings,facts,state,depth+1);
    return result;
  }
  // Closures, loops, aliases, match joins and unknown nodes gain no facts.
  // Existing checked operations without sign obligations remain unchanged.
  if(!values.has(node.k)) {
    if(hasObligation(node,{nodes:0},depth))fail('this control or callback context has no checked zero-branch contract',node.span);
    return node;
  }
  const result={...node};
  for(const [key,value]of fields(node)) {
    if(Array.isArray(value))result[key]=value.map(child=>resolve(child,bindings,facts,state,depth+1));
    else if(value&&typeof value==='object')result[key]=resolve(value,bindings,facts,state,depth+1);
  }
  return result;
}
export function resolveFloatZeroSigns(program,surface) {
  const signatures=new Map();
  const visit=(items,path=[])=>{for(const item of items){if(item.k==='module')visit(item.items,[...path,item.name]);else if(item.k==='fn')signatures.set([...path,item.name].join('.'),item.params);}};
  visit(surface.items);
  for(const entry of program.declarations.values()) {
    if(entry.k!=='fn'||!hasObligation(entry.body,{nodes:0}))continue;
    if(entry.constant||entry.constFunction)fail('this runtime refinement does not establish floating const eligibility',entry.span);
    const params=signatures.get(entry.fullName);
    if(!params||params.length!==entry.params.length)fail('requires the actual checked source function signature',entry.span);
    const state={nodes:0,slots:0},bindings=new Map();
    for(const [index,param]of entry.params.entries()) {
      if(params[index].name!==param.name)fail('source parameter identity differs from the checked signature',entry.span);
      bindings.set(param.name,{name:param.name,index:state.slots++,mutable:Boolean(params[index].mutable),typeDigest:hash(param.type)});
    }
    entry.body=resolve(entry.body,bindings,new Map(),state);
    if(hasObligation(entry.body,{nodes:0}))fail('unresolved sign obligation cannot enter successful semantic IR',entry.span);
  }
  if(program.main&&hasObligation(program.main,{nodes:0}))fail('main has no source-function zero-sign profile',program.main.span);
  return program;
}
// This adapter belongs inside withCheckedSourceLinks: successful-check digests
// must describe resolved calls, never transient obligations or stale bodies.
export const withFloatZeroSignChecker=Base=>class extends Base {
  program(surface) {
    const program=super.program(surface);
    return this.floatSignObligations?resolveFloatZeroSigns(program,surface):program;
  }
};
