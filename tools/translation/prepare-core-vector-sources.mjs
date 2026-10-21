// Native TypeScript AST and serialized/reparsed CST source producer. No verdicts.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
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
export function prepareCoreVectorSources({facade, sourceData, hostSource, lifetimesSource, vectorSource}) {
  for (const source of [facade, sourceData, hostSource, lifetimesSource, vectorSource]) if (typeof source !== 'string' || source.length > 2_000_000) fail('complete bounded original inputs required');
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
        {span: [0, 0], expected: '', replacement: "import {parseRouterCoreVector,checkRouterCoreVector} from '../router-core-vectors.mjs';"},
        {span: [at, at], expected: '', replacement: 'const coreVector=parseRouterCoreVector(this,path);if(coreVector)return coreVector;'},
        {span: [checkAt, checkAt], expected: '', replacement: "if(node.k==='routerCoreVector')return checkRouterCoreVector(this,node,env,path,expected,allowLiteral);"},
      ], 'router-core:compose-qualified-vector-parser-hook');
      const lifetimeSources = prepareCoreVectorLifetimeSources(lifetimesSource, vectorSource);
      parse('router-core-source-data.mjs', data.after); parse('host-contracts.mjs', host.after);
      return {schema: 'owned-vector-complete-source-proposal-v1', typescript: ts.version,
        sources: {'rust/src/translation_core.rs': state.facadeResult, 'tools/translation/router-core-source-data.mjs': data,
          'tools/translation/extensions/host-contracts.mjs': host,
          ...lifetimeSources,
          'rust/tests/translation_core_vectors.rs': transform('', 'Rust', [{span: [0, 0], expected: '', replacement: CORE_VECTOR_RUST_ORACLE_SOURCE}], 'router-core:independent-native-vector-oracle-source')}, wrapper: state.wrapper,
        semanticAuthority: false, executableAdmission: false, rustExecuted: false};
    }}]},
  ]).run(null);
}

