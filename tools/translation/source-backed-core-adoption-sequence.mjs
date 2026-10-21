// Compose actual source adopters; this module never checks a Rust function.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {PRODUCTION_PROFILE, compilationProfile as normalizeProfile} from './cfg-profile.mjs';
import {loadDeriveDependencyProof, deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {sourceItems} from './rust-structure.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {resolveModuleGraph} from './project.mjs';
import {proposeSourceBackedCoreFormattingCorpus} from './source-backed-core-formatting.mjs';
import {proposeSourceBackedCoreLiteralMatchesCorpus} from './source-backed-core-matches.mjs';
import {proposeSourceBackedCoreVectorCorpus} from './source-backed-core-vectors.mjs';
const L = IO.limits, hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new TypeError('Source-backed core adoption sequence: ' + message); };
const STEPS = Object.freeze([
  Object.freeze({name: 'formatting', run: proposeSourceBackedCoreFormattingCorpus, corpus: 'router-owned-source-backed-formatting-corpus-proposal-v1', file: 'router-core-formatting-migration-v1', library: 'untranslated-rust-std-format', inverseField: false}),
  Object.freeze({name: 'matches', run: proposeSourceBackedCoreLiteralMatchesCorpus, corpus: 'router-owned-source-backed-matches-corpus-proposal-v1', file: 'owned-literal-matches-source-adoption-v1', library: 'untranslated-rust-std-matches', inverseField: true}),
  Object.freeze({name: 'vectors', run: proposeSourceBackedCoreVectorCorpus, corpus: 'router-owned-source-backed-vector-corpus-proposal-v1', file: 'owned-vector-source-adoption-v1', library: 'untranslated-rust-std-vec', inverseField: true}),
]);
function ownObject(value, label) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('own ' + label + ' data required');
  const result = Object.create(null);
  for (const name of Reflect.ownKeys(value)) {
    if (typeof name !== 'string') fail(label + ' symbol field');
    const field = Object.getOwnPropertyDescriptor(value, name);
    if (!field || !Object.hasOwn(field, 'value')) fail(label + ' accessor field');
    result[name] = field.value;
  }
  return result;
}
function files(value) {
  const source = ownObject(value, 'source map'), paths = Object.keys(source).sort(), result = Object.create(null); let units = 0;
  if (!paths.length || paths.length > L.files) fail('original packet source-file bound');
  for (const path of paths) {
    IO.pathName(path); const text = source[path];
    if (typeof text !== 'string' || text.length > L.fileUnits || Buffer.byteLength(text) > L.fileBytes || (units += text.length) > L.sourceUnits) fail('original packet source-text bound');
    result[path] = text;
  }
  return result;
}
function dependencies(value) {
  const input = ownObject(value, 'Cargo input');
  if (Object.keys(input).length !== 2 || !Object.hasOwn(input, 'manifest') || !Object.hasOwn(input, 'lock')) fail('complete manifest/lock inputs required');
  for (const name of ['manifest', 'lock']) if (typeof input[name] !== 'string' || input[name].length > L.fileUnits || Buffer.byteLength(input[name]) > L.fileBytes) fail('bounded complete Cargo text required');
  return {manifest: input.manifest, lock: input.lock};
}
function cargoJoin(input) {
  // Even without a derive in this source map, this new sequence explicitly
  // joins the actual full Cargo strings through the existing genuine issuer.
  const proof = loadDeriveDependencyProof(input), original = deriveDependencyOriginalInputs(proof);
  if (original.manifest !== input.manifest || original.lock !== input.lock) fail('genuine Cargo source association differs');
  return {manifestSha256: hash(original.manifest), lockSha256: hash(original.lock), dependencyDigest: proof.digest};
}
const census = value => Object.keys(value).sort().map(path => ({path, sha256: hash(value[path])}));
const digest = value => hash(JSON.stringify(census(value)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function sameFiles(a, b) { if (!same(census(a), census(b)) || Object.keys(a).some(path => a[path] !== b[path])) fail('complete source map differs'); }
function fullInputs(proposal, before, step, profile, cargo, entry) {
  if (proposal.schema !== step.corpus || proposal.entry !== entry || proposal.libraryImplementation !== step.library || proposal.semanticAdmission !== false || !same(normalizeProfile(proposal.compilationProfile), profile)) fail('distinct actual corpus contract differs');
  const paths = Object.keys(before).sort();
  if (!Array.isArray(proposal.inputs) || proposal.inputs.length !== paths.length || proposal.inputs.some((row, at) => row.path !== paths[at] || row.source !== before[paths[at]] || row.sha256 !== hash(before[paths[at]]))) fail('complete phase input census differs');
  if (!Array.isArray(proposal.rows) || proposal.rows.length !== paths.length || proposal.rows.some((row, at) => row.path !== paths[at])) fail('complete phase row census differs');
  // Rejoin origins independently through the actual module-graph API, using
  // this complete current map. DATA labels never establish a module context.
  const graph = resolveModuleGraph({entry, paths, readSource: path => before[path], compilationProfile: profile});
  if (!same(proposal.moduleEdges, graph.edges) || !same(proposal.moduleDiagnostics, graph.diagnostics)) fail('complete current module graph differs');
  for (const row of proposal.rows) {
    const origins = graph.modules.filter(module => module.file === row.path && module.sourceView?.modulePath.length === 0)
      .map(module => ({module: [...module.path], condition: module.configurationCondition, sourceViewDigest: module.sourceView.digest}));
    if (!same(row.origins, origins)) fail('fresh complete source/module origin differs');
  }
  if (proposal.producerEffects && (!same(proposal.producerEffects.dependencyInputs, cargo.inputs) || proposal.producerEffects.dependenciesDigest !== cargo.join.dependencyDigest)) fail('original producer Cargo join differs');
}
function coordinate(value, mapping) {
  if (!Number.isSafeInteger(value) || value < 0) fail('integer function coordinate required');
  for (const part of mapping) {
    if (value < part.after[0] || value > part.after[1]) continue;
    if (part.kind === 'unchanged') return part.before[0] + value - part.after[0];
    if (value === part.after[0]) return part.before[0];
    if (value === part.after[1]) return part.before[1];
    fail('function boundary falls inside an earlier API substitution');
  }
  fail('function boundary has no complete inverse coordinate');
}
function fileChange(row, source, step) {
  const value = row.proposal;
  if (value.schema !== step.file || value.libraryImplementation !== step.library || value.executableAdmission !== false || value.before?.source !== source || value.before.sha256 !== hash(source) || typeof value.after?.source !== 'string' || value.after.sha256 !== hash(value.after.source)) fail('complete original file/hash/inverse join differs');
  // The actual formatting producer stores its inverse as a full partition,
  // not an additional string. The two newer producers retain both forms.
  if (Object.hasOwn(value, 'inverse') !== step.inverseField || step.inverseField && value.inverse !== source) fail('actual producer inverse field contract differs');
  if (transportConcreteSyntaxMeta(value.before.meta).source !== source || transportConcreteSyntaxMeta(value.after.meta).source !== value.after.source) fail('complete file CST join differs');
  IO.assertAdoptionInverse(value);
  if (!Array.isArray(value.edits) || !Array.isArray(value.functions)) fail('complete file edit/function vectors required');
  let rebuilt = source, end = 0;
  for (const edit of value.edits) {
    if (!Array.isArray(edit.span) || edit.span.length !== 2 || !edit.span.every(Number.isSafeInteger) || edit.span[0] < end || edit.span[1] <= edit.span[0] || edit.span[1] > source.length || typeof edit.expected !== 'string' || typeof edit.replacement !== 'string' || source.slice(...edit.span) !== edit.expected) fail('complete sorted original edit association differs');
    end = edit.span[1];
  }
  for (const edit of [...value.edits].reverse()) rebuilt = rebuilt.slice(0, edit.span[0]) + edit.replacement + rebuilt.slice(edit.span[1]);
  if (rebuilt !== value.after.source) fail('after source contains undeclared changes');
  const original = sourceItems(source).filter(item => item.term === 'fn'), selected = new Set(); let edits = 0;
  for (const fn of value.functions) {
    if (!Array.isArray(fn.span) || fn.span.length !== 2 || !fn.span.every(Number.isSafeInteger)) fail('complete function coordinates required');
    const candidates = original.filter(item => item.name === fn.name && item.start === fn.span[0] && item.end === fn.span[1]), key = JSON.stringify([fn.name, fn.span]);
    if (candidates.length !== 1 || selected.has(key)) fail('duplicate or ambiguous current function'); selected.add(key);
    const covered = value.edits.filter(edit => edit.span[0] >= fn.span[0] && edit.span[1] <= fn.span[1]);
    if (!covered.length || (step.name === 'formatting' ? fn.edits : fn.macroCalls) !== covered.length) fail('selected function edit count differs'); edits += covered.length;
  }
  if (edits !== value.edits.length || (row.status === 'proposed') !== Boolean(edits)) fail('function edits do not partition the file proposal');
  return value;
}
function candidateGroups(original, history) {
  const groups = new Map();
  for (let at = 0; at < history.length; at++) {
    const current = history[at];
    for (const row of current.proposal.rows.filter(row => row.proposal?.functions.length)) {
      if (!Array.isArray(row.origins) || row.origins.length !== 1 || !Array.isArray(row.origins[0].module)) fail('unique physical module origin required');
      for (const fn of row.proposal.functions) {
        let span = [...fn.span];
        for (let prior = at - 1; prior >= 0; prior--) {
          const change = history[prior].proposal.rows.find(candidate => candidate.path === row.path)?.proposal;
          if (change) span = span.map(value => coordinate(value, change.mapping));
        }
        const matches = sourceItems(original[row.path]).filter(item => item.term === 'fn' && item.name === fn.name && item.start === span[0] && item.end === span[1]);
        if (matches.length !== 1) fail('base function inverse/source join differs');
        const module = [...row.origins[0].module], id = JSON.stringify([row.path, module, fn.name, span]);
        let group = groups.get(id);
        if (!group) { group = {id, path: row.path, module, name: fn.name, span, sha256: hash(original[row.path].slice(...span)), selectedBy: []}; groups.set(id, group); }
        if (group.selectedBy.includes(current.name)) fail('duplicate function in one source step');
        group.selectedBy.push(current.name);
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function summary(original, final, history) {
  const functions = candidateGroups(original, history);
  return {sourceFiles: Object.keys(original).length, changedFiles: Object.keys(original).filter(path => original[path] !== final[path]).length,
    candidateSelections: history.reduce((total, row) => total + row.proposal.summary.selectedFunctions, 0), distinctCandidateFunctions: functions.length,
    stepSelections: history.map(row => ({step: row.name, selectedFunctions: row.proposal.summary.selectedFunctions})), functions};
}
function applyStep(proposal, before, step, profile, cargo, entry) {
  fullInputs(proposal, before, step, profile, cargo, entry);
  const after = {...before}; let selected = 0;
  for (const row of proposal.rows) {
    if (!['proposed', 'unchanged', 'skipped'].includes(row.status)) fail('unknown source proposal status');
    if (!row.proposal) { if (row.status === 'proposed') fail('proposed row lacks its complete file proposal'); continue; }
    const value = fileChange(row, before[row.path], step); selected += value.functions.length; after[row.path] = value.after.source;
  }
  if (proposal.summary.selectedFunctions !== selected || proposal.summary.files !== Object.keys(before).length || proposal.summary.proposed !== proposal.rows.filter(row => row.status === 'proposed').length || proposal.summary.unchanged !== proposal.rows.filter(row => row.status === 'unchanged').length || proposal.summary.skipped !== proposal.rows.filter(row => row.status === 'skipped').length) fail('complete phase summary differs');
  return files(after);
}
export function proposeSourceBackedCoreAdoptionSequence(input) {
  const options = ownObject(input, 'sequence option'), names = Object.keys(options);
  if (names.some(name => !['entry', 'files', 'dependencyInputs', 'compilationProfile'].includes(name)) || !Object.hasOwn(options, 'files') || !Object.hasOwn(options, 'dependencyInputs')) fail('complete source map and Cargo inputs required');
  const original = files(options.files), entry = options.entry ?? 'src/lib.rs', profile = normalizeProfile(options.compilationProfile ?? PRODUCTION_PROFILE), cargo = dependencies(options.dependencyInputs);
  IO.pathName(entry); if (!Object.hasOwn(original, entry)) fail('original entry source absent');
  const run = createRulePipeline([
    {phase: 'language', rules: [{id: 'source-adoption:retain-complete-Rust-CST-and-genuine-Cargo-inputs', apply: () => ({original, cargo, join: cargoJoin(cargo)})}]},
    {phase: 'repository', rules: [{id: 'router-core:compose-fresh-formatting-matches-vector-source-steps', apply: source => {
      const documents = [], inventory = new Map(); let bytes = 0;
      function refs(map) {
        return Object.keys(map).sort().map(path => {
          const text = map[path], sha256 = hash(text), key = JSON.stringify([path, sha256]); let document = inventory.get(key);
          if (document && document.source !== text) fail('complete source digest collision');
          if (!document) {
            const concrete = transportConcreteSyntaxSource(text, {language: 'Rust'}), id = hash(key);
            document = {id, path, source: text, sha256, meta: concrete.meta};
            const size = Buffer.byteLength(JSON.stringify(document)); bytes += size;
            if (size > L.packetBytes || bytes > L.outputBytes) fail('original packet document/output bound');
            documents.push(document); inventory.set(key, document);
          }
          return {path, document: document.id};
        });
      }
      const originalRefs = refs(original), history = []; let current = original;
      for (const step of STEPS) {
        const join = cargoJoin(cargo), before = current, inputRefs = refs(before);
        // Actual public APIs reconstruct a fresh complete graph and their own
        // private source/attribute inspection from this phase's entire map.
        const proposal = step.run({entry, files: before, compilationProfile: profile, dependencyInputs: cargo});
        current = applyStep(proposal, before, step, profile, {inputs: cargo, join}, entry);
        history.push({name: step.name, cargoJoin: join, beforeSha256: digest(before), afterSha256: digest(current), inputs: inputRefs, outputs: refs(current), proposal});
      }
      return {schema: 'router-source-backed-core-adoption-sequence-v1', entry, compilationProfile: profile,
        cargo: {inputs: source.cargo, join: source.join}, originalFiles: original, files: current, originalRefs, finalRefs: refs(current), documents, history,
        summary: summary(original, current, history), semanticAdmission: false, executableCoverageGain: null, applicationSourcesInstalled: false,
        sourceCstInverseIsReverseExecution: false, newAcrossInvocationCache: false};
    }}]},
  ]).run(null);
  const result = {...run.value, trace: run.trace};
  reviewSourceBackedCoreAdoptionSequence(result); return result;
}
// Detached DATA readback independently rejoins complete CSTs, source maps,
// inverse coordinates and counts. It grants no private parser/owner authority.
export function reviewSourceBackedCoreAdoptionSequence(value) {
  const result = ownObject(value, 'sequence result');
  if (result.schema !== 'router-source-backed-core-adoption-sequence-v1' || result.semanticAdmission !== false || result.executableCoverageGain !== null || result.applicationSourcesInstalled !== false || result.sourceCstInverseIsReverseExecution !== false || result.newAcrossInvocationCache !== false) fail('distinct source-only sequence contract required');
  const original = files(result.originalFiles), final = files(result.files), profile = normalizeProfile(result.compilationProfile), cargo = dependencies(result.cargo.inputs), join = cargoJoin(cargo);
  if (!same(result.cargo.join, join) || !Array.isArray(result.history) || result.history.length !== STEPS.length || !Array.isArray(result.documents) || result.documents.length > L.packets) fail('complete sequence/Cargo inventory differs');
  if (!Object.hasOwn(original, result.entry) || !same(result.trace?.map(row => row.phase), ['language', 'repository'])) fail('entry or fixed phase trace differs');
  const documents = new Map(), referenced = new Set(); let bytes = 0;
  for (const document of result.documents) {
    const size = Buffer.byteLength(JSON.stringify(document)); bytes += size;
    if (size > L.packetBytes || bytes > L.outputBytes || typeof document.source !== 'string' || document.sha256 !== hash(document.source) || document.id !== hash(JSON.stringify([document.path, document.sha256])) || documents.has(document.id) || transportConcreteSyntaxMeta(document.meta).source !== document.source) fail('complete unique CST document differs');
    IO.pathName(document.path); documents.set(document.id, document);
  }
  function joined(refs) {
    if (!Array.isArray(refs)) fail('complete source references required');
    const map = Object.create(null); let previous = '';
    for (const ref of refs) {
      const document = documents.get(ref.document);
      if (!document || ref.path !== document.path || ref.path <= previous || Object.hasOwn(map, ref.path)) fail('complete ordered source/document join differs');
      previous = ref.path; referenced.add(ref.document); map[ref.path] = document.source;
    }
    return files(map);
  }
  sameFiles(joined(result.originalRefs), original); let current = original;
  for (let at = 0; at < STEPS.length; at++) {
    const step = STEPS[at], history = result.history[at];
    if (history.name !== step.name || !same(history.cargoJoin, join) || history.beforeSha256 !== digest(current)) fail('fresh phase source/Cargo history differs');
    sameFiles(joined(history.inputs), current);
    current = applyStep(history.proposal, current, step, profile, {inputs: cargo, join}, result.entry);
    sameFiles(joined(history.outputs), current);
    if (history.afterSha256 !== digest(current)) fail('complete after-map digest differs');
  }
  sameFiles(current, final); sameFiles(joined(result.finalRefs), final);
  if (referenced.size !== documents.size || !same(result.summary, summary(original, final, result.history))) fail('complete document or distinct-function census differs');
  const inverse = {...final};
  for (const history of [...result.history].reverse()) {
    for (const row of history.proposal.rows) if (row.proposal) {
      if (inverse[row.path] !== row.proposal.after.source) fail('complete step inverse begins at foreign source');
      inverse[row.path] = row.proposal.before.source;
    }
    if (digest(inverse) !== history.beforeSha256) fail('complete step source inverse differs');
  }
  sameFiles(inverse, original);
  return {schema: 'router-source-backed-core-adoption-sequence-readback-v1', summary: result.summary, originalFiles: original, files: final,
    completeSourceInverse: true, semanticAdmission: false, executableCoverageGain: null, applicationSourcesInstalled: false};
}
