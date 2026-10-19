import { encodeFormalFunctionDefinition } from './formal-function-links.js';
import { encodeFormalConceptDefinition } from './formal-concept-definition.js';
import { normalizeSharedNumericFunctionLiterals, SHARED_NUMERIC_FUNCTION_MODEL } from './shared-numeric-function-model.js';

/** Opt into the closed Number/Boolean function model, retaining origin context. */
export function encodeSharedNumericFunctionDefinition(value, declaration, { provenance } = {}) {
  const selected = encodeFormalFunctionDefinition(value, declaration);
  const root = selected.network.link(selected.root).references()[0];
  const model = normalizeSharedNumericFunctionLiterals(selected.network, root);
  const origin = { sourceLanguage: model.sourceLanguage };
  if (provenance !== undefined) origin.userProvenance = provenance;
  return encodeFormalConceptDefinition({ network: selected.network, root }, { model: SHARED_NUMERIC_FUNCTION_MODEL, provenance: origin });
}
