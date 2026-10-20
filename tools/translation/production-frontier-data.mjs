// DATA analysis only. Stored compiler diagnostics never become fresh verdicts.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {rustTokens} from './rust-structure.mjs';

export const frontierDataSchema = 'production-translation-frontier-DATA-v1';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new TypeError('Production frontier DATA: ' + message); };
const production = name => name.startsWith('rust/src/') && !/tests|test_support/u.test(name);
const order = (a, b) => b.functions.length - a.functions.length || a.key.localeCompare(b.key);
const unique = rows => [...new Set(rows)].sort((a, b) => a - b);
const position = row => JSON.stringify([row.path, row.name, row.span.start, row.span.end]);
const relative = name => {
  if (typeof name !== 'string' || !name || name.includes('\\') || name.startsWith('/') ||
      /[\x00-\x1f]/u.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) fail('relative input path required');
  return name;
};

// Families organize actual stored messages. They neither infer a new refusal
// nor imply that every message in a family has the same implementation repair.
export function refusalFamily(message) {
  if (/format!/u.test(message)) return 'format-owner-and-context';
  if (/matches!/u.test(message)) return 'matches-owner-and-context';
  if (/json!/u.test(message)) return 'json-owner-and-context';
  if (/shadowed|unproven standard|unresolved type|unknown type/u.test(message)) return 'source-namespace-and-identity';
  if (/mutable reference|mutable shared reference|assignment target|mut pattern|mutable closure/u.test(message)) return 'mutation-and-borrowing';
  if (/generic function|turbofish/u.test(message)) return 'generic-functions';
  if (/generic types/u.test(message)) return 'generic-type-layouts';
  if (/macro .*requires actual source macro/u.test(message)) return 'other-macro-owner-and-context';
  if (/compilation|configuration|cfg/u.test(message)) return 'configuration';
  return 'other-stored-refusals';
}

function rankedGroups(rows, keyOf, memberOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (!groups.has(key)) groups.set(key, {key, records: [], functions: []});
    const group = groups.get(key);
    group.records.push(row.index);
    group.functions.push(...memberOf(row));
  }
  return [...groups.values()].map(row => ({...row, functions: unique(row.functions)})).sort(order);
}

function overlap(groups) {
  const rows = [];
  for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
    const right = new Set(groups[b].functions);
    const functions = groups[a].functions.filter(index => right.has(index));
    if (functions.length) rows.push({left: groups[a].key, right: groups[b].key, functions});
  }
  return rows.sort((a, b) => b.functions.length - a.functions.length || a.left.localeCompare(b.left));
}

/** Inputs are complete owned JSON/byte data, plus a reader for current repository
 * bytes. The reader is called again on every invocation; no compiler is run and
 * no verdict, inventory, scan or cross-invocation cache is consulted. */
