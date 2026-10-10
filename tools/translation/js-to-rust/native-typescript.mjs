// Full JavaScript/TypeScript identity lowering through a structured syntax AST.
// Each meta node records SyntaxKind and children. Only lexical leaf tokens
// contain text; no source file or function body is an opaque source carrier.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, symlinkSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const walkFiles = (root, directory) => existsSync(join(root, directory)) ? readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walkFiles(root, `${directory}/${entry.name}`) : [`${directory}/${entry.name}`]).sort() : [];
export function loadTypeScript(sourceRoot) {
  const require = createRequire(join(sourceRoot, 'packages/javascript/package.json'));
  return require('typescript');
}

export function sourceModules(root) {
  return [...walkFiles(root, 'packages/javascript/native'), ...walkFiles(root, 'packages/javascript/portable'), 'packages/javascript/index.js', 'packages/javascript/testing.js'].filter((path) => /\.(?:mjs|js)$/u.test(path)).sort();
}

function serialize(ts, sourceFile) {
  let count = 0;
  let functionIndex = 0;
  const annotations = [];
  const encode = (node) => {
    if (ts.isJSDoc(node)) return null;
    if (ts.isFunctionLike(node) && node.parameters) {
      const params = node.parameters.map((parameter) => {
        const doc = ts.getJSDocType(parameter);
        if (doc && [ts.SyntaxKind.StringKeyword, ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.BooleanKeyword].includes(doc.kind)) return ts.SyntaxKind[doc.kind].replace('Keyword', '').toLowerCase();
        // JS default expressions are not contracts: fallback='' can still be
        // called with null. Only explicit JSDoc primitive contracts narrow it.
        return 'any';
      });
      annotations.push({ function: functionIndex++, parameters: params });
    }
    count++;
    const children = node.getChildren(sourceFile).map(encode).filter(Boolean);
    if (children.length) return [node.kind, children];
    const text = node.getText(sourceFile);
    if (!text || node.kind === ts.SyntaxKind.EndOfFileToken) return [node.kind, []];
    // Preserve line terminators because JavaScript automatic semicolon
    // insertion and postfix operators observe them; horizontal trivia is free.
    const leading = sourceFile.text.slice(node.pos, node.getStart(sourceFile));
    return [node.kind, text, /[\r\n]/u.test(leading) ? 1 : 0];
  };
  return { tree: encode(sourceFile), annotations, nodes: count };
}

export function parseNativeJavaScript(ts, path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw new Error(`invalid authoritative JavaScript syntax in ${path}`);
  return { schema: 'native-js-syntax-ast-v1', compiler: ts.version, path, sourceSha256: hash(source), ...serialize(ts, file) };
}

// Runtime structural fingerprint, independent of the source token AST emitter.
// Precedence is already in the parsed child tree. Parentheses around optional
// chains are retained where a continuation/call/new observes the boundary.
export function runtimeAST(ts, source, { rewriteImports = false } = {}) {
  const file = ts.createSourceFile('runtime.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw new Error('invalid runtime syntax for identity check');
  const normalize = (node) => {
    if (ts.isParenthesizedExpression(node)) {
      let parent = node.parent;
      while (ts.isParenthesizedExpression(parent)) parent = parent.parent;
      const boundary = ts.isOptionalChain(node.expression) && (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent) || ts.isCallExpression(parent) || ts.isNewExpression(parent) || ts.isTaggedTemplateExpression(parent));
      return boundary ? ['optional-chain-boundary', normalize(node.expression)] : normalize(node.expression);
    }
    const children = [];
    ts.forEachChild(node, (child) => { if (!ts.isJSDoc(child)) children.push(normalize(child)); });
    const optional = Boolean(node.flags & ts.NodeFlags.OptionalChain);
    if (children.length) return [node.kind, optional, children];
    if (typeof node.text === 'string') {
      const module = node.parent && (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent) || ts.isCallExpression(node.parent) && node.parent.expression.kind === ts.SyntaxKind.ImportKeyword);
      const text = rewriteImports && module && node.text.startsWith('.') ? node.text.replace(/\.mjs$/u, '.js') : node.text;
      return [node.kind, text, node.rawText ?? null];
    }
    return [node.kind];
  };
  return normalize(file);
}

export function reconstructSyntax(meta) {
  const parts = [];
  const visit = (node) => {
    if (!Array.isArray(node) || !Number.isInteger(node[0])) throw new Error('malformed syntax AST node');
    if (Array.isArray(node[1])) for (const child of node[1]) visit(child);
    else {
      if (typeof node[1] !== 'string' || ![0, 1].includes(node[2])) throw new Error('malformed syntax AST token');
      parts.push(`${node[2] ? '\n' : ' '}${node[1]}`);
    }
  };
  visit(meta.tree);
  return parts.join('');
}