// ReuseSuccessors in the original checker copies expression nodes/arrays but
// retains type objects. Issue a private association only in the actual later
// lifetime program lifecycle; there is no exported rebinding operation.
const VECTOR_NORMALIZATION_SOURCE = String.raw`
let ownedVectorFrame=null;
function ownedVectorSnapshot(node){return {node,type:node.type,items:node.items,elements:[...node.items],fingerprint:metadataDigest(node)};}
function unchangedOwnedVectorSnapshot(row,node){return node===row.node&&node.type===row.type&&node.items===row.items&&node.items.length===row.elements.length&&node.items.every((item,at)=>item===row.elements[at])&&metadataDigest(node)===row.fingerprint;}
function hasNormalizedOwnedVector(node){const row=node&&ownedVectorFrame?.normalized?.get(node);return Boolean(row&&unchangedOwnedVectorSnapshot(row,node));}
function bindNormalizedOwnedVectors(checker,program,surface){
  const frame=ownedVectorFrame;
  if(!frame||frame.checker!==checker||frame.program!==null||program?.sourceLanguage!=='Rust'||program.declarations!==checker.items)throw unsupported('owned vector normalization context','requires a fresh actual same-checker program frame',null);
  frame.program=program;
  const originals=new Map();
  const sourceEntries=(items,path=[])=>{for(const entry of items)if(entry.k==='module')sourceEntries(entry.items,[...path,entry.name]);else if(entry.k==='fn'&&originalParsedDeclarationEvidence(entry))originals.set([...path,entry.name].join('.'),entry);};
  sourceEntries(surface.items);
  for(const entry of program.declarations.values()){
    const originalEntry=originals.get(entry.fullName);if(entry.k!=='fn'||!originalEntry||entry.span?.start!==originalEntry.span?.start||entry.span?.end!==originalEntry.span?.end)continue;
    const seen=new WeakSet();
    const visit=node=>{
      if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
      const original=frame.originals.get(node.ownedVectorProof);
      if(original){
        if(original.checker!==checker||node.k!=='array'||node.type?.element!==original.elementType||!unchangedOwnedVectorSnapshot(original.snapshot,original.snapshot.node)||metadataDigest(node)!==original.snapshot.fingerprint||!Number.isSafeInteger(node.span?.start)||!Number.isSafeInteger(node.span?.end)||node.span.start<entry.span.start||node.span.end>entry.span.end)throw unsupported('owned vector normalization source','requires the unchanged complete typed original issued by this checker and source declaration',node.span);
        frame.normalized.set(node,ownedVectorSnapshot(node));
      }
      for(const [key,value]of Object.entries(node))if(!['type','span'].includes(key)){if(value?.k)visit(value);else if(Array.isArray(value))for(const child of value)if(child?.k)visit(child);}
    };
    visit(entry.body);
  }
}
`;
export function prepareCoreVectorLifetimeSources(source, vectorSource) {
  const ts = ownershipCompiler();
  if (ts.version !== '5.9.3' || [source, vectorSource].some(value => typeof value !== 'string' || value.length > 2_000_000) || source.includes('hasCheckedRouterCoreVector')) fail('complete fresh original lifetime/vector sources required');
  const file = ts.createSourceFile('source-lifetimes.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) fail('complete native lifetime syntax required');
  const named = name => file.statements.filter(row => ts.isFunctionDeclaration(row) && row.name?.text === name);
  const origins = named('origins'), empty = named('emptyBorrowValue');
  if (origins.length !== 1 || empty.length !== 1) fail('one actual origin and empty-value function required');
  const arrays = origins[0].body.statements.filter(row => ts.isIfStatement(row) && row.expression.getText(file) === "node.k==='array'&&node.type?.rustFixedArray&&node.fixedArrayProof?.verified");
  const empties = empty[0].body.statements.filter(row => ts.isIfStatement(row) && row.expression.getText(file) === "node.k==='array'&&node.type?.rustFixedArray?.length===0&&node.items.length===0&&node.fixedArrayProof?.verified&&node.fixedArrayProof.syntax!=='repeat'");
  if (arrays.length !== 1 || empties.length !== 1 || !ts.isBlock(arrays[0].thenStatement)) fail('one complete actual fixed-array origin and empty equation required');
  const statements = arrays[0].thenStatement.statements;
  if (statements.length !== 3 || !ts.isVariableStatement(statements[0]) || !ts.isIfStatement(statements[1]) || !ts.isReturnStatement(statements[2])) fail('actual complete fixed-array origin equation changed');
  // Copy its real child-origin and element-path equations. The repeat-only
  // obligation does not apply to the comma-list grammar selected here.
  const branch = "if(node.k==='array'&&hasCheckedRouterCoreVector(node)) {\n    " + statements[0].getText(file) + '\n    ' + statements[2].getText(file) + '\n  }\n  ';
  const emptyBranch = "if(hasCheckedRouterCoreVector(node)&&node.items.length===0)" + empties[0].thenStatement.getText(file) + '\n  ';
  const vectorFile = ts.createSourceFile('router-core-vectors.mjs', vectorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (vectorFile.parseDiagnostics.length) fail('complete original vector syntax required');
  const pick = name => {
    const rows = vectorFile.statements.filter(row => ts.isFunctionDeclaration(row) && row.name?.text === name || ts.isVariableStatement(row) && row.declarationList.declarations.some(value => ts.isIdentifier(value.name) && value.name.text === name));
    if (rows.length !== 1) fail('one complete original vector declaration required: ' + name); return rows[0];
  };
  const moved = ['checkedLists', 'checkRouterCoreVector', 'hasCheckedRouterCoreVector'].map(pick);
  const checker = moved[1], returns = checker.body.statements.filter(ts.isReturnStatement), registrations = checker.body.statements.filter(row => ts.isExpressionStatement(row) && ts.isCallExpression(row.expression) && row.expression.expression.getText(vectorFile) === 'checkedLists.set');
  if (returns.length !== 1 || registrations.length !== 1) fail('one complete original vector issue and result required');
  const result = returns[0].expression.getText(vectorFile), registration = registrations[0].expression;
  if (registration.arguments.length !== 2 || !ts.isObjectLiteralExpression(registration.arguments[1])) fail('complete original private vector association required');
  const fields = registration.arguments[1].getText(vectorFile);
  let checking = checker.getText(vectorFile), old = vectorSource.slice(registrations[0].getStart(vectorFile), returns[0].end);
  if (checking.split(old).length !== 2) fail('one exact original private issue region required');
  checking = checking.replace(old, () => 'const checkedVector=' + result + ';\n  const frame=ownedVectorFrame;\n  if(frame){if(frame.checker!==checker)throw unsupported(\'owned vector checker frame\',\'requires the active same checker\',node.span);if(!frame.originals){frame.originals=new WeakMap();frame.normalized=new WeakMap();}frame.originals.set(proof,' + fields.slice(0, -1) + ',checker,snapshot:ownedVectorSnapshot(checkedVector)});}\n  else checkedLists.set(proof,' + fields.slice(0, -1) + ',node:checkedVector,synthetic:copyMetadata(checkedVector)});\n  return checkedVector;');
  const guard = moved[2], guardReturns = guard.body.statements.filter(ts.isReturnStatement);
  if (guardReturns.length !== 1) fail('one complete original vector guard required');
  let guarded = guard.getText(vectorFile), guardReturn = guardReturns[0].getText(vectorFile);
  const originalRead = guard.body.statements.filter(ts.isVariableStatement);
  if(originalRead.length!==1||originalRead[0].getText(vectorFile)!=='const original = node && checkedLists.get(node.ownedVectorProof);')fail('one actual private original association read required');
  guarded = guarded.replace(originalRead[0].getText(vectorFile), 'const original = node && (ownedVectorFrame?ownedVectorFrame.originals:checkedLists)?.get(node.ownedVectorProof);');
  guarded = guarded.replace(guardReturn, () => 'return (' + guardReturns[0].expression.getText(vectorFile) + '&&(ownedVectorFrame?unchangedOwnedVectorSnapshot(original.snapshot,node):node===original.node&&isDeepStrictEqual(copyMetadata(node),original.synthetic)))||hasNormalizedOwnedVector(node);');
  const declarations = moved[0].getText(vectorFile) + '\n' + checking + '\n' + guarded + '\n' + VECTOR_NORMALIZATION_SOURCE;
  const factories = named('withSourceLifetimeChecker');
  const classes = []; const walk = node => { if (ts.isClassExpression(node)) classes.push(node); ts.forEachChild(node, walk); };
  if (factories.length !== 1) fail('one original lifetime checker factory required'); walk(factories[0]);
  const methods = classes.flatMap(row => row.members).filter(row => ts.isMethodDeclaration(row) && row.name.getText(file) === 'program');
  if (methods.length !== 1) fail('one complete original lifetime program lifecycle required');
  const programs = methods[0].body.statements.filter(ts.isVariableStatement).filter(row => row.declarationList.declarations.some(value => ts.isIdentifier(value.name) && value.name.text === 'program' && ts.isCallExpression(value.initializer) && value.initializer.expression.getText(file) === 'super.program'));
  const imports = file.statements.filter(row => ts.isImportDeclaration(row) && row.moduleSpecifier.text === './source-links.mjs');
  if (programs.length !== 1 || imports.length !== 1 || !ts.isNamedImports(imports[0].importClause?.namedBindings)) fail('actual lifetime program and source-link import required');
  const links = imports[0].importClause.namedBindings;
  const output = transform(source, 'JavaScript', [
    {span: [0, 0], expected: '', replacement: "import {isDeepStrictEqual} from 'node:util';\n// Generated vector checker association and original lifetime equations.\n" + declarations + '\n'},
    {span: [links.end - 1, links.end - 1], expected: '', replacement: ',originalParsedDeclarationEvidence'},
    {span: [methods[0].body.getStart(file)+1, methods[0].body.getStart(file)+1], expected: '', replacement: '\n      const previousOwnedVectorFrame=ownedVectorFrame,vectorFrame={checker:this,originals:null,normalized:null,program:null};ownedVectorFrame=vectorFrame;try {'},
    {span: [programs[0].end, programs[0].end], expected: '', replacement: "\n      if(vectorFrame.originals&&this.language==='Rust')bindNormalizedOwnedVectors(this,program,surface);"},
    {span: [methods[0].body.end-1, methods[0].body.end-1], expected: '', replacement: '}finally{vectorFrame.originals=null;vectorFrame.normalized=null;vectorFrame.checker=null;vectorFrame.program=null;ownedVectorFrame=previousOwnedVectorFrame;}\n    '},
    {span: [arrays[0].getStart(file), arrays[0].getStart(file)], expected: '', replacement: branch},
    {span: [empties[0].getStart(file), empties[0].getStart(file)], expected: '', replacement: emptyBranch},
  ], 'router-core:derive-owned-vector-origins-from-actual-fixed-array-equations');
  const after = ts.createSourceFile('source-lifetimes.mjs', output.after, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (after.parseDiagnostics.length) fail('generated complete native lifetime syntax differs');
  const forwarding = transform(vectorSource, 'JavaScript', moved.map((row, at) => {
    const end = at === 2 && /^\s*$/u.test(vectorSource.slice(row.end)) ? vectorSource.length : row.end;
    return {span: [row.getStart(vectorFile), end], expected: vectorSource.slice(row.getStart(vectorFile), end),
      replacement: at === 0 ? "export {checkRouterCoreVector,hasCheckedRouterCoreVector} from './extensions/source-lifetimes.mjs';" : ''};
  }), 'router-core:move-private-vector-checker-to-original-lifetime-lifecycle');
  return {'tools/translation/extensions/source-lifetimes.mjs': output, 'tools/translation/router-core-vectors.mjs': forwarding};
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
        {span: [at, at], expected: '', replacement: "if(node.k==='routerCoreVector')return checkRouterCoreVector(this,node,env,path,expected,allowLiteral);"},
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
      sourceData: originals.sources['tools/translation/router-core-source-data.mjs'], hostSource: originals.sources['tools/translation/extensions/host-contracts.mjs'], lifetimesSource: originals.sources['tools/translation/extensions/source-lifetimes.mjs'], vectorSource: originals.sources['tools/translation/router-core-vectors.mjs']});
    // Later explicit owned APIs compose their actual complete source equations;
    // the original vector producer and birth outputs above remain unchanged.
    const lifetime = (await import('./prepare-source-lifetime-refusal-batches.mjs')).composeSourceLifetimeRefusalBatches(result.value.sources, {root});
    const checked = (await import('./prepare-executable-checked-source.mjs')).composeExecutableCheckedSource(lifetime.sources, {root});
    const preserved = (await import('./prepare-source-proof-preservation.mjs')).composeSourceProofPreservation(checked.sources, {root});
    const matched = existsSync(resolve(root, 'tools/translation/test/fixtures/owned-matches-original-inputs.json.gz'))
      ? (await import('./prepare-core-matches-sources.mjs')).composeCurrentCoreMatchesSources(preserved.sources, {root})
      : {sources: preserved.sources, layers: []};
    const boundary = (await import('./prepare-primitive-identity-boundary.mjs')).composePrimitiveIdentityBoundary(matched.sources, {root});
    const ascii = (await import('./prepare-core-ascii-sources.mjs')).composeCoreAscii(boundary.sources, {root});
    const composition = {sources: ascii.sources, layers: [...lifetime.layers, ...checked.layers, ...preserved.layers, ...matched.layers, ...boundary.layers, ...ascii.layers]};
    const generated = composition.sources;
    const current = Object.fromEntries(Object.keys(generated).map(name => [name, readFileSync(resolve(root, name), 'utf8')]));
    if (args[2] === '--check') {
      for (const [name, source] of Object.entries(generated)) if (current[name] !== source.after) fail('stale complete generated source: ' + name);
    } else {
      if (!args[4].endsWith('.json.gz')) fail('new complete compressed receipt required');
      const receipt = Buffer.from(JSON.stringify({schema: 'owned-vector-source-refresh-v1', originalFixtureSha256: hash(packed), current, proposal: result, composition}) + '\n');
      const compressed = gzipSync(receipt, {level: 6, mtime: 0});
      if (!gunzipSync(compressed, {maxOutputLength: 128 * 1024 * 1024}).equals(receipt)) fail('complete refresh receipt inverse differs');
      writeFileSync(resolve(args[4]), compressed, {flag: 'wx'});
      for (const [name, source] of Object.entries(generated)) {
        if (readFileSync(resolve(root, name), 'utf8') !== current[name]) fail('actual current source changed before refresh: ' + name);
        writeFileSync(resolve(root, name), source.after);
      }
    }
    process.stdout.write(JSON.stringify({checked: Object.keys(generated), originalFixtureSha256: hash(packed), typescript: result.value.typescript,
      semanticAuthority: false, rustExecuted: false}) + '\n');
    process.exit(0);
  }
  if (![7, 8].includes(args.length) || args[0] !== '--root' || args[2] !== '--facade-root' || args[4] !== '--receipt' || args[6] !== '--write' || args.length === 8 && args[7] !== '--extend-checker') fail('usage: --root WORKTREE --facade-root PHYSICAL_SOURCE_ROOT --receipt NEW_FILE --write [--extend-checker]');
  const root = resolve(args[1]), facadeRoot = resolve(args[3]);
  const prepare = args.length === 8 ? prepareCoreVectorCheckerSources : prepareCoreVectorSources;
  const result = prepare({facade: readFileSync(resolve(facadeRoot, 'rust/src/translation_core.rs'), 'utf8'),
    sourceData: readFileSync(resolve(root, 'tools/translation/router-core-source-data.mjs'), 'utf8'),
    hostSource: readFileSync(resolve(root, 'tools/translation/extensions/host-contracts.mjs'), 'utf8'),
    lifetimesSource: readFileSync(resolve(root, 'tools/translation/extensions/source-lifetimes.mjs'), 'utf8'),
    vectorSource: readFileSync(resolve(root, 'tools/translation/router-core-vectors.mjs'), 'utf8')});
  // The complete reviewable receipt is durable before installation. No original
  // source is selected from a previous invocation's saved proposal or verdict.
  writeFileSync(resolve(args[5]), JSON.stringify(result) + '\n', {flag: 'wx'});
  for (const [name, source] of Object.entries(result.value.sources)) {
    const target = resolve(root, name); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, source.after);
  }
  process.stdout.write(JSON.stringify({receipt: resolve(args[5]), sources: Object.fromEntries(Object.entries(result.value.sources).map(([name, row]) => [name, {beforeSha256: row.beforeSha256, afterSha256: row.afterSha256}])), semanticAuthority: false, rustExecuted: false}) + '\n');
}
