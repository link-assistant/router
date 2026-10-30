// Explicit whole-operation source sharing, never an across-operation cache.
// Existing project APIs retain their domains and can still select individual
// new calls; these additive entry points avoid repeating fresh source ingress.
import {translateProject,translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {withOriginalOwnedTextVectorSourceOperation} from './current-owned-text-vector-source.mjs';
export function translateProjectOwnedTextVectors(options){return withOriginalOwnedTextVectorSourceOperation(()=>translateProject(options));}
export function translateProjectWithFlatEnclosingSemanticMetaOwnedTextVectors(options){return withOriginalOwnedTextVectorSourceOperation(()=>translateProjectWithFlatEnclosingSemanticMeta(options));}
