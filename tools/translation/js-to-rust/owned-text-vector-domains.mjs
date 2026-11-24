// Domain selection DATA for the additive profile. String is never primitive Copy.
import {ownedPrimitiveVectorElement as primitiveElement,ownedPrimitiveVectorSharedElement as primitiveShared} from '../primitive-owned-vector-call-shape.mjs';
import {ownedTextVectorType,ownedTextVectorSharedType} from '../owned-text-vector-call-shape.mjs';
export function ownedPrimitiveVectorElement(type){return ownedTextVectorType(type)?'text-owned':primitiveElement(type);}
export function ownedPrimitiveVectorSharedElement(type){return ownedTextVectorSharedType(type)?'text-owned':primitiveShared(type);}
