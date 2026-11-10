// Shared receiver lookup is separate from the explicit-dereference profile.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {primitiveFloatContract,SOURCE_F64} from './primitive-float-contracts.mjs';
import {sharedF64Pointee,originalSharedF64CopySource} from './shared-f64-copy-source.mjs';
import {originalPrimitiveCopySource,SHARED_REFERENCE_COPY_SOURCE} from '../shared-reference-copy-source.mjs';
import {captureSourceConversionScope,requireSourceConversionScope} from './source-conversion-scope.mjs';
import {copyMetadata,metadataDigest} from './source-links.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {originalF64MethodPreludeAbsence} from './shared-f64-method-prelude.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../source-profiles/shared-f64-method/',import.meta.url),bytes=readFileSync(new URL('manifest.json',root));
if(hash(bytes)!=='d54659a16a9c51cb557693b1ec8816257b657b3a324e4e407b7cdabe17dc409e')throw new TypeError('Original f64 receiver reference profile differs');
const reference=JSON.parse(bytes);
for(const row of reference.files){
 const encoded=readFileSync(new URL(row.archive,root)),raw=gunzipSync(encoded,{maxOutputLength:100000});
 if(hash(encoded)!==row.archiveSha256||raw.length!==row.bytes||hash(raw)!==row.sha256)throw new TypeError('Complete original f64 receiver reference differs');
}
const issued=new Map(),profiles=new Map();
function noCompetingMethod(closure,method,depth=0){
 if(depth>32||!closure||!Array.isArray(closure.originalMemberNames))throw new TypeError('Shared f64 method needs a complete bounded original trait closure');
 if(closure.originalMemberNames.some(member=>['fn','const'].includes(member.kind)&&member.name===method))throw new TypeError('Visible original trait may precede the primitive inherent method: '+method);
 for(const parent of closure.supertraits??[])noCompetingMethod(parent.closure,method,depth+1);
}
export function captureSharedF64MethodCall(parser,name,node){
 let proof=null,refusal=null;
 try{
  const scope=captureSourceConversionScope(parser,name.start);
  for(const row of scope.visibleTraits)noCompetingMethod(row.closure,name.value);
  for(const row of scope.anonymousTraits)noCompetingMethod(row.declaration,name.value);
  const evidence={schema:'original-private-shared-f64-method-scope-v1',method:name.value,scope,
   prelude:originalF64MethodPreludeAbsence(name.value),traitDispatchAuthority:false};
  // An opaque canonical wire preserves original source coordinates during AST
  // relocation. It grants nothing without the complete private issued value.
  const original={...evidence,digest:metadataDigest(evidence)};
  proof=JSON.stringify(original);issued.set(proof,copyMetadata(original));
 }catch(error){if(!(error instanceof TypeError))throw error;refusal=error.message;}
 return {...node,sourceSharedF64MethodScope:proof,sourceSharedF64MethodRefusal:refusal};
}
function requireScope(proof,method,span){
 const original=typeof proof==='string'?issued.get(proof):null;
 if(!original||original.method!==method)throw unsupported('shared f64 inherent receiver','requires its exact original visible-trait and prelude closure',span);
 const snapshot=copyMetadata(JSON.parse(proof));
 if(metadataDigest(snapshot)!==metadataDigest(original))throw unsupported('shared f64 inherent receiver','original caller proof changed after reparsing',span);
 requireSourceConversionScope(original.scope);return proof;
}
export function originalSharedF64MethodSource(method){
 const contract=primitiveFloatContract(method);if(!contract)throw new TypeError('Shared f64 receiver requires its actual primitive inherent contract');
 let profile=profiles.get(method);if(profile)return profile;
 const primitive=originalPrimitiveCopySource(SOURCE_F64);
 if(!primitive||primitive.source.sha256!==SHARED_REFERENCE_COPY_SOURCE.sourceSha256)throw new TypeError('Shared f64 method lacks original primitive Copy evidence');
 profile=Object.freeze({profile:'original-standard-shared-f64-inherent-receiver-v1',method,contract:contract.id,
  referenceManifestSha256:hash(bytes),referenceRevision:reference.referenceRevision,
  primitiveSourceEvidence:primitive,sharedReferenceSource:SHARED_REFERENCE_COPY_SOURCE,
  scope:'actual shared f64 reference chain to its source-qualified by-value inherent method',
  traitDispatchAuthority:false,nominalCopyAuthority:false,pointeeMutationAuthority:false,lifetimeEscapeAuthority:false,
  implicitMethodAuthority:true,constantEvaluationAuthority:false});profiles.set(method,profile);return profile;
}
export function inherentSharedF64Receiver(node,receiver,method){
 if(!receiver.type.rustReference)return node.object;
 if(node.sourceSharedF64MethodRefusal)throw unsupported('shared f64 inherent receiver',node.sourceSharedF64MethodRefusal,node.span);
 const scope=requireScope(node.sourceSharedF64MethodScope,method,node.span);
 originalSharedF64MethodSource(method);
 let type=receiver.type,object=node.object;
 while(type.rustReference){
  type=sharedF64Pointee(type,node.span);
  object={k:'routerPrimitiveDereference',value:object,sourceFeature:'inherent-f64-receiver-autoderef',sourceMethod:method,
   sourceSharedF64MethodScope:scope,span:node.object.span};
 }
 return object;
}
export function sharedF64DereferenceSource(node){
 if(node.sourceFeature!=='inherent-f64-receiver-autoderef')return originalSharedF64CopySource();
 requireScope(node.sourceSharedF64MethodScope,node.sourceMethod,node.span);
 return originalSharedF64MethodSource(node.sourceMethod);
}
