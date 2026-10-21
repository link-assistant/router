// A failed lifetime phase returns no program. Every surviving caller is checked
// again by the existing project loop after the complete attributed batch fails.
export function createSourceLifetimeRefusalSupport({collectors, failedPhase, TranslationError, originalRanges}) {
  const selectedSurfaces = new WeakSet();
  function withSourceLifetimeRefusals(surface, enabled, run) {
    if (typeof enabled !== 'boolean' || typeof run !== 'function') throw new TypeError('Explicit source lifetime collection and synchronous callback required');
    if (!enabled) return run();
    if (selectedSurfaces.has(surface)) throw new TypeError('Source lifetime collection surface is already active');
    selectedSurfaces.add(surface);
    try { return run(); }
    finally { selectedSurfaces.delete(surface); }
  }
  function sourceLifetimeRefusalsSelected(surface) { return selectedSurfaces.has(surface); }
  function checkSourceLifetimeRefusals(checker, program, phase, verify) {
    if (!['source-lifetime-signatures', 'source-lifetime-bodies'].includes(phase) || typeof verify !== 'function') throw new TypeError('Complete source lifetime phase required');
    const state = collectors.get(checker), errors = [];
    for (const entry of program.declarations.values()) if (entry.k === 'fn') {
      try { verify(entry); }
      catch (error) {
        const origin = state?.collectSourceLifetimes && state.sourceProofOrigins.get(entry.fullName);
        if (!(error instanceof TranslationError) || !origin) throw error;
        const {item, path, entry: originalEntry} = origin;
        const name = [...path, item.name].join('.');
        const {methodRange, projectRange} = originalRanges(item, path), source = methodRange ?? projectRange, range = error.span;
        // A public span, normalized clone, generated helper or unrelated error
        // cannot acquire an original declaration owner through this collector.
        if (entry !== originalEntry || program.declarations !== checker.items || entry !== checker.items.get(name) || entry.fullName !== name ||
            !source || !range || !Number.isSafeInteger(source.start) || !Number.isSafeInteger(source.end) ||
            !Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || source.start < 0 || source.end < source.start ||
            range.end < range.start || range.start < source.start || range.end > source.end) throw error;
        if (errors.length >= 20000) throw new Error('Source lifetime refusal collection exceeds its bounded source count');
        errors.push({error, name, phase});
      }
    }
    if (errors.length) throw failedPhase(errors);
  }
  return {withSourceLifetimeRefusals, sourceLifetimeRefusalsSelected, checkSourceLifetimeRefusals};
}
