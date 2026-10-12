// Original-AST instance: its private brands never cross into token-only users.
import {createDeclarativeMacroEngine} from './declarative-macro-engine.mjs';
import {isOriginalMacroFragmentContext,originalMacroFragmentDefinition,parseOriginalMacroFragment} from './source-macro-fragments.mjs';
const engine=createDeclarativeMacroEngine({isOriginalMacroFragmentContext,originalMacroFragmentDefinition,parseOriginalMacroFragment});
export const {compileDeclarativeMacro,expandDeclarativeMacro,isDeclarativeExpansion,declarativeNamespaceObservation,declarativeSubInput,declarativeExpansionLineage,declarativeDefinitionHeader}=engine;
