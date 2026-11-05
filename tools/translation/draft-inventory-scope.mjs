// Source-review DATA only. No parser, compiler, translator, namespace or runtime
// verdict is issued here. All callers must freshly obtain their original sources.
import {draftInventoryPath, DRAFT_REQUIREMENT_IDS} from './draft-inventory-reconciliation.mjs';
const ids = new Set(DRAFT_REQUIREMENT_IDS);
const fail = message => { throw new TypeError('Draft source scope: ' + message); };
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 4096;
const kinds = new Set(['module', 'function', 'impl-method', 'trait-method', 'nested-function',
  'closure', 'entrypoint', 'feature', 'platform', 'producer', 'dependency']);
const roles = new Set(['application', 'generated-application', 'test', 'example', 'benchmark',
  'build', 'dependency-internal', 'unclassified']);
const lanes = ['forwardJavaScript', 'strictTypeScript', 'reverseRust', 'synchronization'];
const array = (value, max = 100_000) => {
  if (!Array.isArray(value) || value.length > max) fail('bounded array required');
  return value;
};
const strings = value => {
  const result = array(value, 10_000);
  if (result.some(item => !text(item)) || new Set(result).size !== result.length) fail('unique strings required');
  return result;
};
function origin(value) {
  if (!value || !/^[a-f0-9]{40}$/u.test(value.revision) || !/^[a-f0-9]{40}$/u.test(value.blob) ||
      !['100644', '100755', '120000'].includes(value.mode) || !Number.isSafeInteger(value.bytes) || value.bytes < 0) {
    fail('immutable physical origin required');
  }
  draftInventoryPath(value.path);
  return value;
}
const physicalKey = value => JSON.stringify([value.revision, value.path, value.blob, value.mode, value.bytes]);
export function draftScopeEntryKey(entry) {
  // Same spelling in a trait, impl, inline module, cfg branch or included target
  // stays distinct. Renames and producer expansions never inherit assignments.
  return JSON.stringify([entry.origin.path, entry.kind, entry.owner, entry.name,
    entry.span, entry.configuration, entry.producer]);
}
function entry(value, sources) {
  if (!value || !kinds.has(value.kind) || !roles.has(value.role) || !text(value.name)) fail('entry kind/role/name required');
  origin(value.origin);
  const source = sources.get(value.origin.path);
  if (!source || physicalKey(source.origin) !== physicalKey(value.origin)) fail('entry physical source differs');
  if (array(value.owner, 1000).some(part => !text(part))) fail('explicit owner path required');
  strings(value.configuration); strings(value.unresolved);
  if (value.producer !== null && !text(value.producer)) fail('producer identity required');
  if (!Array.isArray(value.span) || value.span.length !== 2 || value.span.some(n => !Number.isSafeInteger(n)) ||
      value.span[0] < 0 || value.span[1] <= value.span[0] || value.span[1] > value.origin.bytes) fail('UTF-8 byte span required');
  if (!['manual-source-review', 'stored-meta-observation', 'native-cst-observation'].includes(value.evidence)) fail('explicit evidence kind required');
  if (!['OPEN', 'REVIEWED'].includes(value.reviewStatus)) fail('review status required');
  return value;
}
function snapshot(value) {
  if (!value || value.schema !== 'router-source-scope-v2' || !/^[a-f0-9]{40}$/u.test(value.revision)) fail('scope schema/revision required');
  const sources = new Map(), entries = new Map(), producers = new Map();
  for (const source of array(value.sources)) {
    origin(source.origin);
    if (source.origin.revision !== value.revision || sources.has(source.origin.path) || !roles.has(source.role)) fail('unique current source required');
    strings(source.unresolved);
    if (!['OPEN', 'REVIEWED'].includes(source.itemReview)) fail('source item review required');
    sources.set(source.origin.path, source);
  }
  for (const candidate of array(value.entries)) {
    const item = entry(candidate, sources), key = draftScopeEntryKey(item);
    if (entries.has(key)) fail('duplicate entry');
    entries.set(key, item);
  }
  for (const producer of array(value.producers)) {
    if (!producer || !text(producer.id) || producers.has(producer.id) || !text(producer.kind)) fail('unique producer required');
    if (!['OPEN', 'REVIEWED'].includes(producer.reviewStatus)) fail('producer review required');
    strings(producer.unresolved); strings(producer.inputs); strings(producer.outputs);
    if (!sources.has(producer.sourcePath)) fail('producer source is missing');
    for (const path of [...producer.inputs, ...producer.outputs]) {
      draftInventoryPath(path);
      if (!sources.has(path)) fail('producer physical input/output is missing');
    }
    if (!['unknown', 'source-reviewed-finite'].includes(producer.expansion)) fail('producer expansion state required');
    producers.set(producer.id, producer);
  }
  for (const item of entries.values()) if (item.producer !== null && !producers.has(item.producer)) fail('entry producer missing');
  return {sources, entries, producers};
}
function adoption(value, entries, sources) {
  if (!value || !text(value.entry) || !entries.has(value.entry)) fail('adoption entry missing');
  if (!strings(value.requirements).length || value.requirements.some(id => !ids.has(id))) fail('known requirement assignment required');
  strings(value.unresolved);
  if (!['OPEN', 'REVIEWED'].includes(value.reviewStatus)) fail('adoption review required');
  if (!array(value.implementations, 1000).length) fail('actual implementation bindings required');
  for (const binding of value.implementations) {
    if (!binding || !text(binding.symbol) || !sources.has(draftInventoryPath(binding.path))) fail('implementation path/symbol required');
    if (!array(binding.span, 2).length || binding.span.length !== 2 || binding.span.some(n => !Number.isSafeInteger(n)) ||
        binding.span[0] < 0 || binding.span[1] <= binding.span[0] || binding.span[1] > sources.get(binding.path).origin.bytes) fail('implementation source span required');
  }
  // Empty lists are legal only with an explicit unresolved gap. An inapplicable
  // lane needs its source-reviewed reason; a public boolean cannot waive a lane.
  for (const lane of lanes) {
    const evidence = value.lanes?.[lane];
    if (!evidence || !['required', 'inapplicable'].includes(evidence.status)) fail('all adoption lanes required');
    strings(evidence.paths); evidence.paths.forEach(path => {
      if (!sources.has(draftInventoryPath(path))) fail('lane source path missing');
    });
    if (evidence.status === 'inapplicable' && !text(evidence.reason)) fail('source-specific lane reason required');
    if (evidence.status === 'required' && !evidence.paths.length && !value.unresolved.length) fail('missing lane needs explicit gap');
  }
  strings(value.independentCases).forEach(path => {
    if (!sources.has(draftInventoryPath(path))) fail('independent case source path missing');
  });
  if (!value.independentCases.length && !value.unresolved.length) fail('independent case source or explicit gap required');
  return value;
}
export function reconcileDraftScope({baseline, current, adoptions}) {
  const before = snapshot(baseline), after = snapshot(current);
  const addedSources = [], removedSources = [], changedSources = [], addedEntries = [], removedEntries = [];
  const addedProducers = [], removedProducers = [], changedProducers = [];
  const staleAdoptions = [], unassigned = [], unresolved = [], requirements = new Map(DRAFT_REQUIREMENT_IDS.map(id => [id, []]));
  for (const [path, source] of before.sources) {
    const actual = after.sources.get(path);
    if (!actual) removedSources.push(path);
    else if (source.origin.blob !== actual.origin.blob || source.origin.mode !== actual.origin.mode || source.origin.bytes !== actual.origin.bytes) changedSources.push(path);
  }
  for (const path of after.sources.keys()) if (!before.sources.has(path)) addedSources.push(path);
  for (const key of before.entries.keys()) if (!after.entries.has(key)) removedEntries.push(key);
  for (const key of after.entries.keys()) if (!before.entries.has(key)) addedEntries.push(key);
  for (const [id, producer] of before.producers) {
    const actual = after.producers.get(id);
    if (!actual) removedProducers.push(id);
    else if (JSON.stringify(producer) !== JSON.stringify(actual)) changedProducers.push(id);
  }
  for (const id of after.producers.keys()) if (!before.producers.has(id)) addedProducers.push(id);
  const assigned = new Set();
  for (const mapping of array(adoptions)) {
    const checked = adoption(mapping, before.entries, before.sources);
    if (assigned.has(checked.entry)) fail('duplicate adoption entry');
    assigned.add(checked.entry);
    const prior = before.entries.get(checked.entry), actual = after.entries.get(checked.entry);
    // A complete assignment to an unchanged physical source is still only DATA.
    if (!actual || physicalKey({...prior.origin, revision: current.revision}) !== physicalKey(actual.origin) ||
        checked.implementations.some(binding => changedSources.includes(binding.path) || removedSources.includes(binding.path))) staleAdoptions.push(checked.entry);
    for (const id of checked.requirements) requirements.get(id).push(checked.entry);
    if (checked.reviewStatus !== 'REVIEWED' || checked.unresolved.length) unresolved.push({kind: 'adoption', key: checked.entry, gaps: checked.unresolved});
  }
  for (const [key, item] of after.entries) {
    if (!assigned.has(key)) unassigned.push(key);
    if (item.reviewStatus !== 'REVIEWED' || item.unresolved.length || item.role === 'unclassified') unresolved.push({kind: 'entry', key, gaps: item.unresolved});
  }
  for (const [path, source] of after.sources) if (source.itemReview !== 'REVIEWED' || source.unresolved.length || source.role === 'unclassified') {
    unresolved.push({kind: 'source', key: path, gaps: source.unresolved});
  }
  for (const [id, producer] of after.producers) if (producer.expansion === 'unknown' || producer.reviewStatus !== 'REVIEWED' || producer.unresolved.length) {
    unresolved.push({kind: 'producer', key: id, gaps: producer.unresolved});
  }
  const lists = {addedSources, removedSources, changedSources, addedEntries, removedEntries, addedProducers, removedProducers, changedProducers, staleAdoptions, unassigned};
  Object.values(lists).forEach(list => list.sort());
  return {schema: 'router-source-scope-reconciliation-v2', ...lists, unresolved,
    requirementEntries: Object.fromEntries([...requirements].map(([id, keys]) => [id, keys.sort()])),
    hasBlockingChanges: Object.values(lists).some(list => list.length) || unresolved.length > 0,
    // Deliberately unknown even for an empty or apparently reviewed input. The
    // original complete Router denominator has no proven producer closure yet.
    productionFunctionDenominator: null, translationCoverage: null,
    semanticAuthority: false, draftedRequirements: null, verification: 'UNRUN'};
}
