// Semantic decorations follow the one generic inherent-method lowering. A
// public JSON digest cannot mint this private parsed-source association.
import {copyMetadata,metadataDigest,ownData} from './extensions/source-links.mjs';
import {types} from 'node:util';
import {originalMethodParsedFacts} from './source-method-parser.mjs';
import {originalMethodTransformFacts} from './source-method-transforms.mjs';
import {originalMethodLowering} from './impl-resolver.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const semantics=new WeakMap();
const opaque=new Set(['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','sourceMethodProof']);
function relocate(value,offset) {
  if(Array.isArray(value))return value.map(item=>relocate(item,offset));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,opaque.has(key)?item:key==='span'&&item?{start:item.start+offset,end:item.end+offset}:relocate(item,offset)]));
}
export function originalMethodSemantic(parsed,options={}) {
  const supplied=copyMetadata(options);
  if(Object.keys(supplied).some(key=>key!=='fieldCertificates'))throw new TypeError('Original method semantic options do not supply source/ownership authority');
  const fieldCertificates=supplied.fieldCertificates??[];
  if(!Array.isArray(fieldCertificates))throw new TypeError('Original method field certificates require an actual data array');
  const capture=originalMethodParsedFacts(parsed),state=originalMethodTransformFacts(capture.transform),lowering=originalMethodLowering(state.lowered),surface=copyMetadata(capture.entry);
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
  surface.impl={type:{kind:'named',path:[...qualifiedType]},method:state.method.name,receiver:state.method.receiver,receiverName:state.lowered.receiverName,...(state.lowered.sharedReceiverSource?{sharedReceiverSource:copyMetadata(state.lowered.sharedReceiverSource)}:{}),...(lowering.copyCertificate?{copyCertificate:copyMetadata(lowering.copyCertificate)}:{}),rewrites:copyMetadata(state.lowered.rewrites),assumptions:copyMetadata(state.lowered.assumptions)};
  surface.sourceMethodProof=freezeMacroTree({schema:'original-method-semantic-source-v1',parse:parsed.proof,originalTokenTransformVerified:true,originalHostParseVerified:true,checkedSourceAssociation:false,copyAuthority:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  semantics.set(surface,Object.freeze({parsed,transform:capture.transform,offset:0,relocated:false,digest:metadataDigest(surface)}));return surface;
}
export function originalMethodSemanticFacts(surface) {
  const state=semantics.get(surface);if(!state)throw new TypeError('Original method semantic source is copied, unsealed or caller fabricated');
  originalMethodParsedFacts(state.parsed);originalMethodTransformFacts(state.transform);
  if(metadataDigest(surface)!==state.digest)throw new TypeError('Original method semantic body/signature/decorations changed');
  return state;
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
