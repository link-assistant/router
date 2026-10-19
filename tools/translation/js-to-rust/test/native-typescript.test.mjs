import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, symlinkSync, realpathSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { loadTypeScript, buildNativeTypeScript, parseNativeJavaScript, emitNativeTypeScript, runtimeAST, compileNativeTypeScript, regenerateNativeTypeScript, reconstructSyntax, sourceModules } from '../native-typescript.mjs';
import { inferenceProgram, typeNode } from '../native-inference.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SOURCE = process.env.ROUTER_NATIVE_TS_SOURCE_ROOT ? resolve(process.env.ROUTER_NATIVE_TS_SOURCE_ROOT) : ROOT;

// Full private-build versus unchanged public-parser comparison. This fixture is
// additional work; the original four regeneration builds below remain intact.
async function lexicalThisBuildControls(ts,directory) {
  const root=join(directory,'lexical-this-build'),javascript=join(root,'js'),sourcePath='js/src/lexical.mjs';
  mkdirSync(join(javascript,'native'),{recursive:true});
  symlinkSync(join(SOURCE,'js/node_modules'),join(javascript,'node_modules'),'dir');
  writeFileSync(join(javascript,'package.json'),JSON.stringify({name:'lexical-this-fixture',version:'0.0.0',type:'module'}));
  writeFileSync(join(javascript,'catalog.json'),'{}\n');
  for(const name of ['index.js','testing.js'])writeFileSync(join(javascript,name),'export {};\n');
  const historicalSource=`export function lexical() { return (() => this.value)(); }
export function nested() { function child() { return (()=>this.value)(); } return child.call({value:7}); }
export async function asyncLexical() { return await (async () => this.value)(); }
export function* generatorLexical() { yield this.value; yield (() => this.value)(); }
export async function* asyncGeneratorLexical() { yield this.value; yield await (async()=>this.value)(); }
export function defaults(value = (() => this.value)()) { return value; }
export function objectBoundary() { const value = {number:3, method(){return this.number;}, get item(){return this.number;}, set item(next){this.number=next;}, ['this'](){return this.number;},[(function computedKey(){return this.key;}).call({key:'dynamic'})](){return this.number;}};value.item=5;return value.method()+value['this']()+value.dynamic(); }
export function classBoundary() { class Base {base=1;} class Child extends Base {value=3;arrow=()=>this.value;static count=4;static {this.count+=1;}static read=()=>this.count;constructor(){super();this.value+=1;}method(){return this.value;}get item(){return this.value;}set item(next){this.value=next;}}const value=new Child();value.item=6;return value.arrow()+value.method()+Child.read(); }
export function classExpressionBoundary() { const Type=class {value=2;arrow=()=>this.value;static count=3;static{this.count+=1;}};return (new Type()).arrow()+Type.count; }
export const named = function namedExpression() { return this.value; };
/** this is data, not a receiver expression. */
export function dataOnly() { const value = {this:'猫😀'}; return [value.this, 'this', /this/u.test('this')]; }
export function propertyArrow() { const value = {read: () => this.value}; return value.read(); }
export function outerGenerator() { const value = function* nestedGenerator(){yield this.value;}; return value.call({value:9}).next().value; }
`;
  const executableClassEdits=[{"before":"export function classBoundary() { class Base {base=1;} class Child extends Base {value=3;arrow=()=>this.value;static count=4;static {this.count+=1;}static read=()=>this.count;constructor(){super();this.value+=1;}method(){return this.value;}get item(){return this.value;}set item(next){this.value=next;}}const value=new Child();value.item=6;return value.arrow()+value.method()+Child.read(); }","after":"export function classBoundary() { class Base {constructor(){this.base=1;}} class Child extends Base {constructor(){super();this.value=3;this.arrow=()=>this.value;this.value+=1;}static {if(typeof this!=='function')throw new Error('class static receiver');}static read(){return this===Child?5:0;}method(){return this.value;}get item(){return this.value;}set item(next){this.value=next;}}const value=new Child();value.item=6;return value.arrow()+value.method()+Child.read(); }"},{"before":"export function classExpressionBoundary() { const Type=class {value=2;arrow=()=>this.value;static count=3;static{this.count+=1;}};return (new Type()).arrow()+Type.count; }","after":"export function classExpressionBoundary() { const Type=class {constructor(){this.value=2;this.arrow=()=>this.value;}static {if(typeof this!=='function')throw new Error('class expression static receiver');}static read(){return typeof this==='function'?4:0;}};return (new Type()).arrow()+Type.read(); }"}];
  // Complete 489 carrier retained: its initialized fields intentionally remain
  // public-parser coverage, outside the unchanged assignment-erasure identity.
  assert.equal(createHash('sha256').update(historicalSource).digest('hex'),'35c6547be5a780fc03d93ba1dc6fa3256a7f955f89bb4608a3ba87f87f0b39ad');
  const historicalFile=ts.createSourceFile(sourcePath,historicalSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),historicalMeta=parseNativeJavaScript(ts,sourcePath,historicalSource,{file:historicalFile});
  assert.deepEqual(JSON.parse(JSON.stringify(historicalMeta)),historicalMeta);
  assert.deepEqual(runtimeAST(ts,reconstructSyntax(historicalMeta)),runtimeAST(ts,historicalSource));
  const initializedFields=[],staticBlocks=[],initializerArrows=[],outerClassReceivers=[];let historicalFunction=0;
  const hasThis=node=>{if(node.kind===ts.SyntaxKind.ThisKeyword)return true;let found=false;ts.forEachChild(node,child=>{if(hasThis(child))found=true;});return found;};
  const historicalVisit=node=>{if(ts.isFunctionLike(node)&&node.parameters){const annotation=historicalMeta.annotations[historicalFunction++];if(['classBoundary','classExpressionBoundary'].includes(node.name?.text)){assert.equal(annotation.thisContext===true,false,node.name.text+': nested class receivers stay outside the outer ordinary function');outerClassReceivers.push(node.name.text);}}if(ts.isPropertyDeclaration(node)&&node.initializer){initializedFields.push(node);if(ts.isArrowFunction(node.initializer))initializerArrows.push(node.initializer);}if(ts.isClassStaticBlockDeclaration(node))staticBlocks.push(node);ts.forEachChild(node,historicalVisit);};historicalVisit(historicalFile);
  assert.equal(historicalFunction,historicalMeta.annotations.length);assert.deepEqual(outerClassReceivers,['classBoundary','classExpressionBoundary']);assert.equal(initializedFields.length,8);assert.equal(initializerArrows.length,3);assert.equal(staticBlocks.length,2);assert.ok(initializerArrows.every(hasThis));assert.ok(staticBlocks.every(hasThis));
  // The executable carrier uses only two exact class-line substitutions.
  let source=historicalSource;for(const edit of executableClassEdits){assert.equal(source.split(edit.before).length,2);source=source.replace(edit.before,edit.after);}let inverse=source;for(const edit of [...executableClassEdits].reverse()){assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,edit.before);}assert.equal(inverse,historicalSource);
  writeFileSync(join(root,sourcePath),source);
  const paths=sourceModules(root),artifacts=buildNativeTypeScript(root),fresh=inferenceProgram(ts,root,paths),expectedFlags=new Map([['lexical',true],['nested',false],['child',true],['asyncLexical',true],['generatorLexical',true],['asyncGeneratorLexical',true],['defaults',true],['objectBoundary',false],['computedKey',true],['classBoundary',false],['classExpressionBoundary',false],['namedExpression',true],['dataOnly',false],['propertyArrow',true],['outerGenerator',false],['nestedGenerator',true]]);
  for(const path of paths) {
    const text=readFileSync(join(root,path),'utf8'),file=fresh.program.getSourceFile(join(root,path)),legacy=parseNativeJavaScript(ts,path,text,{file,checker:fresh.checker}),metaPath='tools/translation/js-to-rust/generated/native-typescript/'+path.slice('js/'.length)+'.meta.json',wire=artifacts.get(metaPath);
    assert.equal(wire,JSON.stringify(legacy)+'\n',path+': complete private/public meta byte equality');
    const meta=JSON.parse(wire),output=emitNativeTypeScript(ts,legacy),target=path.replace('js/','ts/').replace(/\.(?:mjs|js)$/u,'.ts'),header='// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.\n// Meta sha256='+createHash('sha256').update(wire).digest('hex')+'; dynamic any annotations are explicit draft gaps.\n';
    assert.equal(artifacts.get(target),header+output.text,path+': complete target byte equality');
    if(path===sourcePath) {
      let index=0;const functions=[];const inspect=node=>{if(ts.isFunctionLike(node)&&node.parameters){const annotation=meta.annotations[index++];functions.push(node);if(ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)){assert.ok(expectedFlags.has(node.name?.text),'independent expected function '+node.name?.text);assert.equal(annotation.thisContext===true,expectedFlags.get(node.name.text),node.name.text);assert.deepEqual(Object.keys(annotation),['function','parameters','returns',...(annotation.thisContext?['thisContext']:[])]);}else assert.equal(Object.hasOwn(annotation,'thisContext'),false,'arrows/methods/constructor/accessors retain no ordinary-function receiver annotation');}ts.forEachChild(node,inspect);};inspect(file);assert.equal(index,meta.annotations.length);
      // Custom-ts observations remain on the complete original public route.
      const visits=[],expected=[],observed=Object.create(ts);Object.defineProperty(observed,'forEachChild',{value:(node,visit,nodes)=>{visits.push([node.kind,node.pos,node.end]);return ts.forEachChild(node,visit,nodes);}});
      for(const fn of functions.filter(node=>ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node))){const receiver=node=>{if(node!==fn&&(ts.isFunctionLike(node)&&!ts.isArrowFunction(node)||ts.isClassDeclaration(node)||ts.isClassExpression(node)))return;expected.push([node.kind,node.pos,node.end]);ts.forEachChild(node,receiver);};receiver(fn);}
      const instrumented=parseNativeJavaScript(observed,path,text,{file}),ordinary=parseNativeJavaScript(ts,path,text,{file});assert.equal(JSON.stringify(instrumented),JSON.stringify(ordinary));assert.deepEqual(visits,expected);assert.ok(visits.length>functions.length);
    }
  }
  for(const [path,value]of artifacts){const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,value);}
  symlinkSync(join(javascript,'node_modules'),join(root,'ts/node_modules'),'dir');
  const strict=join(directory,'lexical-this-strict'),targets=paths.map(path=>join(root,path.replace('js/','ts/').replace(/\.(?:mjs|js)$/u,'.ts')));
  execFileSync(process.execPath,[join(SOURCE,'js/node_modules/typescript/lib/tsc.js'),'--strict','--skipLibCheck','--target','ES2022','--module','commonjs','--outDir',strict,...targets],{encoding:'utf8',timeout:20_000,maxBuffer:1024*1024,stdio:'pipe'});
  const compiled=await import(pathToFileURL(join(strict,'native/lexical.js')).href),original=await import(pathToFileURL(join(root,sourcePath)).href);
  const verify=async runtime=>{assert.equal(runtime.lexical.call({value:11}),11);assert.equal(runtime.nested(),7);assert.equal(await runtime.asyncLexical.call({value:12}),12);assert.deepEqual([...runtime.generatorLexical.call({value:13})],[13,13]);assert.equal(runtime.defaults.call({value:14}),14);const generated=[];for await(const value of runtime.asyncGeneratorLexical.call({value:18}))generated.push(value);assert.deepEqual(generated,[18,18]);assert.equal(runtime.objectBoundary(),15);assert.equal(runtime.classBoundary(),17);assert.equal(runtime.classExpressionBoundary(),6);assert.equal(runtime.named.call({value:15}),15);assert.deepEqual(runtime.dataOnly(),['猫😀','this',true]);assert.equal(runtime.propertyArrow.call({value:16}),16);assert.equal(runtime.outerGenerator(),9);};await verify(original);await verify(compiled);
}

