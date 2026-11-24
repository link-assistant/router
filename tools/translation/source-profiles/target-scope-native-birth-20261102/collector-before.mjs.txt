// Deferred native JS/TS syntax/scope observations only. No project evaluation,
// semantic admission, generation, translation or executable-function census.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {draftInventoryPath} from './draft-inventory-reconciliation.mjs';
import {ownershipCompiler, ownershipCompilerRuntimeNativeCurrent,
  ownershipCompilerRuntimeOriginData} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const MAX_FILES = 4096, MAX_BYTES = 32 * 1024 * 1024, MAX_FILE_BYTES = 1_048_576;
const MAX_CELLS = 500_000, MAX_DEPTH = 512, MAX_OBSERVATIONS = 100_000;
const authority = Object.freeze({source: false, namespace: false, type: false, owner: false, executable: false});
const fail = message => { throw new TypeError('Draft target scope collector: ' + message); };
const errorData = error => ({name: error instanceof Error ? error.name : 'ThrownValue',
  message: error instanceof Error ? error.message : 'non-Error thrown value'});
function ownData(value, names) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) fail('plain own source DATA required');
  const fields = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(fields).length !== names.length || names.some(name =>
    !Object.hasOwn(fields, name) || !Object.hasOwn(fields[name], 'value'))) fail('exact own source fields required');
  return Object.fromEntries(names.map(name => [name, fields[name].value]));
}
function input(row) {
  const {source, origin: rawOrigin} = ownData(row, ['source', 'origin']);
  const origin = ownData(rawOrigin, ['revision', 'path', 'blob', 'mode', 'bytes']);
  draftInventoryPath(origin.path);
  if (typeof source !== 'string' || !/\.(?:[cm]?[jt]s|[jt]sx)$/u.test(origin.path) ||
      !/^[a-f0-9]{40}$/u.test(origin.revision) || !/^[a-f0-9]{40}$/u.test(origin.blob) ||
      !['100644', '100755'].includes(origin.mode) || origin.bytes !== Buffer.byteLength(source) ||
      Buffer.from(source).toString('utf8') !== source) fail('complete original target source/origin required');
  const blob = createHash('sha1').update('blob ' + origin.bytes + '\0').update(source).digest('hex');
  if (blob !== origin.blob) fail('whole original target Git content differs');
  return {source, origin};
}
function scalarOffsets(source) {
  const offsets = new Int32Array(source.length + 1).fill(-1); offsets[0] = 0;
  let unit = 0, byte = 0;
  for (const scalar of source) {
    const point = scalar.codePointAt(0); unit += scalar.length;
    byte += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    offsets[unit] = byte;
  }
  return offsets;
}
export function collectDraftScopeTargetObservations({files} = {}) {
  if (!Array.isArray(files) || files.length > MAX_FILES) fail('bounded complete target source array required');
  const sources = [], observations = [], diagnostics = [], paths = new Set();
  let revision = null, bytes = 0;
  // Always obtain the actual original compiler through its existing loader.
  // No caller compiler, SourceFile, symbol table, parser frame or callback enters.
  const ts = ownershipCompiler();
  if (ts.version !== '5.9.3' || !ownershipCompilerRuntimeNativeCurrent(ts)) fail('actual original pinned native compiler unavailable');
  const epoch = ownershipCompilerRuntimeOriginData(ts);
  if (epoch === null) fail('original private native compiler physical load origin is unknown');
  const originalEpoch = JSON.stringify(epoch);
  // Lifecycle pins for all public exports used by AST classification/checking.
  // These do NOT extend the original private issuer's selected birth snapshot;
  // complete native predicate/checker export qualification remains UNPROVED.
  const exportPins = Object.getOwnPropertyDescriptors(ts);
  const exportNames = Reflect.ownKeys(exportPins);
  const exportCurrent = () => {
    const actual = Object.getOwnPropertyDescriptors(ts), names = Reflect.ownKeys(actual);
    if (names.length !== exportNames.length || names.some((name, index) => name !== exportNames[index])) fail('native export lifecycle fields changed');
    for (const name of exportNames) {
      const before = exportPins[name], after = actual[name];
      for (const key of ['value', 'get', 'set', 'writable', 'enumerable', 'configurable']) {
        if (Object.hasOwn(before, key) !== Object.hasOwn(after, key) || before[key] !== after[key]) fail('native export lifecycle descriptor changed');
      }
    }
  };
  const current = () => {
    exportCurrent();
    if (!ownershipCompilerRuntimeNativeCurrent(ts) || ts.version !== '5.9.3' ||
        JSON.stringify(ownershipCompilerRuntimeOriginData(ts)) !== originalEpoch) fail('original private native compiler/source epoch changed');
  };
  for (const row of files) {
    const {source, origin} = input(row);
    if (paths.has(origin.path) || revision !== null && origin.revision !== revision) fail('unique original target files at one revision required');
    paths.add(origin.path); revision = origin.revision; bytes += origin.bytes;
    if (bytes > MAX_BYTES) fail('complete target source byte bound');
    const language = /\.(?:[cm]?ts|tsx)$/u.test(origin.path) ? 'TypeScript' : 'JavaScript';
    const record = {origin, language, status: 'OPEN', nativeScope: 'UNRUN',
      originScope: 'whole bytes match claimed Git content; source reader must establish immutable tree association',
      unresolved: ['authored-generated-test-application-dependency-role-review', 'actual-import-export-entrypoint-and-adoption-closure',
        'complete-private-native-predicate-and-checker-export-closure-unproved']};
    sources.push(record);
    if (origin.bytes > MAX_FILE_BYTES) {
      diagnostics.push({origin, kind: 'native-source-domain', gap: 'complete-source-exceeds-explicit-target-observation-domain'});
      continue;
    }
    current();
    const concrete = transportConcreteSyntaxSource(source, {language});
    const reparsed = transportConcreteSyntaxMeta(concrete.meta);
    if (concrete.source !== source || reparsed.source !== source || reparsed.meta !== concrete.meta) fail('whole serialized/reparsed target CST differs');
    record.concreteSyntax = concrete.meta;
    if (reparsed.document.status !== 'lexical') {
      diagnostics.push({origin, kind: 'native-source-CST', gap: 'complete-original-CST-not-lexical', diagnostics: reparsed.document.diagnostics});
      continue;
    }
    const scriptKind = origin.path.endsWith('.tsx') ? ts.ScriptKind.TSX : origin.path.endsWith('.jsx') ? ts.ScriptKind.JSX :
      language === 'TypeScript' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const file = ts.createSourceFile(origin.path, source, ts.ScriptTarget.Latest, true, scriptKind);
    if (file.text !== source || file.fileName !== origin.path) fail('native original complete filename/source association differs');
    if (file.parseDiagnostics.length) {
      diagnostics.push({origin, kind: 'native-grammar-refusal', diagnostics: file.parseDiagnostics.map(diagnostic =>
        ({code: diagnostic.code, start: diagnostic.start ?? null, length: diagnostic.length ?? null,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}))});
      current();
      if (transportConcreteSyntaxMeta(concrete.meta).source !== source) fail('closing refused native grammar CST differs');
      continue;
    }
    try {
      if (/\.[jt]sx$/u.test(origin.path)) fail('original source-binding checker has no qualified JSX/TSX profile');
      record.nativeScope = verifyNativeCopiedSourceBindings(ts, origin.path, source);
    } catch (error) {
      // Lexical grammar observations remain useful DATA, but a real original
      // binding refusal cannot become accepted scope or executable authority.
      record.nativeScope = 'REFUSED'; diagnostics.push({origin, kind: 'native-binding-refusal', error: errorData(error)});
    }
    const offsets = scalarOffsets(source), pending = [];
    let cells = 0;
    const span = node => {
      const start = node.getStart(file), end = node.end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > source.length ||
          offsets[start] < 0 || offsets[end] < 0 || node.getSourceFile() !== file) fail('actual original native node source/span association differs');
      return {unit: 'utf16', start, end, byteStart: offsets[start], byteEnd: offsets[end]};
    };
    const syntacticBinding = node => {
      const parent = node.parent;
      if (!parent || !parent.name || ![parent.initializer, parent.expression].includes(node)) return null;
      if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) {
        return {name: parent.name.getText(file), span: span(parent.name)};
      }
      return null;
    };
    const name = node => node.name ? node.name.getText(file) : ts.isConstructorDeclaration(node) ? '<constructor>' : syntacticBinding(node)?.name ?? null;
    function visit(node, owner, depth = 0) {
      if (++cells > MAX_CELLS || depth > MAX_DEPTH) fail('native target AST cell/depth bound');
      if (node !== file && (!node.parent || node.getSourceFile() !== file)) fail('original native AST parent/source identity differs');
      let kind = null;
      if (ts.isFunctionDeclaration(node)) kind = 'function-declaration';
      else if (ts.isFunctionExpression(node)) kind = 'function-expression';
      else if (ts.isArrowFunction(node)) kind = 'arrow-function';
      else if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) kind = 'method';
      else if (ts.isConstructorDeclaration(node)) kind = 'constructor';
      else if (ts.isGetAccessorDeclaration(node)) kind = 'getter';
      else if (ts.isSetAccessorDeclaration(node)) kind = 'setter';
      else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) kind = 'class';
      else if (ts.isModuleDeclaration(node)) kind = 'module';
      else if (ts.isInterfaceDeclaration(node)) kind = 'interface';
      else if (ts.isTypeAliasDeclaration(node)) kind = 'type-alias';
      else if (ts.isTypeLiteralNode(node)) kind = 'type-literal';
      else if (ts.isObjectLiteralExpression(node)) kind = 'object-literal';
      else if (ts.isFunctionTypeNode(node)) kind = 'function-type';
      else if (ts.isDecorator(node)) kind = 'decorator-producer';
      else if (ts.isImportDeclaration(node)) kind = 'import';
      else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) kind = 'export';
      let nextOwner = owner;
      if (kind !== null) {
        if (observations.length + pending.length >= MAX_OBSERVATIONS) fail('native target observation bound');
        const originalSpan = span(node), selected = source.slice(originalSpan.start, originalSpan.end);
        pending.push({origin, language, kind, name: name(node), syntacticBinding: syntacticBinding(node),
          owner, span: originalSpan, original: selected,
          nativeScope: record.nativeScope === 'REFUSED' ? 'REFUSED' : 'source-binding-check-only',
          role: 'unclassified', producerExpansion: kind === 'decorator-producer' ? 'unknown' : null,
          evidence: 'actual-original-native-SourceFile-node', authority,
          unresolved: ['complete-production-role-entrypoint-and-receiving-adoption-review']});
        if (!['import', 'export'].includes(kind)) nextOwner = [...owner, {kind, name: name(node), span: originalSpan}];
      }
      ts.forEachChild(node, child => {
        if (child.parent !== node) fail('original native direct-parent identity differs');
        visit(child, nextOwner, depth + 1);
      });
    }
    try {
      visit(file, []);
      current();
      if (file.text !== source || transportConcreteSyntaxMeta(concrete.meta).source !== source) fail('closing original native source/CST association differs');
      for (const observation of pending) observations.push(observation);
    } catch (error) {
      // No partial AST output survives a traversal/source/host epoch refusal.
      diagnostics.push({origin, kind: 'native-observation-refusal', error: errorData(error)});
      current();
    }
  }
  current();
  return {schema: 'router-native-target-scope-observations-20261102-v1', revision,
    compilerOrigin: epoch, nativeExportClosure: 'UNPROVED', sources, observations, diagnostics, authority,
    productionFunctionDenominator: null, translationCoverage: null, verification: 'UNRUN',
    remainingScope: ['complete-source-root-and-export-closure', 'all-production-role-and-entrypoint-review',
      'native-dependency-and-producer-boundaries', 'actual-requirement-and-receiving-adoption-mappings']};
}