export function emitNativeTypeScript(ts, meta) {
  const syntax = reconstructSyntax(meta);
  const file = ts.createSourceFile(meta.path, syntax, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw new Error(`reconstructed ${meta.path} has invalid syntax`);
  const f = ts.factory;
  const any = () => f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
  const primitive = (value) => f.createKeywordTypeNode(({ number: ts.SyntaxKind.NumberKeyword, string: ts.SyntaxKind.StringKeyword, boolean: ts.SyntaxKind.BooleanKeyword })[value] ?? ts.SyntaxKind.AnyKeyword);
  let functionIndex = 0;
  let explicitAny = 0;
  const namespaces = new Set(file.statements.filter(ts.isImportDeclaration).map((statement) => statement.importClause?.namedBindings).filter((binding) => binding && ts.isNamespaceImport(binding)).map((binding) => binding.name.text));
  const transform = (context) => {
    const visit = (node) => {
      const functionLike = ts.isFunctionLike(node) && node.parameters;
      const hints = functionLike ? meta.annotations[functionIndex++]?.parameters ?? [] : [];
      let updated = ts.visitEachChild(node, visit, context);
      if (functionLike) {
        updated.parameters = f.createNodeArray(updated.parameters.map((parameter, index) => {
          const type = parameter.dotDotDotToken ? f.createArrayTypeNode(any()) : primitive(hints[index]);
          if (!hints[index] || hints[index] === 'any') explicitAny++;
          const optional = hints[index] === 'any' && !parameter.initializer && !parameter.dotDotDotToken && ts.isIdentifier(parameter.name) && !ts.isSetAccessorDeclaration(node) && !ts.isConstructorDeclaration(node);
          return f.updateParameterDeclaration(parameter, parameter.modifiers, parameter.dotDotDotToken, parameter.name, optional ? f.createToken(ts.SyntaxKind.QuestionToken) : parameter.questionToken, type, parameter.initializer);
        }));
        if (!ts.isConstructorDeclaration(updated) && !ts.isSetAccessorDeclaration(updated)) {
          explicitAny++;
          updated.type = updated.asteriskToken
            ? f.createTypeReferenceNode(updated.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ? 'AsyncGenerator' : 'Generator', [any(), any(), any()])
            : updated.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ? f.createTypeReferenceNode('Promise', [any()]) : any();
        }
      }
      if (ts.isVariableDeclaration(updated)) {
        const loop = ts.isVariableDeclarationList(node.parent) && (ts.isForOfStatement(node.parent.parent) || ts.isForInStatement(node.parent.parent));
        if (!loop) { explicitAny++; updated = f.updateVariableDeclaration(updated, updated.name, updated.exclamationToken, any(), updated.initializer); }
      }
      if (ts.isForOfStatement(updated)) updated = f.updateForOfStatement(updated, updated.awaitModifier, updated.initializer, f.createAsExpression(updated.expression, any()), updated.statement);
      if (ts.isCatchClause(updated) && updated.variableDeclaration) updated = f.updateCatchClause(updated, f.updateVariableDeclaration(updated.variableDeclaration, updated.variableDeclaration.name, undefined, any(), undefined), updated.block);
      if (ts.isNewExpression(updated)) updated = f.updateNewExpression(updated, f.createParenthesizedExpression(f.createAsExpression(updated.expression, any())), undefined, updated.arguments);
      // Grouping the receiver of an optional-chain continuation would stop
      // short circuiting: (x?.headers)[key] differs from x?.headers[key].
      if (ts.isElementAccessExpression(updated) && !ts.isElementAccessChain(updated)) updated = f.updateElementAccessExpression(updated, f.createParenthesizedExpression(f.createAsExpression(updated.expression, any())), updated.argumentExpression);
      if (ts.isPropertyAccessExpression(updated) && ts.isIdentifier(updated.expression) && namespaces.has(updated.expression.text)) updated = f.updatePropertyAccessExpression(updated, f.createParenthesizedExpression(f.createAsExpression(updated.expression, any())), updated.name);
      if (ts.isCallExpression(updated) && updated.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(updated.arguments[0]) && updated.arguments[0].text.startsWith('.')) updated = f.updateCallExpression(updated, updated.expression, updated.typeArguments, [f.createStringLiteral(updated.arguments[0].text.replace(/\.mjs$/u, '.js')), ...updated.arguments.slice(1)]);
      if (ts.isCallExpression(updated) && ts.isPropertyAccessExpression(updated.expression) && updated.expression.expression.kind === ts.SyntaxKind.Identifier && updated.expression.expression.text === 'JSON' && updated.expression.name.text === 'parse') updated = f.updateCallExpression(updated, updated.expression, updated.typeArguments, updated.arguments.map((argument) => f.createAsExpression(argument, any())));
      if ((ts.isImportDeclaration(updated) || ts.isExportDeclaration(updated)) && updated.moduleSpecifier && ts.isStringLiteral(updated.moduleSpecifier) && updated.moduleSpecifier.text.startsWith('.')) {
        updated.moduleSpecifier = f.createStringLiteral(updated.moduleSpecifier.text.replace(/\.mjs$/u, '.js'));
      }
      if ((ts.isClassDeclaration(updated) || ts.isClassExpression(updated))) {
        const members = new Set(updated.members.map((member) => member.name?.getText(file)));
        const fields = new Set();
        const collect = (child) => {
          if (child !== node && (ts.isClassDeclaration(child) || ts.isClassExpression(child))) return;
          if (ts.isPropertyAccessExpression(child) && child.expression.kind === ts.SyntaxKind.ThisKeyword && !members.has(child.name.text)) fields.add(child.name.text);
          ts.forEachChild(child, collect);
        };
        collect(node);
        const declarations = [...fields].sort().map((name) => f.createPropertyDeclaration([f.createModifier(ts.SyntaxKind.DeclareKeyword)], name, undefined, any(), undefined));
        explicitAny += declarations.length;
        updated.members = f.createNodeArray([...declarations, ...updated.members]);
      }
      return updated;
    };
    return (root) => ts.visitNode(root, visit);
  };
  const result = ts.transform(file, [transform]);
  try {
    const text = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true }).printFile(result.transformed[0]);
    const typed = ts.createSourceFile(meta.path.replace(/\.m?js$/u, '.ts'), text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    explicitAny = 0;
    const countAny = (node) => { if (node.kind === ts.SyntaxKind.AnyKeyword) explicitAny++; ts.forEachChild(node, countAny); };
    countAny(typed);
    return { text, explicitAny };
  } finally { result.dispose(); }
}