test('closed compiler inference exposes primitive returns while retaining dynamic parameter and object gaps', async () => {
  const ts = loadTypeScript(SOURCE);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-inference-'));
  const source = `export function answer(value) { const doubled = value * 2; return doubled + 1; }
export function identity(value) { return value; }
export async function flag() { const mode = true; return mode; }
export function nullable(yes) { return yes ? 'value' : null; }
export function opaque() { const record = { kind: 'object' }; return record; }`;
  try {
    const file = join(directory, 'fixture.mjs'); writeFileSync(file, source);
    const inference = inferenceProgram(ts, directory, ['fixture.mjs']);
    const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source, { file: inference.program.getSourceFile(file), checker: inference.checker })));
    const output = emitNativeTypeScript(ts, meta);
    assert.equal(output.inferredReturns, 3);
    assert.equal(output.inferredLocals, 2);
    assert.match(output.text, /answer\(value\?: any\): number/u);
    assert.match(output.text, /identity\(value\?: any\): any/u);
    assert.match(output.text, /flag\(\): Promise<boolean>/u);
    assert.match(output.text, /nullable\(yes\?: any\): (?:string \| null|null \| string)/u);
    assert.match(output.text, /const record: any/u);
    const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
    writeFileSync(join(directory, 'target.mjs'), erased);
    const runtime = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.equal(runtime.answer('3'), 7);
    assert.equal(runtime.identity(null), null);
    assert.deepEqual(runtime.identity({ dynamic: true }), { dynamic: true });
    assert.equal(await runtime.flag(), true);
    assert.equal(runtime.nullable(false), null);
    assert.throws(() => typeNode(ts, { kind: 'primitive', name: 'string; runCode()' }), /unsupported native type inference hint/u);
    await lexicalThisBuildControls(ts,directory);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('independent runtime fixture preserves optional chains, receivers, getters, evaluation order and literal data', async () => {
  const ts = loadTypeScript(SOURCE);
  const source = `export async function exercise() {
    let hits = 0; const absent = null; let grouped = false;
    const receiver = { value: 3, get slot() { hits++; return this; }, method(extra = 1) { return this.value + extra; } };
    const short = absent?.foo.bar;
    try { (absent?.foo).bar; } catch (error) { grouped = true; }
    const observed = receiver.slot.method(); const optional = receiver?.method?.(2);
    const order = []; const record = n => { order.push(n); return n; };
    const decision = false && record(1) || true && record(2);
    const literal = String.raw\`line\\n\${7n}\`;
    const regex = /\\u{1F600}/u.test('😀');
    return { hits, grouped, short: short === undefined, observed, optional, order, decision, literal, regex, awaited: await Promise.resolve(11) };
  }`;
  const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source)));
  const output = emitNativeTypeScript(ts, meta);
  const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText;
  assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
  assert.notDeepEqual(runtimeAST(ts, 'x?.foo.bar;'), runtimeAST(ts, '(x?.foo).bar;'));
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-observations-'));
  try {
    writeFileSync(join(directory, 'source.mjs'), source);
    writeFileSync(join(directory, 'target.mjs'), erased);
    const expected = { hits: 1, grouped: true, short: true, observed: 4, optional: 5, order: [2], decision: 2, literal: 'line\\n7', regex: true, awaited: 11 };
    const original = await import(pathToFileURL(join(directory, 'source.mjs')).href);
    const translated = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.deepEqual(await original.exercise(), expected);
    assert.deepEqual(await translated.exercise(), expected);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('strict types preserve required destructuring and JavaScript property-key coercion', async () => {
  const ts = loadTypeScript(SOURCE);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-keys-'));
  const source = `export function destructured(prefix, { value }) { return String(prefix) + value; }
export function keys(value) { const record = { undefined: 4, null: 5, true: 6 }; return [record[value], record[undefined], record[null], record[true], record?.[undefined]]; }
export function missing() { const absent = null; return absent?.[undefined]; }`;
  try {
    const path = join(directory, 'fixture.mjs'); writeFileSync(path, source);
    const inference = inferenceProgram(ts, directory, ['fixture.mjs']);
    const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source, { file: inference.program.getSourceFile(path), checker: inference.checker })));
    const output = emitNativeTypeScript(ts, meta);
    assert.match(output.text, /destructured\(prefix: any, \{ value \}: any\)/u);
    const typed = join(directory, 'fixture.ts'); writeFileSync(typed, output.text);
    const program = ts.createProgram([typed], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
    const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
    writeFileSync(join(directory, 'target.mjs'), erased);
    const runtime = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.equal(runtime.destructured('a', { value: 2 }), 'a2');
    assert.throws(() => runtime.destructured('a'), TypeError);
    assert.deepEqual(runtime.keys(true), [6, 4, 5, 6, 4]);
    assert.equal(runtime.missing(), undefined);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('ordinary functions preserve dynamic receivers and arrow lexical receivers under strict types',async()=>{
  const ts=loadTypeScript(SOURCE),directory=mkdtempSync(join(tmpdir(),'router-native-ts-this-'));
  const source=`function Counter(value) { this.value = value; }
Counter.prototype.read = function(extra) { const arrow = () => this.value; function nested() { return this.value; } return [arrow() + extra, nested.call({value:9})]; };
export function run() { return new Counter(4).read(3); }`;
  try {
    const meta=JSON.parse(JSON.stringify(parseNativeJavaScript(ts,'fixture.mjs',source)));
    assert.equal(meta.annotations.filter(hint=>hint.thisContext).length,3);
    const output=emitNativeTypeScript(ts,meta),typed=join(directory,'fixture.ts');writeFileSync(typed,output.text);
    const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
    const erased=ts.transpileModule(output.text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    assert.deepEqual(runtimeAST(ts,erased),runtimeAST(ts,source));
    writeFileSync(join(directory,'target.mjs'),erased);
    assert.deepEqual((await import(pathToFileURL(join(directory,'target.mjs')).href)).run(),[7,9]);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('structured dynamic gap plans preserve extra arguments, comma calls, coercion and undeclared host probing',async()=>{
  const ts=loadTypeScript(SOURCE),directory=mkdtempSync(join(tmpdir(),'router-native-ts-gaps-'));
  const source=`export function run() { function count(value) { return arguments.length; }
    let observed; for(var key in {entry:1}) observed=key; key=false;
    return [count(1,2,3),(0,count)(4,5),count.bind()(6),1+true,typeof __ROUTER_MISSING_HOST_FEATURE__,key,observed]; }`;
  try {
    const path=join(directory,'fixture.mjs');writeFileSync(path,source);
    const inference=inferenceProgram(ts,directory,['fixture.mjs']);
    const meta=JSON.parse(JSON.stringify(parseNativeJavaScript(ts,'fixture.mjs',source,{file:inference.program.getSourceFile(path),checker:inference.checker})));
    assert.deepEqual(meta.globalGaps,['__ROUTER_MISSING_HOST_FEATURE__']);assert.ok(meta.gaps.some(gap=>gap.call));assert.ok(meta.gaps.some(gap=>gap.coercion));
    const output=emitNativeTypeScript(ts,meta),typed=join(directory,'fixture.ts');writeFileSync(typed,output.text);
    const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
    const erased=ts.transpileModule(output.text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    assert.deepEqual(runtimeAST(ts,erased),runtimeAST(ts,source));
    writeFileSync(join(directory,'target.mjs'),erased);
    assert.deepEqual((await import(pathToFileURL(join(directory,'target.mjs')).href)).run(),[3,2,1,2,'undefined',false,'entry']);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('every native JavaScript module has a structured syntax AST and executable TS draft', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'tools/translation/js-to-rust/generated/native-typescript/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.modules.map((row) => row.source), sourceModules(SOURCE));
  assert.deepEqual(manifest.inferenceInputs.map(row=>row.path), ['js/package.json', ...readdirSync(join(SOURCE,'js')).filter(name=>name.endsWith('.d.ts')).sort().map(name=>`js/${name}`)]);
  for(const row of manifest.inferenceInputs) { assert.equal(row.sha256,createHash('sha256').update(readFileSync(join(SOURCE,row.path))).digest('hex')); assert.equal(typeof row.resolvedByCompiler,'boolean'); }
  assert.ok(manifest.inferenceInputs.some(row=>row.role==='public-declaration'&&row.resolvedByCompiler));
  for (const row of manifest.modules) {
    const meta = JSON.parse(readFileSync(join(ROOT, row.meta), 'utf8'));
    assert.equal(meta.schema, 'native-js-syntax-ast-v1');
    assert.ok(Array.isArray(meta.tree));
    assert.ok(meta.nodes > 0);
    assert.equal('source' in meta, false, 'no opaque file source field');
    const source = readFileSync(join(ROOT, row.target), 'utf8');
    assert.doesNotMatch(source, /@ts-(?:nocheck|ignore|expect-error)/u);
    assert.doesNotMatch(source, /from ['"]\.{1,2}\/[^'"]+\.mjs['"]/u);
    assert.ok(reconstructSyntax(meta).length > 0);
  }
});

test('strict compiler checks the entire generated native package', () => {
  const result = compileNativeTypeScript(ROOT, { sourceRoot: SOURCE });
  assert.ok(result.files >= sourceModules(SOURCE).length);
});

test('regeneration rejects stale, missing, and unexpected TS, meta, and asset artifacts', { timeout: 60_000 }, () => {
  assert.deepEqual(regenerateNativeTypeScript(ROOT, { sourceRoot: SOURCE, check: true }).changed, []);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-drift-'));
  try {
    regenerateNativeTypeScript(directory, { sourceRoot: SOURCE });
    const target = join(directory, 'ts/src/core.ts');
    writeFileSync(target, 'stale\n');
    rmSync(join(directory, 'ts/catalog.json'));
    writeFileSync(join(directory, 'ts/src/unexpected.ts'), 'export const stale = true;\n');
    writeFileSync(join(directory, 'ts/unexpected.ts'), 'export const stale = true;\n');
    const result = regenerateNativeTypeScript(directory, { sourceRoot: SOURCE, check: true });
    assert.ok(result.changed.includes('ts/src/core.ts'));
    assert.ok(result.changed.includes('ts/catalog.json'));
    assert.ok(result.unexpected.includes('ts/src/unexpected.ts'));
    assert.ok(result.unexpected.includes('ts/unexpected.ts'));
    regenerateNativeTypeScript(directory, { sourceRoot: SOURCE });
    assert.equal(existsSync(join(directory, 'ts/src/unexpected.ts')), false);
    assert.equal(existsSync(join(directory, 'ts/unexpected.ts')), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('compiled TypeScript executes the shared native runtime fixture suite in Node and Bun', { timeout: 300000 }, async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-runtime-'));
  try {
    const outDir = join(directory, 'js');
    compileNativeTypeScript(ROOT, { sourceRoot: SOURCE, outDir, emit: true });
    cpSync(join(SOURCE, 'parity/fixtures'), join(directory, 'parity/fixtures'), { recursive: true });
    cpSync(join(SOURCE, 'openapi'), join(directory, 'openapi'), { recursive: true });
    mkdirSync(join(outDir, 'test'), { recursive: true });
    const tests = [];
    for (const name of readdirSync(join(SOURCE, 'js/test'))) if (/^native-.*\.(?:mjs|js|json)$/u.test(name)) {
      cpSync(join(SOURCE, 'js/test', name), join(outDir, 'test', name));
      if (/\.test\.(?:mjs|js)$/u.test(name)) tests.push(join(outDir, 'test', name));
    }
    // Canonical filesystem aliases preserve fixture imports, spawned module
    // URLs and public browser paths without duplicate module cache identities.
    const aliases=folder=>{for(const entry of readdirSync(folder,{withFileTypes:true})) {
      const path=join(folder,entry.name);if(entry.isDirectory()){if(path!==join(outDir,'native/assets'))aliases(path);continue;}if(!path.endsWith('.js'))continue;
      const alias=path.replace(/\.js$/u,'.mjs');symlinkSync(entry.name,alias);
      assert.equal(realpathSync(alias),realpathSync(path));
    }};
    aliases(join(outDir,'native'));aliases(join(outDir,'portable'));
    // Exercise Node's canonical module cache under Node even when Bun hosts
    // this test. Bun's shared runtime fixtures run independently below.
    execFileSync('node', ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import {join} from 'node:path';
      import {pathToFileURL} from 'node:url';
      const root=process.argv[1];
      const canonical=await import(pathToFileURL(join(root,'native/oauth.js')).href);
      assert.equal(await import(pathToFileURL(join(root,'native/oauth.mjs')).href),canonical);
    `, outDir], { encoding: 'utf8', timeout: 10_000, stdio: 'pipe' });
    const original = tests.map((path) => join(SOURCE, 'js/test', path.slice(path.lastIndexOf('/') + 1)));
    const nodeArgs = ['--test', '--test-reporter=tap'];
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = (binary, args, cwd) => {
      const started=Date.now();
      try { const output=execFileSync(binary, args, { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, stdio: 'pipe' });context.diagnostic(`${binary} runtime child completed in ${Date.now()-started}ms.`);return output; }
      catch (error) {
        const lines = String(error.stdout ?? '').split('\n');
        const failures = lines.flatMap((line, index) => line.startsWith('not ok') ? lines.slice(index, index + 18) : []).join('\n');
        throw new Error(`Native runtime fixture failure after ${Date.now()-started}ms (code=${error.code}, signal=${error.signal}, status=${error.status}):\n${failures || [String(error.stderr ?? ''),String(error.stdout ?? '').slice(-4000),error.message].filter(Boolean).join('\n').slice(-6000)}`);
      }
    };
    const baseline = run('node', [...nodeArgs, ...original], SOURCE);
    const compiled = run('node', [...nodeArgs, ...tests], directory);
    const count = (text) => Number(/# pass (\d+)/u.exec(text)?.[1]);
    assert.ok(count(compiled) >= 30, 'runtime assertions include core, auth/budgets, provider store, HTTP/protocol/SSE and resources');
    assert.equal(count(compiled), count(baseline), 'source and compiled target execute the same shared runtime expectations');
    context.diagnostic(`${count(compiled)} shared expectations passed against source JavaScript and compiled TypeScript in Node.`);
    // Bun is required in CI when available; local Node-only installations still
    // run all expectations and the strict compiler, without a hidden skip.
    try { execFileSync('bun', ['--version'], { stdio: 'pipe' }); }
    catch (error) { if (error.code === 'ENOENT') { context.diagnostic('Bun is unavailable locally; CI installs Bun and requires its compiled-runtime run.'); return; } throw error; }
    run('bun', ['test', ...tests], directory);
    context.diagnostic('The compiled TypeScript native runtime fixture suite also passed in Bun.');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
