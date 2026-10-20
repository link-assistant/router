// Native TypeScript AST and serialized/reparsed CST source producer. No verdicts.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync, gzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {rustTokens, sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta, applyConcreteSyntaxSubstitutions, serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';

export const CORE_VECTOR_RUST_ORACLE_SOURCE = "//! Independent native oracle for the owned vector construction boundary.\n//! Run in CI only, after the complete same-head JavaScript gate.\n\nuse link_assistant_router::translation_core;\n\n#[test]\nfn primitive_text_and_empty_vectors() {\n    let numbers: Vec<u8> = translation_core::vec![0_u8, 255_u8, 7_u8];\n    assert_eq!(numbers, [0, 255, 7]);\n    let flags: Vec<bool> = translation_core::vec![true, false];\n    assert_eq!(flags, [true, false]);\n    let empty: Vec<bool> = translation_core::vec![];\n    assert!(empty.is_empty());\n    let headers: Vec<&'static translation_core::Str> =\n        translation_core::vec![\"user-agent\", \"😀\", \"content-type\"];\n    assert_eq!(headers, [\"user-agent\", \"😀\", \"content-type\"]);\n    let text: Vec<translation_core::Text> = translation_core::vec![\n        translation_core::format!(\"alpha\"),\n        translation_core::format!(\"{}\", \"beta\"),\n    ];\n    assert_eq!(text, [\"alpha\", \"beta\"]);\n}\n\n#[test]\nfn each_operand_runs_once_in_source_order() {\n    let mut observations = Vec::new();\n    let values = translation_core::vec![\n        {\n            observations.push(1);\n            4_u8\n        },\n        {\n            observations.push(2);\n            5_u8\n        },\n    ];\n    assert_eq!(observations, [1, 2]);\n    assert_eq!(values, [4, 5]);\n}\n\n#[test]\nfn borrowed_elements_keep_their_original_lifetime() {\n    let value = String::from(\"borrowed 😀\");\n    let references: Vec<&translation_core::Str> = translation_core::vec![value.as_str()];\n    assert_eq!(references, [\"borrowed 😀\"]);\n    assert_eq!(value, \"borrowed 😀\");\n}\n";
const hash = text => createHash('sha256').update(text).digest('hex');
const fail = message => { throw new TypeError('Owned vector source producer: ' + message); };
function transform(source, language, edits, id) {
  const before = transportConcreteSyntaxSource(source, {language});
  const applied = applyConcreteSyntaxSubstitutions(before.document, {
    languageRules: [{id: language.toLowerCase() + ':retain-complete-original-source', edits: []}],
    repositoryRules: [{id, edits: edits.sort((a, b) => a.span[0] - b.span[0])}],
  });
  const afterMeta = serializeConcreteSyntaxMeta(applied.value), after = transportConcreteSyntaxMeta(afterMeta);
  const inverse = applyConcreteSyntaxSubstitutions(applied.value, {languageRules: [],
    repositoryRules: [{id: id + ':whole-inverse', edits: [{span: [0, after.source.length], expected: after.source, replacement: source}]}]});
  if (transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== source) fail('complete source inverse differs');
  return {before: source, after: after.source, beforeMeta: before.meta, afterMeta, inverse: source, edits, trace: applied.trace,
    beforeSha256: hash(source), afterSha256: hash(after.source)};
}
export function prepareCoreVectorSources({facade, sourceData, hostSource}) {
  for (const source of [facade, sourceData, hostSource]) if (typeof source !== 'string' || source.length > 2_000_000) fail('complete bounded original inputs required');
  const ts = ownershipCompiler();
  if (ts.version !== '5.9.3') fail('installed native TypeScript 5.9.3 required');
  const parse = (name, source) => {
    const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    if (file.parseDiagnostics.length) fail('complete native JavaScript syntax required: ' + name);
    return file;
  };
  return createRulePipeline([
    {phase: 'language', rules: [{id: 'owned-vector:actual-native-source-anchors', apply: () => {
      if (facade.includes('__router_translation_core_vec') || hostSource.includes('parseRouterCoreVector')) fail('fresh vector extension required');
      const dataFile = parse('router-core-source-data.mjs', sourceData);
      const declarations = dataFile.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations]);
      const field = name => {
        const rows = declarations.filter(row => ts.isIdentifier(row.name) && row.name.text === name);
        if (rows.length !== 1 || !rows[0].initializer || !ts.isStringLiteral(rows[0].initializer)) fail('one complete native source literal required: ' + name);
        return rows[0].initializer;
      };
      const oldSource = field('ROUTER_FORMATTING_FACADE_SOURCE'), oldHash = field('ROUTER_FORMATTING_FACADE_SHA256');
      if (oldSource.text !== facade || oldHash.text !== hash(facade)) fail('actual facade/source DATA differs');
      const macros = sourceItems(facade).filter(item => item.term === 'macro_rules!' && item.name === '__router_translation_core_format');
      if (macros.length !== 1) fail('one complete owned format wrapper required');
      const macro = facade.slice(macros[0].start, macros[0].end), tokens = rustTokens(macro), edits = [];
      for (let at = 0; at < tokens.length; at++) {
        const token = tokens[at];
        if (token.text === '__router_translation_core_format') edits.push({span: [token.start, token.end], expected: token.text, replacement: '__router_translation_core_vec'});
        if (token.text === 'format!' && tokens[at - 1]?.text === '::' && tokens[at - 2]?.text === 'std' && tokens[at - 3]?.text === '::') {
          edits.push({span: [token.start, token.end], expected: token.text, replacement: 'vec!'});
        }
      }
      if (edits.length !== 2) fail('actual wrapper definition and absolute std delegate required');
      const wrapper = transform(macro, 'Rust', edits, 'router-core:derive-owned-vector-wrapper');
      const append = '\n' + wrapper.after + '\n\n/// Construct a vector through Rust; translation checks the bounded comma-list subset.\npub use crate::__router_translation_core_vec as vec;\n';
      const facadeResult = transform(facade, 'Rust', [{span: [facade.length, facade.length], expected: '', replacement: append}], 'router-core:append-owned-vector-interface');
      const hostFile = parse('host-contracts.mjs', hostSource), classes = hostFile.statements.filter(row => ts.isClassDeclaration(row) && row.name?.text === 'HostRustParser');
      if (classes.length !== 1) fail('one original HostRustParser declaration required');
      const methods = classes[0].members.filter(row => ts.isMethodDeclaration(row) && row.name.getText(hostFile) === 'primary');
      if (methods.length !== 1 || !methods[0].body || methods[0].parameters.map(row => row.name.getText(hostFile)).join(',') !== 'path,options') fail('complete actual Host primary(path,options) required');
      const checkerClasses = hostFile.statements.filter(row => ts.isClassDeclaration(row) && row.name?.text === 'HostChecker');
      const checkerMethods = checkerClasses.length === 1 ? checkerClasses[0].members.filter(row => ts.isMethodDeclaration(row) && row.name.getText(hostFile) === 'hostExpression') : [];
      if (checkerMethods.length !== 1 || !checkerMethods[0].body || checkerMethods[0].parameters.map(row => row.name.getText(hostFile)).join(',') !== 'node,env,path,expected,allowLiteral') fail('complete actual Host checker hostExpression required');
      return {wrapper, facadeResult, oldSource, oldHash, dataFile, hostFile, method: methods[0], checkerMethod: checkerMethods[0]};
    }}]},
    {phase: 'repository', rules: [{id: 'router-core:compose-native-vector-hook-and-source-DATA', apply: state => {
      const literal = (node, value) => ({span: [node.getStart(state.dataFile), node.end], expected: sourceData.slice(node.getStart(state.dataFile), node.end), replacement: JSON.stringify(value)});
      const data = transform(sourceData, 'JavaScript', [literal(state.oldSource, state.facadeResult.after), literal(state.oldHash, hash(state.facadeResult.after))], 'router-core:update-complete-vector-facade-DATA');
      const at = state.method.body.getStart(state.hostFile) + 1;
      const checkAt = state.checkerMethod.body.getStart(state.hostFile) + 1;
      const host = transform(hostSource, 'JavaScript', [
        {span: [0, 0], expected: '', replacement: "import {parseRouterCoreVector,checkRouterCoreVector} from '../router-core-vectors.mjs';\n"},
        {span: [at, at], expected: '', replacement: '\n    const coreVector=parseRouterCoreVector(this,path);if(coreVector)return coreVector;'},
        {span: [checkAt, checkAt], expected: '', replacement: "\n    if(node.k==='routerCoreVector')return checkRouterCoreVector(this,node,env,path,expected,allowLiteral);"},
      ], 'router-core:compose-qualified-vector-parser-hook');
      parse('router-core-source-data.mjs', data.after); parse('host-contracts.mjs', host.after);
      return {schema: 'owned-vector-complete-source-proposal-v1', typescript: ts.version,
        sources: {'rust/src/translation_core.rs': state.facadeResult, 'tools/translation/router-core-source-data.mjs': data,
          'tools/translation/extensions/host-contracts.mjs': host,
          'rust/tests/translation_core_vectors.rs': transform('', 'Rust', [{span: [0, 0], expected: '', replacement: CORE_VECTOR_RUST_ORACLE_SOURCE}], 'router-core:independent-native-vector-oracle-source')}, wrapper: state.wrapper,
        semanticAuthority: false, executableAdmission: false, rustExecuted: false};
    }}]},
  ]).run(null);
}