export function buildNativeTypeScript(sourceRoot) {
  const ts = loadTypeScript(sourceRoot);
  const paths = sourceModules(sourceRoot);
  if (!paths.some((path) => path.startsWith('packages/javascript/native/'))) throw new Error('native JavaScript source modules are missing');
  const artifacts = new Map();
  const rows = [];
  for (const path of paths) {
    const source = readFileSync(join(sourceRoot, path), 'utf8');
    const meta = parseNativeJavaScript(ts, path, source);
    const metaText = `${JSON.stringify(meta)}\n`;
    const reparsed = JSON.parse(metaText);
    const output = emitNativeTypeScript(ts, reparsed);
    const target = path.replace('packages/javascript/', 'packages/typescript/').replace(/\.(?:mjs|js)$/u, '.ts');
    const metaPath = `tools/translation/js-to-rust/generated/native-typescript/${path.slice('packages/javascript/'.length)}.meta.json`;
    const targetText = `// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.\n// Meta sha256=${hash(metaText)}; dynamic any annotations are explicit draft gaps.\n${output.text}`;
    const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true, useDefineForClassFields: false }, fileName: target }).outputText;
    const sourceRuntime = JSON.stringify(runtimeAST(ts, source, { rewriteImports: true }));
    const targetRuntime = JSON.stringify(runtimeAST(ts, erased));
    if (sourceRuntime !== targetRuntime) throw new Error(`runtime AST identity differs for ${path}`);
    artifacts.set(metaPath, metaText);
    artifacts.set(target, targetText);
    rows.push({ source: path, sourceSha256: hash(source), meta: metaPath, target, nodes: meta.nodes, explicitAny: output.explicitAny, metaSha256: hash(metaText), targetSha256: hash(targetText), runtimeASTSha256: hash(sourceRuntime), runtimeASTIdentity: 'verified after type erasure and relative module-extension normalization' });
  }
  const sourcePackage = JSON.parse(readFileSync(join(sourceRoot, 'packages/javascript/package.json'), 'utf8'));
  artifacts.set('packages/typescript/package.json', `${JSON.stringify({ name: '@link-assistant/router-typescript-draft', version: sourcePackage.version, private: true, type: 'module', engines: sourcePackage.engines, exports: { '.': './dist/index.js', './native': './dist/native/index.js', './testing': './dist/testing.js' }, scripts: { build: 'node ../../scripts/check-native-typescript.mjs --out-dir packages/typescript/dist' }, dependencies: sourcePackage.dependencies, devDependencies: sourcePackage.devDependencies }, null, 2)}\n`);
  artifacts.set('packages/typescript/tsconfig.native.json', `${JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: true, useDefineForClassFields: false, verbatimModuleSyntax: true, outDir: 'dist', rootDir: '.', declaration: true }, include: ['index.ts', 'testing.ts', 'native/**/*.ts', 'portable/**/*.ts'] }, null, 2)}\n`);
  artifacts.set('packages/typescript/.gitignore', 'node_modules\n/dist/\n');
  for (const path of ['packages/javascript/catalog.json', ...walkFiles(sourceRoot, 'packages/javascript/schemas')]) artifacts.set(path.replace('packages/javascript/', 'packages/typescript/'), readFileSync(join(sourceRoot, path)));
  artifacts.set('tools/translation/js-to-rust/generated/native-typescript/manifest.json', `${JSON.stringify({ schema: 'native-js-syntax-ast-v1', compiler: ts.version, target: 'complete-native-package-typescript-draft', lowering: 'identity runtime semantics; syntax-token AST serialization and explicit draft dynamic type annotations', fullNativeRustTranslation: false, modules: rows, assets: ['catalog.json', 'schemas'], outputs: [...artifacts].map(([path, value]) => ({ path, bytes: Buffer.byteLength(value), sha256: hash(value) })) }, null, 2)}\n`);
  return artifacts;
}

