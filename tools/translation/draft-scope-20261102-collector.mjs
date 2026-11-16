// Deferred, freshly source-bound observation collector. DATA only: parser identity
// and complete CST fidelity never grant namespace/type/owner/executable authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {draftInventoryPath} from './draft-inventory-reconciliation.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {captureSourceModuleViews, originalSourceModuleItems, originalModuleViewParent} from './source-module-views.mjs';
import {originalDeclarationHeader} from './module-bindings.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {captureOriginalNamespaceFunction, originalNamespaceFunctionFacts,
  originalNamespaceFunctionMembers, ORIGINAL_NAMESPACE_PARSER_LIMITS} from './original-namespace-parser.mjs';
const fail = message => { throw new TypeError('Draft source collector: ' + message); };
const MAX_FILES = 2048, MAX_BYTES = 32 * 1024 * 1024, MAX_OBSERVATIONS = 100_000;
const digest = source => createHash('sha256').update(source).digest('hex');
const noAuthority = Object.freeze({source: false, namespace: false, type: false, owner: false, executable: false});
function ownRecord(value, keys) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) fail('plain own source DATA required');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length || keys.some(key =>
    !Object.hasOwn(descriptors, key) || !Object.hasOwn(descriptors[key], 'value'))) fail('exact own source fields required');
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}
function originalInput(row) {
  const input = ownRecord(row, ['source', 'origin']);
  const source = input.source, origin = ownRecord(input.origin, ['revision', 'path', 'blob', 'mode', 'bytes']);
  if (typeof source !== 'string') fail('complete primitive source required');
  draftInventoryPath(origin.path);
  if (!origin.path.endsWith('.rs') || !/^[a-f0-9]{40}$/u.test(origin.revision) ||
      !/^[a-f0-9]{40}$/u.test(origin.blob) || !['100644', '100755'].includes(origin.mode) ||
      origin.bytes !== Buffer.byteLength(source) || Buffer.from(source, 'utf8').toString('utf8') !== source) fail('physical Rust source origin differs');
  // Git content association only. It is never an admission or parser verdict.
  const blob = createHash('sha1').update('blob ' + origin.bytes + '\0').update(source).digest('hex');
  if (blob !== origin.blob) fail('complete physical Git blob differs');
  return {source, origin: {...origin}};
}
const errorData = error => ({name: error instanceof Error ? error.name : 'ThrownValue',
  message: error instanceof Error ? error.message : 'non-Error thrown value'});
