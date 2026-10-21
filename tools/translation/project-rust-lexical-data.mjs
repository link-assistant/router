// Explicit opt-in lexical DATA schedule; the original project function and
// private semantic/type/owner issuers remain in their original module.
import {translateProjectOwnedDefinitions} from './project.mjs';
import {withRustLexicalDataScope} from './rust-lexical-data-scope.mjs';
export function translateProjectOwnedDefinitionsLexicalData(options){
 return withRustLexicalDataScope(()=>translateProjectOwnedDefinitions(options));
}
