import { isDeepStrictEqual } from 'node:util';
import { captureSerializationContext, SerializationRefusal } from './extract.mjs';
import { serializeSerializationMeta, parseSerializationMeta } from './meta.mjs';
import { projectSerializationDescriptor, emitSerializationDescriptor } from './descriptor.mjs';

// A shared checked meta document feeds both descriptors. No native artifact is
// replaced unless its actual existing projection compares exactly beforehand.
export function generateSerializationSchema({ root, paths, entry, roots, compilationProfile, expectedDescriptor, exportName='serializationSchema' }={}) {
  const context=captureSerializationContext({root,paths,entry,compilationProfile});
  const meta=serializeSerializationMeta(context,{roots});
  const checked=parseSerializationMeta(meta,context);
  const descriptor=projectSerializationDescriptor(checked);
  if(expectedDescriptor!==undefined && !isDeepStrictEqual(JSON.parse(JSON.stringify(descriptor)),JSON.parse(JSON.stringify(expectedDescriptor)))) throw new SerializationRefusal('Generated serialization descriptor differs from the actual existing manual projection');
  return { context, meta, descriptor, javascript:emitSerializationDescriptor(checked,{language:'javascript',exportName}), typescript:emitSerializationDescriptor(checked,{language:'typescript',exportName}), comparedExistingProjection:expectedDescriptor!==undefined, runtimeAuthority:false };
}