export function prepareCoreVectorCheckerSources({facade, sourceData, hostSource}) {
  const ts = ownershipCompiler();
  if (ts.version !== '5.9.3' || [facade, sourceData, hostSource].some(source => typeof source !== 'string' || source.length > 2_000_000)) fail('complete bounded inputs and native TypeScript 5.9.3 required');
  return createRulePipeline([
    {phase: 'language', rules: [{id: 'owned-vector:actual-existing-parser-and-checker-source', apply: () => {
      const file = ts.createSourceFile('host-contracts.mjs', hostSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const data = ts.createSourceFile('router-core-source-data.mjs', sourceData, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      if (file.parseDiagnostics.length || data.parseDiagnostics.length || hostSource.includes('checkRouterCoreVector')) fail('fresh native checker extension required');
      const fields = data.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations]);
      for (const [name, expected] of [['ROUTER_FORMATTING_FACADE_SOURCE', facade], ['ROUTER_FORMATTING_FACADE_SHA256', hash(facade)]]) {
        const rows = fields.filter(row => ts.isIdentifier(row.name) && row.name.text === name);
        if (rows.length !== 1 || !ts.isStringLiteral(rows[0].initializer) || rows[0].initializer.text !== expected) fail('actual installed facade/source DATA differs');
      }
      const imports = file.statements.filter(row => ts.isImportDeclaration(row) && row.moduleSpecifier.text === '../router-core-vectors.mjs');
      const names = imports[0]?.importClause?.namedBindings;
      if (imports.length !== 1 || !names || !ts.isNamedImports(names) || names.elements.length !== 1 || names.elements[0].getText(file) !== 'parseRouterCoreVector') fail('one actual original vector parser import required');
      const classes = file.statements.filter(row => ts.isClassDeclaration(row) && row.name?.text === 'HostChecker');
      const methods = classes.length === 1 ? classes[0].members.filter(row => ts.isMethodDeclaration(row) && row.name.getText(file) === 'hostExpression') : [];
      if (methods.length !== 1 || !methods[0].body || methods[0].parameters.map(row => row.name.getText(file)).join(',') !== 'node,env,path,expected,allowLiteral') fail('complete actual hostExpression required');
      return {file, import_: imports[0], method: methods[0]};
    }}]},
    {phase: 'repository', rules: [{id: 'router-core:compose-bounded-vector-element-check', apply: ({file, import_, method}) => {
      const at = method.body.getStart(file) + 1;
      const host = transform(hostSource, 'JavaScript', [
        {span: [import_.getStart(file), import_.end], expected: hostSource.slice(import_.getStart(file), import_.end), replacement: "import {parseRouterCoreVector,checkRouterCoreVector} from '../router-core-vectors.mjs';"},
        {span: [at, at], expected: '', replacement: "\n    if(node.k==='routerCoreVector')return checkRouterCoreVector(this,node,env,path,expected,allowLiteral);"},
      ], 'router-core:compose-qualified-vector-checker-hook');
      return {schema: 'owned-vector-checker-source-proposal-v1', typescript: ts.version,
        sources: {'tools/translation/extensions/host-contracts.mjs': host},
        inputs: {facade, facadeSha256: hash(facade), sourceData, sourceDataSha256: hash(sourceData)},
        semanticAuthority: false, executableAdmission: false, rustExecuted: false};
    }}]},
  ]).run(null);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if ([3, 5].includes(args.length) && args[0] === '--root' && ['--check', '--refresh'].includes(args[2])) {
    if (args[2] === '--refresh' && (args.length !== 5 || args[3] !== '--receipt') || args[2] === '--check' && args.length !== 3) fail('usage: --root WORKTREE --check | --root WORKTREE --refresh --receipt NEW_FILE.json.gz');
    const root = resolve(args[1]);
    // Complete historical SOURCE inputs are checked-in fixture data, not saved
    // programs or compiler verdicts. Regenerate every current output afresh.
    const packed = readFileSync(resolve(root, 'tools/translation/test/fixtures/owned-vector-original-inputs.json.gz'));
    const originals = JSON.parse(gunzipSync(packed, {maxOutputLength: 2_000_000}));
    if (originals.schema !== 'owned-vector-complete-original-inputs-v1') fail('complete original source-input fixture required');
    const result = prepareCoreVectorSources({facade: originals.sources['rust/src/translation_core.rs'],
      sourceData: originals.sources['tools/translation/router-core-source-data.mjs'], hostSource: originals.sources['tools/translation/extensions/host-contracts.mjs']});
    const current = Object.fromEntries(Object.keys(result.value.sources).map(name => [name, readFileSync(resolve(root, name), 'utf8')]));
    if (args[2] === '--check') {
      for (const [name, source] of Object.entries(result.value.sources)) if (current[name] !== source.after) fail('stale complete generated source: ' + name);
    } else {
      if (!args[4].endsWith('.json.gz')) fail('new complete compressed receipt required');
      const receipt = Buffer.from(JSON.stringify({schema: 'owned-vector-source-refresh-v1', originalFixtureSha256: hash(packed), current, proposal: result}) + '\n');
      const compressed = gzipSync(receipt, {level: 6, mtime: 0});
      if (!gunzipSync(compressed, {maxOutputLength: 128 * 1024 * 1024}).equals(receipt)) fail('complete refresh receipt inverse differs');
      writeFileSync(resolve(args[4]), compressed, {flag: 'wx'});
      for (const [name, source] of Object.entries(result.value.sources)) {
        if (readFileSync(resolve(root, name), 'utf8') !== current[name]) fail('actual current source changed before refresh: ' + name);
        writeFileSync(resolve(root, name), source.after);
      }
    }
    process.stdout.write(JSON.stringify({checked: Object.keys(result.value.sources), originalFixtureSha256: hash(packed), typescript: result.value.typescript,
      semanticAuthority: false, rustExecuted: false}) + '\n');
    process.exit(0);
  }
  if (![7, 8].includes(args.length) || args[0] !== '--root' || args[2] !== '--facade-root' || args[4] !== '--receipt' || args[6] !== '--write' || args.length === 8 && args[7] !== '--extend-checker') fail('usage: --root WORKTREE --facade-root PHYSICAL_SOURCE_ROOT --receipt NEW_FILE --write [--extend-checker]');
  const root = resolve(args[1]), facadeRoot = resolve(args[3]);
  const prepare = args.length === 8 ? prepareCoreVectorCheckerSources : prepareCoreVectorSources;
  const result = prepare({facade: readFileSync(resolve(facadeRoot, 'rust/src/translation_core.rs'), 'utf8'),
    sourceData: readFileSync(resolve(root, 'tools/translation/router-core-source-data.mjs'), 'utf8'),
    hostSource: readFileSync(resolve(root, 'tools/translation/extensions/host-contracts.mjs'), 'utf8')});
  // The complete reviewable receipt is durable before installation. No original
  // source is selected from a previous invocation's saved proposal or verdict.
  writeFileSync(resolve(args[5]), JSON.stringify(result) + '\n', {flag: 'wx'});
  for (const [name, source] of Object.entries(result.value.sources)) {
    const target = resolve(root, name); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, source.after);
  }
  process.stdout.write(JSON.stringify({receipt: resolve(args[5]), sources: Object.fromEntries(Object.entries(result.value.sources).map(([name, row]) => [name, {beforeSha256: row.beforeSha256, afterSha256: row.afterSha256}])), semanticAuthority: false, rustExecuted: false}) + '\n');
}