export function regenerateNativeTypeScript(outputRoot, { sourceRoot = outputRoot, check = false } = {}) {
  const artifacts = buildNativeTypeScript(sourceRoot);
  const changed = [];
  const managed = [
    ...(existsSync(join(outputRoot, 'packages/typescript')) ? readdirSync(join(outputRoot, 'packages/typescript'), { withFileTypes: true }).filter((entry) => entry.isFile() && /\.(?:ts|json)$/u.test(entry.name) && entry.name !== 'package-lock.json').map((entry) => `packages/typescript/${entry.name}`) : []),
    ...walkFiles(outputRoot, 'tools/translation/js-to-rust/generated/native-typescript'),
    ...walkFiles(outputRoot, 'packages/typescript/schemas'),
    ...walkFiles(outputRoot, 'packages/typescript/native').filter((path) => !path.endsWith('/js-first-policy.ts')),
    ...walkFiles(outputRoot, 'packages/typescript/portable'),
  ];
  const unexpected = managed.filter((path) => !artifacts.has(path));
  for (const path of unexpected) if (!check) rmSync(join(outputRoot, path));
  for (const [path, value] of artifacts) {
    const file = join(outputRoot, path);
    if (existsSync(file) && Buffer.from(readFileSync(file)).equals(Buffer.from(value))) continue;
    changed.push(path);
    if (!check) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); }
  }
  return { changed, unexpected, bytes: [...artifacts.values()].reduce((sum, value) => sum + Buffer.byteLength(value), 0) };
}

export function compileNativeTypeScript(outputRoot, { sourceRoot = outputRoot, outDir, emit = false } = {}) {
  const ts = loadTypeScript(sourceRoot);
  const dependencyRoot = join(sourceRoot, 'packages/javascript/node_modules');
  const packageRoot = join(outputRoot, 'packages/typescript');
  const nodeModules = join(packageRoot, 'node_modules');
  if (!existsSync(nodeModules)) symlinkSync(dependencyRoot, nodeModules, 'dir');
  const files = ['index.ts', 'testing.ts', ...walkFiles(outputRoot, 'packages/typescript/native').map((path) => path.slice('packages/typescript/'.length)), ...walkFiles(outputRoot, 'packages/typescript/portable').map((path) => path.slice('packages/typescript/'.length))].filter((path) => path.endsWith('.ts')).map((path) => join(packageRoot, path));
  const options = { strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true, useDefineForClassFields: false, verbatimModuleSyntax: true, declaration: true, rootDir: packageRoot, outDir, noEmit: !emit, typeRoots: [join(dependencyRoot, '@types')] };
  const program = ts.createProgram(files, options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => outputRoot, getCanonicalFileName: (name) => name, getNewLine: () => '\n' }));
  if (emit) {
    program.emit();
    writeFileSync(join(outDir, 'package.json'), '{"type":"module"}\n');
    cpSync(join(packageRoot, 'catalog.json'), join(outDir, 'catalog.json'));
    cpSync(join(packageRoot, 'schemas'), join(outDir, 'schemas'), { recursive: true });
    if (!existsSync(join(outDir, 'node_modules'))) symlinkSync(dependencyRoot, join(outDir, 'node_modules'), 'dir');
  }
  return { files: files.length, compiler: ts.version };
}
