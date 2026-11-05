// Finite candidate shape only. Names/types alone never bind a source caller.
import {primitiveCollectionOperationShape} from './primitive-collection-operation-descriptions-20261103.mjs';
export function primitiveSequenceOperationShape(name){return primitiveCollectionOperationShape('sequence',name);}
export function primitiveSequenceOptionalWitness(type){if(typeof type!=='string'||!type.endsWith('-option'))return null;const candidate=primitiveSequenceOperationShape('slice_'+type.slice(0,-7)+'_get');return candidate?.returns===type?candidate.javascriptName:null;}
