// Shared admission decisions, translated automatically into the native package.

/**
 * Admit the exact versioned discovery graph roles.
 * @param {string} term
 * @param {string} arity
 * @param {boolean} hasDefinition
 * @returns {boolean}
 */
export function acceptDiscoveredConceptShape(term, arity, hasDefinition) {
  if (term === 'discovered concept graph') return arity === '4' && hasDefinition;
  if (term === 'discovered concept sequence') return !hasDefinition;
  if (term === 'discovered concept candidate') return arity === '4' && hasDefinition;
  if (term === 'discovered concept identity') return hasDefinition;
  if (term === 'discovered formal definition') return arity === '3' && hasDefinition;
  return false;
}