export function collectDraftScopeRustObservations({files, compilationProfile = null} = {}) {
  if (!Array.isArray(files) || files.length > MAX_FILES) fail('bounded complete Rust file array required');
  const sources = [], observations = [], diagnostics = [], seenPaths = new Set(), seenEntries = new Set();
  let bytes = 0, revision = null;
  // This operation owns every original module, item, private frame and AST.
  // None is accepted from the caller or stored across operations.
  for (const raw of files) {
    const {source, origin} = originalInput(raw);
    if (seenPaths.has(origin.path) || revision !== null && revision !== origin.revision) fail('unique physical paths at one revision required');
    seenPaths.add(origin.path); revision = origin.revision; bytes += origin.bytes;
    if (bytes > MAX_BYTES) fail('complete source corpus byte bound');
    const record = {origin, sourceSha256: digest(source), status: 'OPEN',
      originScope: 'content matches supplied Git blob; immutable commit-tree association belongs to the source reader',
      unresolved: ['all-producer-expansions-and-actual-Cargo-unit-configurations', 'actual-production-role-and-adoption-review']};
    sources.push(record);
    if (origin.bytes > ORIGINAL_NAMESPACE_PARSER_LIMITS.sourceBytes) {
      diagnostics.push({origin, kind: 'source-parser-domain', gap: 'complete-source-exceeds-original-namespace-parser-byte-domain'});
      continue;
    }
    let concrete, views;
    try {
      concrete = transportConcreteSyntaxSource(source, {language: 'Rust'});
      const reparsed = transportConcreteSyntaxMeta(concrete.meta);
      if (concrete.source !== source || reparsed.source !== source || reparsed.meta !== concrete.meta) fail('complete serialized/reparsed original Rust CST differs');
      record.concreteSyntax = concrete.meta;
      if (reparsed.document.status !== 'lexical') {
        diagnostics.push({origin, kind: 'concrete-source', gap: 'original-CST-not-lexical', diagnostics: reparsed.document.diagnostics});
        continue;
      }
      views = captureSourceModuleViews({source, sourcePath: origin.path, compilationProfile});
    } catch (error) {
      diagnostics.push({origin, kind: 'source-parser-refusal', error: errorData(error)});
      continue;
    }
    // One scalar-boundary offset table avoids repeatedly encoding every prefix
    // while retaining the original complete UTF-16/UTF-8 source relationship.
    const byteOffsets = new Int32Array(source.length + 1).fill(-1);
    let unitOffset = 0, byteOffset = 0;
    byteOffsets[0] = 0;
    for (const scalar of source) {
      const point = scalar.codePointAt(0);
      unitOffset += scalar.length;
      byteOffset += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
      byteOffsets[unitOffset] = byteOffset;
    }
    function observe({kind, name = null, span, owner, condition, evidence, producer = false}) {
      if (!Number.isSafeInteger(span?.start) || !Number.isSafeInteger(span?.end) ||
          span.start < 0 || span.end <= span.start || span.end > source.length) fail('actual original parsed span required');
      const selected = source.slice(span.start, span.end), byteStart = byteOffsets[span.start], byteEnd = byteOffsets[span.end];
      if (byteStart < 0 || byteEnd < byteStart) fail('original span splits a Unicode scalar');
      const row = {origin, kind, name, owner, span: {unit: 'utf16', start: span.start, end: span.end,
        byteStart, byteEnd}, original: selected,
        condition, evidence, role: 'unclassified', producerExpansion: producer ? 'unknown' : null,
        unresolved: producer ? ['original-producer-owner-input-expansion-and-output-closure-unproved'] :
          ['actual-production-or-test-role-configuration-and-receiving-adoption-review'], authority: noAuthority};
      const key = JSON.stringify([origin.path, kind, span.start, span.end, owner]);
      if (!seenEntries.has(key)) {
        if (observations.length >= MAX_OBSERVATIONS) fail('observation bound');
        seenEntries.add(key); observations.push(row);
      }
    }
    const observedKinds = new Set(['Function', 'Closure', 'ModuleItem', 'TraitItem', 'ImplItem',
      'MacroDefinition', 'OpaqueBang', 'Attribute']);
    let traversalCells = 0;
    function walkParsed(ast, owner, condition, root = true, depth = 0) {
      if (++traversalCells > ORIGINAL_NAMESPACE_PARSER_LIMITS.nodes * 16 ||
          depth > ORIGINAL_NAMESPACE_PARSER_LIMITS.depth * 4) fail('original AST traversal cell/depth bound');
      if (ast === null || typeof ast !== 'object') return;
      if (Array.isArray(ast)) { for (const child of ast) walkParsed(child, owner, condition, false, depth + 1); return; }
      let childOwner = owner;
      if (typeof ast.kind === 'string' && ast.span && ast.fields) {
        if (observedKinds.has(ast.kind)) {
          const producer = ['MacroDefinition', 'OpaqueBang', 'Attribute'].includes(ast.kind);
          observe({kind: root ? 'parsed-function' : 'parsed-' + ast.kind, name: ast.fields.name ?? null,
            span: ast.span, owner, condition: {enclosing: condition, nestedConfiguration: 'unresolved',
              attributeSpans: (ast.fields.attributes ?? []).map(attribute => attribute.span)},
            evidence: 'fresh-private-original-namespace-function', producer});
          if (['Function', 'Closure', 'ModuleItem', 'TraitItem', 'ImplItem'].includes(ast.kind)) {
            childOwner = [...owner, {kind: ast.kind, name: ast.fields.name ?? null, span: ast.span}];
          }
          // Original token-tree bodies remain opaque. Their token spellings
          // are never recursively interpreted as functions or owner bindings.
          if (producer) return;
        }
        walkParsed(ast.fields, childOwner, condition, false, depth + 1);
      } else for (const value of Object.values(ast)) walkParsed(value, owner, condition, false, depth + 1);
    }
    for (const view of views.views) {
      // Rejoin genuine private parent lineage before consuming each view.
      if (view.modulePath.length && !originalModuleViewParent(view)) fail('original inline-module parent missing');
      const module = {source, file: origin.path, path: view.modulePath,
        sourceView: view, compilationProfile: view.compilationProfile};
      const items = originalSourceModuleItems(module), owner = view.modulePath.map(name => ({kind: 'module', name}));
      if (view.bodySpan.end > view.bodySpan.start) observe({kind: 'module-view', name: view.modulePath.at(-1) ?? origin.path,
        span: view.bodySpan, owner, condition: view.configurationCondition, evidence: 'genuine-private-source-module-view'});
      for (const item of items) {
        let header, configuration, headerError = null;
        try {
          header = originalDeclarationHeader(item, module.path);
          if (header) configuration = itemConfiguration(item.tokens, view.compilationProfile);
        } catch (error) { headerError = errorData(error); }
        if (!header || !configuration || headerError !== null) {
          observe({kind: 'opaque-item-producer-review', span: {start: item.start, end: item.end},
            owner, condition: {module: view.configurationCondition, item: 'unknown'},
            evidence: 'genuine-private-module-item-unresolved-header', producer: true});
          diagnostics.push({origin, kind: 'declaration-header', span: {start: item.start, end: item.end}, gap: 'original-declaration-header-or-configuration-unresolved', error: headerError});
          continue;
        }
        const condition = {module: view.configurationCondition, item: configuration.status};
        observe({kind: 'original-' + header.kind, name: header.name ?? null,
          span: {start: item.start, end: item.end}, owner, condition, evidence: 'genuine-private-module-item',
          producer: ['macro_rules!', 'macro'].includes(header.kind)});
        for (const attribute of configuration.attributes ?? []) observe({kind: 'attribute-producer', name: attribute.name,
          span: attribute.span, owner, condition, evidence: 'original-declaration-attribute-span', producer: true});
        let members;
        try {
          members = header.kind === 'fn' ? [{memberIndex: null, kind: 'fn'}] :
            ['impl', 'trait'].includes(header.kind) ? originalNamespaceFunctionMembers({module, item}) : [];
        } catch (error) {
          diagnostics.push({origin, kind: 'original-member-refusal', span: {start: item.start, end: item.end}, error: errorData(error)});
          continue;
        }
        for (const member of members) {
          if (member.kind !== 'fn') {
            diagnostics.push({origin, kind: 'nonfunction-member', member, gap: 'original-associated-item-or-producer-review-required'});
            continue;
          }
          const options = {module, item, memberIndex: member.memberIndex};
          const observationStart = observations.length;
          try {
            const frame = captureOriginalNamespaceFunction(options), facts = originalNamespaceFunctionFacts(frame, options);
            const parsedOwner = member.memberIndex === null ? owner : [...owner,
              {kind: header.kind, name: header.name ?? null, span: {start: item.start, end: item.end}}];
            traversalCells = 0;
            walkParsed(facts.ast, parsedOwner, condition);
            // Fresh private parser/source-view/member/profile association is
            // required after walking. Copied facts or public flags cannot join.
            if (originalNamespaceFunctionFacts(frame, options) !== facts) fail('original private function facts changed');
          } catch (error) {
            // A failed closing private join discards every observation drafted
            // from this frame; no partially traversed result survives refusal.
            for (const row of observations.splice(observationStart)) {
              seenEntries.delete(JSON.stringify([origin.path, row.kind, row.span.start, row.span.end, row.owner]));
            }
            diagnostics.push({origin, kind: 'original-function-refusal', itemSpan: {start: item.start, end: item.end},
              memberIndex: member.memberIndex, error: errorData(error)});
          }
        }
      }
      originalSourceModuleItems(module);
    }
    diagnostics.push(...views.diagnostics.map(diagnostic => ({origin, kind: 'original-module-review', diagnostic})));
    if (transportConcreteSyntaxMeta(concrete.meta).source !== source) fail('closing complete original source CST differs');
  }
  return {schema: 'router-fresh-original-scope-observations-20261102-v1', revision,
    sources, observations, diagnostics, productionFunctionDenominator: null,
    translationCoverage: null, authority: noAuthority, verification: 'UNRUN',
    remainingScope: ['all-files-and-entrypoints', 'all-configuration-and-producer-expansions',
      'generated-test-application-dependency-role-review', 'actual-implementation-and-receiving-adoption-mappings']};
}
