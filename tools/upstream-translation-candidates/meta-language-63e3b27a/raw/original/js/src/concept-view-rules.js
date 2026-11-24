// Portable structural admission. Declarations are assumptions, not entailment.
/** @param {string} role @param {string} arity @param {boolean} defined @returns {boolean} */
export function acceptConceptViewShape(role, arity, defined) {
  if (role === 'concept view graph') return arity === '5' && defined;
  if (role === 'concept view sequence') return !defined;
  if (role === 'concept view concept') return arity === '2' && defined;
  if (role === 'concept view relation') return arity === '3' && defined;
  if (role === 'ontology view' || role === 'taxonomy view') return arity === '3' && !defined;
  return (role === 'concept view archive' || role === 'concept view base'
    || role === 'concept view definition' || role === 'concept view provenance'
    || role === 'concept view root' || role === 'concept view root type declaration')
    && arity === '2' && !defined;
}

/** @param {string} view @param {string} kind @returns {boolean} */
export function acceptConceptViewRelation(view, kind) {
  if (view === 'ontology view') return kind === 'association' || kind === 'axiom';
  if (view === 'taxonomy view') return kind === 'classification' || kind === 'subsumption';
  return false;
}
