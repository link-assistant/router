// Semantic decorations follow the one generic inherent-method lowering. A
// public JSON digest cannot mint this private parsed-source association.
import {copyMetadata,metadataDigest,ownData} from './extensions/source-links.mjs';
import {types} from 'node:util';
import {typeError} from './vendor/meta-language/translation/diagnostics.js';
import {originalProjectMethodFieldEvidence} from './project.mjs';
import {originalMethodParsedFacts} from './source-method-parser.mjs';
import {originalMethodTransformFacts} from './source-method-transforms.mjs';
import {originalMethodLowering} from './impl-resolver.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const semantics=new WeakMap();
const opaque=new Set(['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof']);
// Validation rejects callbacks/proxies before this descriptor-only clone. Keep
// original property order: Copy evidence uses its original JSON byte order.
function originalMetadataCopy(value) {
  copyMetadata(value);
  const copy=node=>{
    if(!node||typeof node!=='object')return node;
    const descriptors=Object.getOwnPropertyDescriptors(node);
    if(Array.isArray(node))return Array.from({length:descriptors.length.value},(_,index)=>copy(descriptors[String(index)].value));
    return Object.fromEntries(Object.keys(descriptors).map(key=>[key,copy(descriptors[key].value)]));
  };
  return copy(value);
}
// Source links capture the complete checked signature after this existing
// emitter annotation, not before a later Host program mutation.
export function withCheckedMethodCopyReceivers(Base) {return class extends Base {
  program(surface) {
    const program=super.program(surface);
    for(const entry of program.declarations.values())if(entry.impl?.receiver==='value'&&entry.impl.copyCertificate?.verified){
      const parameter=entry.params.find(param=>param.name===entry.impl.receiverName);
      if(!parameter)throw typeError('missing checked Copy receiver',entry.span);
      parameter.copyReceiver=true;
    }
    return program;
  }
};}
function relocate(value,offset) {
  if(Array.isArray(value))return value.map(item=>relocate(item,offset));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,opaque.has(key)?item:['span','subjectSyntaxSpan','patternSpan'].includes(key)&&item?{start:item.start+offset,end:item.end+offset}:relocate(item,offset)]));
}
export function originalMethodSemantic(parsed,options={}) {
  if(!options||typeof options!=='object'||types.isProxy(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options)))throw new TypeError('Original method semantic options require non-proxy ordinary metadata');
  const descriptors=Object.getOwnPropertyDescriptors(options);
  for(const key of Reflect.ownKeys(descriptors))if(typeof key!=='string'||!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable)throw new TypeError('Original method semantic options cannot contain accessors, hidden or symbol properties');
  if(Object.keys(descriptors).some(key=>key!=='fieldEvidence'))throw new TypeError('Original method semantic options do not accept caller fieldCertificates or ownership authority');
  const capture=originalMethodParsedFacts(parsed),state=originalMethodTransformFacts(capture.transform),lowering=originalMethodLowering(state.lowered),surface=copyMetadata(capture.entry);
  const fieldEvidence=descriptors.fieldEvidence?.value;
  const fieldCertificates=fieldEvidence===undefined?[]:originalProjectMethodFieldEvidence(fieldEvidence,capture.transform).fields;
  const qualifiedType=state.lowered.typePath;
  surface.name=`ml_impl_${Buffer.from(qualifiedType.join('.')).toString('hex')}_${Buffer.from(state.method.name).toString('hex')}`;
  surface.generated='router-checked-inherent-method';
  if(state.lowered.sharedReceiverSource) {
    const type=surface.params[0]?.type;
    if(type?.rustReference?.kind!=='shared'||!type.rustReference.pointee)throw new TypeError('Original shared method requires its actual parsed pointee');
    // These annotations carry the existing separate Copy/layout proof. They
    // cannot alter the parsed body, source signature or grant Copy here.
    const fields=fieldCertificates;
    surface.params[0].type={...type,rustReference:{...type.rustReference,pointee:{...type.rustReference.pointee,rustSharedReceiverSource:copyMetadata(state.lowered.sharedReceiverSource),rustSharedFieldCopies:fields}}};
  }else if(fieldCertificates.length)throw new TypeError('Original static/consuming method has no shared receiver field annotations');
  surface.impl={type:{kind:'named',path:[...qualifiedType]},method:state.method.name,receiver:state.method.receiver,receiverName:state.lowered.receiverName,...(state.lowered.sharedReceiverSource?{sharedReceiverSource:copyMetadata(state.lowered.sharedReceiverSource)}:{}),...(lowering.copyCertificate?{copyCertificate:originalMetadataCopy(lowering.copyCertificate)}:{}),rewrites:copyMetadata(state.lowered.rewrites),assumptions:copyMetadata(state.lowered.assumptions)};
  surface.sourceMethodProof=freezeMacroTree({schema:'original-method-semantic-source-v1',parse:parsed.proof,originalTokenTransformVerified:true,originalHostParseVerified:true,checkedSourceAssociation:false,copyAuthority:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  semantics.set(surface,Object.freeze({parsed,transform:capture.transform,fieldEvidence,offset:0,relocated:false,digest:metadataDigest(surface)}));return surface;
}
export function originalMethodSemanticFacts(surface) {
  const state=semantics.get(surface);if(!state)throw new TypeError('Original method semantic source is copied, unsealed or caller fabricated');
  originalMethodParsedFacts(state.parsed);originalMethodTransformFacts(state.transform);
  if(state.fieldEvidence!==undefined)originalProjectMethodFieldEvidence(state.fieldEvidence,state.transform);
  if(metadataDigest(surface)!==state.digest)throw new TypeError('Original method semantic body/signature/decorations changed');
  return state;
}
// Refusal attribution does not issue checked IR or ownership authority. Only
// an unchanged privately parsed method supplies its exact original range;
// mutable bodies, signatures, tokens and field evidence are rechecked here.
export function originalMethodRefusalRange(surface,path) {
  if(!semantics.has(surface))return null;
  const state=originalMethodSemanticFacts(surface),origin=originalMethodTransformFacts(state.transform);
  const actualPath=copyMetadata(path);
  if(!Array.isArray(actualPath)||actualPath.length!==origin.member.modulePath.length||actualPath.some((part,index)=>part!==origin.member.modulePath[index]))return null;
  const start=origin.method.span.start+state.offset,end=origin.method.span.end+state.offset;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start)throw new TypeError('Original method refusal range exceeds its actual source coordinates');
  return Object.freeze({start,end});
}
export function relocateOriginalMethodSemantic(surface,offset) {
  const state=originalMethodSemanticFacts(surface);
  if(!Number.isSafeInteger(offset)||offset<0||state.relocated)throw new TypeError('Original method source relocation requires one exact nonnegative module offset');
  const semantic=relocate(surface,offset);
  semantics.set(semantic,Object.freeze({...state,offset,relocated:true,digest:metadataDigest(semantic)}));return semantic;
}
export function validateOriginalMethodAssociations(surface) {
  let budget=100000;
  const visit=(container,depth)=>{
    if(depth>128)throw new TypeError('Original method source module depth exceeds its source bound');
    const items=ownData(container,'items');
    if(types.isProxy(items)||!Array.isArray(items)||Object.getPrototypeOf(items)!==Array.prototype)throw new TypeError('Original method source items require an ordinary data array');
    const descriptors=Object.getOwnPropertyDescriptors(items),length=descriptors.length.value;
    if(Reflect.ownKeys(descriptors).length!==length+1||length>budget)throw new TypeError('Original method source item array is sparse, extended or exceeds its bound');
    for(let index=0;index<length;index++){
      const descriptor=descriptors[String(index)];if(!descriptor||!('value'in descriptor))throw new TypeError('Original method source items cannot invoke accessors');
      if(--budget<0)throw new TypeError('Original method source items exceed their bound');
      const entry=descriptor.value,kind=ownData(entry,'k');
      if(kind==='module')visit(entry,depth+1);else if(Object.hasOwn(entry,'sourceMethodProof')){ownData(entry,'sourceMethodProof');originalMethodSemanticFacts(entry);}
    }
  };
  visit(surface,0);return surface;
}
