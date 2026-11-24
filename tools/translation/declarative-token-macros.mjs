// Source-token instance with no parser dependency or AST fragment adapter.
import {createDeclarativeMacroEngine} from './declarative-macro-engine.mjs';
const engine=createDeclarativeMacroEngine();
export const {compileDeclarativeMacro,expandDeclarativeMacro,isDeclarativeExpansion,declarativeNamespaceObservation,declarativeSubInput,declarativeNestedMacroInvocations,declarativeNestedMacroInput,declarativeExpansionLineage,declarativeDefinitionHeader,declarativeExpansionOriginalInput}=engine;
