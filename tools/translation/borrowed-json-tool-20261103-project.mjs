// One synchronous compile-and-consume source operation. Returned DATA cannot
// extend private type, checked-call or original caller provenance lifetimes.
import {translateProject,translateProjectOwnedDefinitions,translateProjectOwnedCoreReaderDefinitions,translateProjectWithFlatSemanticMeta,translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {withBorrowedJsonToolCallerSources} from './borrowed-json-tool-20261103-requalification.mjs';
import {withCurrentStandardCopySourceOperation} from './current-standard-copy-source.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withBorrowedJsonToolCompilerSources} from './borrowed-json-tool-compiler-20261103-profile.mjs';
const modes=new Map([
 ['regular',translateProject],['owned-definitions',translateProjectOwnedDefinitions],
 ['owned-core-readers',translateProjectOwnedCoreReaderDefinitions],
 ['flat',translateProjectWithFlatSemanticMeta],['flat-enclosing',translateProjectWithFlatEnclosingSemanticMeta],
]);
/** Additive API: the five original project entrypoints retain their domains. */
export function withBorrowedJsonToolProject(options,consume,mode='regular'){
 requireSynchronousSourceCallback(consume);
 const translate=modes.get(mode);if(!translate)throw TypeError('Original JSON project mode required');
 return withBorrowedJsonToolCompilerSources(()=>withCurrentStandardCopySourceOperation(()=>withBorrowedJsonToolCallerSources(()=>
  withCompleteSourceClosingFence(()=>consume(translate(options)),[]))));
}