export function productionFrontierData({inventoryBytes, functionEvidenceBytes, projectDescriptorBytes, readInput}) {
  if (!Buffer.isBuffer(inventoryBytes) || !Buffer.isBuffer(functionEvidenceBytes) ||
      !Buffer.isBuffer(projectDescriptorBytes) || typeof readInput !== 'function') fail('complete input bytes and current reader required');
  const parse = bytes => JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  const inventory = parse(inventoryBytes), evidence = parse(functionEvidenceBytes), descriptor = parse(projectDescriptorBytes);
  const root = descriptor.schema === 'bounded-project-meta-storage-v1' ? descriptor.root : descriptor;
  if (inventory.kind !== 'draft-translation-inventory' || !Array.isArray(inventory.sources) ||
      !inventory.implementationHashes || !inventory.functionCoverage?.production) fail('complete retained inventory required');
  if (evidence.schema !== 'complete-original-function-priority-DATA-v1' ||
      evidence.inventorySha256 !== sha256(inventoryBytes) || !Array.isArray(evidence.sources) ||
      !Array.isArray(evidence.functions) || !isDeepStrictEqual(evidence.originalFunctionCoverage, inventory.functionCoverage)) fail('function evidence/inventory identity differs');
  if (root?.schema !== 'tracked-rust-project-semantic-meta-v1' || !Array.isArray(root.sources) ||
      !Array.isArray(root.refused) || !Array.isArray(root.executable) || !Array.isArray(root.moduleDiagnostics)) fail('complete stored project root required');

  const expected = inventory.functionCoverage.production;
  if (evidence.functions.length !== expected.topLevelFunctions ||
      evidence.functions.filter(row => row.status === 'executable').length !== expected.executableFunctions ||
      evidence.functions.filter(row => row.status === 'carried').length !== expected.carriedFunctions) fail('function inventory counts differ');
  const sourceMap = new Map(), vectors = [], loaded = new Map();
  const observe = name => {
    relative(name);
    if (!loaded.has(name)) {
      const value = readInput(name);
      if (value !== null && value !== undefined && !Buffer.isBuffer(value)) fail('reader must return complete bytes or null');
      loaded.set(name, value ?? null);
    }
    return loaded.get(name);
  };
  const vector = (role, name, expectedSha256, expectedBytes) => {
    relative(name);
    if (!/^[a-f0-9]{64}$/u.test(expectedSha256)) fail('complete SHA256 vector required');
    const bytes = observe(name), observedSha256 = bytes === null ? null : sha256(bytes);
    const status = bytes === null ? 'missing' : observedSha256 !== expectedSha256 ||
      (expectedBytes !== undefined && expectedBytes !== bytes.length) ? 'changed' : 'matching';
    vectors.push({role, path: name, expectedSha256, expectedBytes: expectedBytes ?? null,
      observedSha256, observedBytes: bytes?.length ?? null, status});
    return bytes;
  };
  const inventoryNames = new Set();
  for (const row of inventory.sources) {
    if (inventoryNames.has(row.source)) fail('duplicate inventory source');
    inventoryNames.add(row.source);
    vector('inventory-source', row.source, row.sha256, row.bytes);
  }
  for (const [name, hash] of Object.entries(inventory.implementationHashes)) vector('stored-compiler-input', name, hash);
  const evidenceNames = new Set(), retainedItems = new Map();
  for (const row of evidence.sources) {
    if (!production(row.path) || evidenceNames.has(row.path) || !inventoryNames.has(row.path) ||
        typeof row.source !== 'string' || sha256(row.source) !== row.sha256 || Buffer.byteLength(row.source) !== row.bytes) fail('source evidence identity differs');
    evidenceNames.add(row.path);
    const inventoryRow = inventory.sources.find(input => input.source === row.path);
    if (row.sha256 !== inventoryRow.sha256 || row.bytes !== inventoryRow.bytes) fail('source evidence/inventory hash differs');
    if (inventoryRow.targets?.meta !== row.metaPath) fail('source metadata path differs');
    const metaBytes = vector('stored-source-metadata', row.metaPath, row.metaSha256, row.metaBytes);
    if (!metaBytes || sha256(metaBytes) !== row.metaSha256 || metaBytes.length !== row.metaBytes) fail('complete retained source metadata missing or changed');
    const meta = parse(metaBytes);
    if (!Array.isArray(meta.items)) fail('complete retained source items required');
    retainedItems.set(row.path, meta.items.filter(item => item.term === 'fn'));
    sourceMap.set(row.path, row);
  }
  const expectedNames = inventory.sources.filter(row => production(row.source)).map(row => row.source);
  if (expectedNames.length !== evidenceNames.size || expectedNames.some(name => !evidenceNames.has(name))) fail('missing complete production source evidence');
  const projectSources = new Map();
  for (const row of root.sources) {
    if (projectSources.has(row.source)) fail('duplicate project source');
    projectSources.set(row.source, row);
    vector('stored-project-source', row.source, row.sha256);
  }

  const positions = new Set(), functionsByPath = new Map();
  const functions = evidence.functions.map((row, index) => {
    const source = sourceMap.get(row.path), span = row.span;
    if (!source || !span || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end) ||
        span.start < 0 || span.end <= span.start || span.end > source.source.length || span.unit !== 'utf16' ||
        source.source.slice(span.start, span.end) !== row.body || sha256(row.body) !== row.sha256 ||
        Buffer.byteLength(source.source.slice(0, span.start)) !== span.byteStart ||
        Buffer.byteLength(source.source.slice(0, span.end)) !== span.byteEnd) fail('function source/hash/span differs');
    if (positions.has(position(row))) fail('duplicate function identity');
    positions.add(position(row));
    if (!functionsByPath.has(row.path)) functionsByPath.set(row.path, []);
    functionsByPath.get(row.path).push(index);
    return {...row, index, storedRefusals: [], tokenUses: []};
  });
  const scanFailures = [], tokensByPath = new Map();
  for (const [name, source] of sourceMap) {
    const items = retainedItems.get(name), retained = (functionsByPath.get(name) ?? []).map(index => functions[index]);
    if (items.length !== retained.length || items.some(item => !retained.some(row =>
        row.name === item.name && isDeepStrictEqual(row.span, item.span) && row.sha256 === item.sha256 &&
        row.status === item.status && isDeepStrictEqual(row.diagnostic ?? null, item.diagnostic ?? null)))) fail('complete retained function metadata differs: ' + name);
    try {
      tokensByPath.set(name, rustTokens(source.source).filter(row => row.type !== 'comment' && row.type !== 'string' && row.type !== 'char'));
    } catch (error) {
      if (error.message.startsWith('Production frontier DATA:')) throw error;
      scanFailures.push({path: name, message: error.message});
    }
  }

  const refusals = root.refused.map((row, index) => {
    const candidates = functionsByPath.get(row.file) ?? [];
    const matches = row.term === 'fn' && production(row.file) ? candidates.filter(number => {
      const fn = functions[number], span = row.span;
      return fn.name === row.name && span && span.start >= fn.span.start && span.end <= fn.span.end;
    }) : [];
    const source = sourceMap.get(row.file), projectSource = projectSources.get(row.file);
    const sourceMatches = Boolean(source && projectSource?.sha256 === source.sha256);
    const joined = matches.length === 1 && sourceMatches ? matches : [];
    for (const number of joined) functions[number].storedRefusals.push(index);
    return {...row, index, family: refusalFamily(row.message ?? ''), functions: joined,
      join: !production(row.file) || row.term !== 'fn' ? 'outside-production-fn-scope' :
        !sourceMatches ? 'stored-project-source-mismatch' : matches.length === 1 ? 'source-hash-name-enclosing-span' :
          matches.length ? 'ambiguous-function' : 'no-inventory-function',
      diagnosticText: sourceMatches && row.span ? source.source.slice(row.span.start, row.span.end) : null};
  });
  const productionRefusals = refusals.filter(row => row.term === 'fn' && production(row.file));
  const exact = rankedGroups(productionRefusals, row => JSON.stringify([row.kind, row.message]), row => row.functions);
  const families = rankedGroups(productionRefusals, row => row.family, row => row.functions);
  // Token selectors come from observed diagnostics plus a small explicit set of
  // source forms. Identifiers are occurrences, never resolved types or owners.
  const selectors = new Set(['format!', 'matches!', 'json!', 'vec!', 'println!', 'eprintln!', 'await', 'async']);
  for (const row of productionRefusals) {
    for (const match of (row.message ?? '').matchAll(/(?:type\s*:?\s+|shadowed (?:borrowed )?)([A-Za-z_][A-Za-z_0-9:]*)/gu)) selectors.add(match[1].split('::').at(-1));
    for (const match of (row.message ?? '').matchAll(/\b[A-Za-z_][A-Za-z_0-9]*!/gu)) selectors.add(match[0]);
  }
  const tokenGroups = new Map();
  for (const fn of functions) {
    if (fn.status !== 'carried') continue;
    const tokens = tokensByPath.get(fn.path) ?? [];
    for (let at = 0; at < tokens.length; at++) {
      const token = tokens[at];
      if (token.start < fn.span.start || token.end > fn.span.end) continue;
      const separatedMacro = token.type === 'ident' && tokens[at + 1]?.text === '!' && selectors.has(token.text + '!');
      const key = separatedMacro ? token.text + '!' : selectors.has(token.text) ? token.text : token.text === '&' && tokens[at + 1]?.text === 'mut' ? '& mut' : null;
      if (key === null) continue;
      const pair = key === '& mut' || separatedMacro;
      const use = {key, span: {start: token.start, end: pair ? tokens[at + 1].end : token.end},
        tokenTypes: pair ? [token.type, tokens[at + 1].type] : [token.type]};
      fn.tokenUses.push(use);
      if (!tokenGroups.has(key)) tokenGroups.set(key, {key, occurrences: 0, functions: []});
      const group = tokenGroups.get(key); group.occurrences++; group.functions.push(fn.index);
    }
  }
  const tokenUsage = [...tokenGroups.values()].map(row => ({...row, functions: unique(row.functions)})).sort(order);
  const batches = families.map(row => ({...row,
    tokenOverlap: tokenUsage.map(group => ({key: group.key, functions: group.functions.filter(index => row.functions.includes(index))})).filter(group => group.functions.length).sort(order),
    sourceUnits: [...new Set(row.functions.map(index => functions[index].path))].sort(),
    qualification: 'Historical first-refusal investigation batch; removing it can expose another refusal. No predicted executable gain.'}));
  const joinedFunctions = unique(productionRefusals.flatMap(row => row.functions));
  const changedCompiler = vectors.filter(row => row.role === 'stored-compiler-input' && row.status === 'changed');
  const missingCompiler = vectors.filter(row => row.role === 'stored-compiler-input' && row.status === 'missing');
  const target = Math.ceil(expected.topLevelFunctions * 0.8);
  return {
    schema: frontierDataSchema, representationLevel: 'DATA', runtimeParity: false, semanticAuthority: false,
    freshCompilerExecuted: false, rustExecuted: false, executableGainMeasured: 0,
    scope: inventory.functionCoverage.scope, productionPathRule: inventory.functionCoverage.productionPathRule,
    limitations: ['Stored diagnostics are historical, even when source and compiler hashes match.',
      'A first refusal is not an exhaustive list of blockers. Group and token counts must not be added as coverage gains.',
      'Token occurrences exclude opaque literals/comments but grant no grammar, namespace, type, ownership or execution authority.',
      'Stored project semantic/concrete components are described but deliberately not loaded or validated.'],
    inputDocuments: {inventory: {bytes: inventoryBytes.length, sha256: sha256(inventoryBytes)},
      functionEvidence: {bytes: functionEvidenceBytes.length, sha256: sha256(functionEvidenceBytes)},
      projectDescriptor: {bytes: projectDescriptorBytes.length, sha256: sha256(projectDescriptorBytes)}},
    historicalCoverage: {...expected, targetFraction: 0.8, targetFunctions: target,
      additionalExecutableFunctionsRequired: Math.max(0, target - expected.executableFunctions)},
    staleness: {storedTranslatorCommit: inventory.translatorCommit ?? null, verdictStatus: 'historical-not-reexecuted',
      compilerStatus: missingCompiler.length ? 'incomplete-current-inputs' : changedCompiler.length ? 'stale-stored-compiler' : 'hashes-match-no-fresh-verdict',
      changedCompilerInputs: changedCompiler.length, missingCompilerInputs: missingCompiler.length,
      changedSourceInputs: vectors.filter(row => row.role === 'inventory-source' && row.status === 'changed').length,
      missingSourceInputs: vectors.filter(row => row.role === 'inventory-source' && row.status === 'missing').length},
    completeness: {productionSources: sourceMap.size, productionFunctions: functions.length,
      projectProductionRefusalRecords: productionRefusals.length, joinedRefusalRecords: productionRefusals.filter(row => row.functions.length === 1).length,
      distinctJoinedFunctions: joinedFunctions.length, unjoinedRefusalRecords: productionRefusals.filter(row => row.functions.length !== 1).map(row => row.index),
      inventoryFunctionsWithoutStoredProjectRefusal: functions.filter(row => row.status === 'carried' && !row.storedRefusals.length).map(row => row.index),
      tokenScanFailures: scanFailures},
    vectors, sources: inventory.sources.map(row => ({...row, observedSource: observe(row.source) === null ? null : new TextDecoder('utf-8', {fatal: true}).decode(observe(row.source)),
      retainedProductionSource: sourceMap.get(row.source)?.source ?? null})),
    functions, projectDescriptor: descriptor, refusals, exactRefusalGroups: exact, investigationBatches: batches,
    refusalFamilyOverlap: overlap(families), tokenUsage, tokenUsageOverlap: overlap(tokenUsage),
  };
}
