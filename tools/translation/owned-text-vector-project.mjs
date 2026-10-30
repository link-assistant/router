// Explicit whole-operation source sharing, never an across-operation cache.
// Existing project APIs retain their domains and can still select individual
// new calls; these additive entry points avoid repeating fresh source ingress.
import {translateProject,translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {withOriginalOwnedTextVectorLiteralSourceOperation} from './current-owned-text-vector-literal-source.mjs';
export function translateProjectOwnedTextVectors(options){return withOriginalOwnedTextVectorLiteralSourceOperation(()=>translateProject(options));}
export function translateProjectWithFlatEnclosingSemanticMetaOwnedTextVectors(options){return withOriginalOwnedTextVectorLiteralSourceOperation(()=>translateProjectWithFlatEnclosingSemanticMeta(options));}
