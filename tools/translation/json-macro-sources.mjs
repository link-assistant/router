// Macro definition compilation stays separate from parser-independent input seals.
import {compileDeclarativeMacro} from './declarative-macros.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {jsonMacroOriginalSource} from './json-macro-inputs.mjs';
export {JSON_MACRO_SOURCE_PROFILE,createJsonMacroSourceProof,loadJsonMacroSourceProof,isJsonMacroSourceProof,jsonMacroOriginalSource,jsonMacroDependencyProfile} from './json-macro-inputs.mjs';
const definitions=new WeakMap();
export function jsonMacroSourceDefinition(proof,name='json') {
  if(!['json','json_internal','json_unexpected','json_expect_expr_comma'].includes(name))throw new TypeError('Unregistered JSON macro definition');
  const source=jsonMacroOriginalSource(proof,'serde_json','src/macros.rs');
  const definition=compileDeclarativeMacro(source.source,{name,owner:['serde_json']});
  definitions.set(definition,freezeMacroTree({dependencyDigest:proof.digest,sourceSha256:source.sha256,originalDefinitionSpan:definition.definitionSpan,sourceInputsVerified:true,callOwnerResolved:false,expansionAuthority:false}));return definition;
}
export function jsonMacroDefinitionSource(definition) {
  const evidence=definitions.get(definition);if(!evidence)throw new TypeError('Unsealed JSON macro definition');return evidence;
}
