import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {repositoryRustLayout,rustPackageSourcePath} from '../repository-layout.mjs';
import {captureSourceCorpus,sourceCorpusText} from '../source-corpus.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {substituteRepositorySourceURLs,substituteTypeScriptPackageLayout,substituteRustPackageReads,substituteRepositoryGitSourceReads} from '../repository-path-substitutions.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {buildArtifacts} from '../../../scripts/regenerate-js-first.mjs';
import {parseMeta} from '../js-to-rust/translator.mjs';
import {evaluate} from '../js-to-rust/interpreter.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

test('package URL substitution follows the actual native module binding and preserves templates and shadowed calls',{timeout:5000},()=>{
  const source="import {createRequire as need} from 'node:module';\nconst child=`need(new URL('../../../packages/javascript/package.json',import.meta.url))`;\nconst load=need(new URL('../../../packages/javascript/package.json',import.meta.url));\n";
  const proposal=substituteTypeScriptPackageLayout(source);
  assert.equal(proposal.changed,true);assert.equal(proposal.edits.length,1);assert.equal(proposal.wholeInverse,true);
  assert.ok(proposal.source.includes("const load=need(new URL('../../../js/package.json',import.meta.url))"));
  assert.ok(proposal.source.includes("`need(new URL('../../../packages/javascript/package.json',import.meta.url))`"));
  assert.equal(transportConcreteSyntaxMeta(proposal.beforeWire).source,source);assert.equal(transportConcreteSyntaxMeta(proposal.afterWire).source,proposal.source);
  assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(substituteTypeScriptPackageLayout(proposal.source).changed,false);
  for(const shadowed of ["function f(createRequire){return createRequire(new URL('../../../packages/javascript/package.json',import.meta.url));}","import {createRequire} from 'node:module';function f(URL){return createRequire(new URL('../../../packages/javascript/package.json',import.meta.url));}","const createRequire=value=>value;const load=createRequire(new URL('../../../packages/javascript/package.json',import.meta.url));"]){assert.equal(substituteTypeScriptPackageLayout(shadowed).changed,false);}
});

function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'router-language-layout-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'rust/src'),{recursive:true});
  writeFileSync(join(root,'Cargo.toml'),'[workspace]\nmembers=["rust"]\nresolver="3"\n');
  writeFileSync(join(root,'Cargo.lock'),'version = 4\n');
  writeFileSync(join(root,'rust/Cargo.toml'),'[package]\nname="fixture"\nversion="0.1.0"\nedition="2024"\n');
  return root;
}

test('nested Rust package captures its own manifest and the complete shared workspace inputs',{timeout:5000},t=>{
  const root=fixture(t),source='pub fn value()->u8{7}';
  writeFileSync(join(root,'rust/src/lib.rs'),source);
  const layout=repositoryRustLayout(root),corpus=captureSourceCorpus({root,paths:['rust/src/lib.rs']});
  assert.equal(layout.manifest,'rust/Cargo.toml');
  assert.equal(layout.lock,'Cargo.lock');
  assert.deepEqual(corpus.cargo.map(row=>row.source),['Cargo.toml','rust/Cargo.toml','Cargo.lock']);
  for(const row of corpus.cargo)assert.equal(sourceCorpusText(corpus,root,row.source),readFileSync(join(root,row.source),'utf8'));
  assert.equal(sourceCorpusText(corpus,root,'rust/src/lib.rs'),source);
  assert.equal(rustPackageSourcePath(root,'src/lib.rs'),'rust/src/lib.rs');
  assert.equal(rustPackageSourcePath(root,'src'),'rust/src');
  assert.equal(rustPackageSourcePath(root,'src-other'),'src-other');
  assert.equal(rustPackageSourcePath(root,'js/src/index.mjs'),'js/src/index.mjs');
});

test('nested manifest links cannot replace an ordinary Rust package',{timeout:5000},t=>{
  const root=fixture(t);
  rmSync(join(root,'rust/Cargo.toml'));
  symlinkSync('../Cargo.toml',join(root,'rust/Cargo.toml'));
  assert.throws(()=>repositoryRustLayout(root),/ordinary physical/);
  rmSync(join(root,'rust/Cargo.toml'));
  symlinkSync('../missing.toml',join(root,'rust/Cargo.toml'));
  assert.throws(()=>repositoryRustLayout(root),/ordinary physical/);
  rmSync(join(root,'rust/Cargo.toml'));
  writeFileSync(join(root,'rust/Cargo.toml'),'[package]\nname="fixture"\nversion="0.1.0"\n');
  renameSync(join(root,'rust'),join(root,'actual-rust'));
  symlinkSync('actual-rust',join(root,'rust'));
  assert.throws(()=>repositoryRustLayout(root),/ordinary physical/);
});

test('rust/src modules execute after checked meta translation and independent strict TypeScript',{timeout:60000},async t=>{
  const root=fixture(t),files={
    'rust/src/lib.rs':'pub mod math; pub fn increment(value:u8)->u8{math::add(value)}',
    'rust/src/math.rs':'pub fn add(value:u8)->u8{value+1}',
  };
  for(const [path,source]of Object.entries(files))writeFileSync(join(root,path),source);
  const result=translateProject({entry:'rust/src/lib.rs',paths:Object.keys(files),readSource:path=>readFileSync(join(root,path),'utf8'),cargoManifest:readFileSync(join(root,'rust/Cargo.toml'),'utf8'),cargoManifestPath:'rust/Cargo.toml'});
  assert.deepEqual(result.meta.refused,[]);
  assert.equal(result.meta.originalCargoEditionInput.sourcePath,'rust/Cargo.toml');
  const wire=JSON.stringify(result.meta.checkedSemanticProgram);
  assert.equal(serializeProgram(parseProgram(wire)),wire);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.increment(0n),1n);
    assert.equal(api.increment(254n),255n);
    assert.throws(()=>api.increment(255n),RangeError);
    assert.throws(()=>api.increment('1'));
  },{childTimeoutMs:20000});
});


test('parsed source URL substitutions preserve child templates through both CST rule sequences',{timeout:5000},()=>{
  const source='const child = `const path="src/lib.rs"; new URL(path,root)`;\nconst ratio=6/2;\nconst result=new URL(path,root);\n';
  const result=substituteRepositorySourceURLs(source,'./fixtures/repository-paths.mjs');
  assert.equal(result.edits.length,1);
  assert.equal(result.wholeInverse,true);
  assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
  assert.ok(result.source.includes('`const path="src/lib.rs"; new URL(path,root)`'));
  assert.ok(result.source.includes('const result=repositorySourceURL(path,root);'));
  assert.equal(transportConcreteSyntaxMeta(result.beforeWire).source,source);
  assert.equal(transportConcreteSyntaxMeta(result.afterWire).source,result.source);
  assert.deepEqual(substituteRepositorySourceURLs('const child=`new URL(path,root)`;','./helper.mjs'),{source:'const child=`new URL(path,root)`;',edits:[],changed:false});
  const literal='import {repositorySourceURL} from "./helper.mjs";\nconst cargo=new URL("Cargo.toml",root);\n';
  const moved=substituteRepositorySourceURLs(literal,'./helper.mjs');
  assert.equal(moved.edits.length,1);assert.equal(moved.wholeInverse,true);
  assert.equal(moved.source,'import {repositorySourceURL} from "./helper.mjs";\nconst cargo=repositorySourceURL("Cargo.toml",root);\n');
  const variableFile=substituteRepositorySourceURLs('const source=readFileSync(new URL(file,root),"utf8");','./helper.mjs');
  assert.equal(variableFile.edits.length,1);assert.equal(variableFile.wholeInverse,true);assert.ok(variableFile.source.includes('repositorySourceURL(file,root)'));
});


test('JavaScript edits project through checked meta into the nested Rust package',{timeout:60000},t=>{
  const root=fixture(t),original='pub fn original()->bool{true}\n';
  writeFileSync(join(root,'rust/src/lib.rs'),original);
  for(const path of ['js/portable','parity/fixtures/js-first'])mkdirSync(join(root,path),{recursive:true});
  writeFileSync(join(root,'js/portable/policy.mjs'),'/** @param {number} x @returns {number} */ export function adjust(x){return x+1;}\n');
  writeFileSync(join(root,'parity/fixtures/js-first/policy.json'),JSON.stringify({cases:[{id:'edge-zero',function:'adjust',args:[0],expected:1}]}));
  writeFileSync(join(root,'parity/fixtures/js-first/unsupported.json'),'[]');
  const before=buildArtifacts(root);
  assert.ok(before.has('rust/src/generated_js_first/policy.rs'));
  assert.equal(before.has('src/generated_js_first/policy.rs'),false);
  const meta=before.get('tools/translation/js-to-rust/generated/policy.lino');
  assert.equal(evaluate(parseMeta(meta),'adjust',[0]),1);
  writeFileSync(join(root,'js/portable/policy.mjs'),'/** @param {number} x @returns {number} */ export function adjust(x){return x-1;}\n');
  const after=buildArtifacts(root),updated=after.get('tools/translation/js-to-rust/generated/policy.lino');
  assert.equal(evaluate(parseMeta(updated),'adjust',[0]),-1);
  assert.notEqual(after.get('rust/src/generated_js_first/policy.rs'),before.get('rust/src/generated_js_first/policy.rs'));
  assert.equal(readFileSync(join(root,'rust/src/lib.rs'),'utf8'),original);
});


test('TypeScript package path substitution preserves adapter bodies and embedded source',{timeout:5000},()=>{
 const source='const child=`createRequire(join(sourceRoot,"packages/javascript/package.json"))`;\nconst require=createRequire(join(sourceRoot,\'packages/javascript/package.json\'));\nexport function value(){return 7;}\n';
 const result=substituteTypeScriptPackageLayout(source);
 assert.equal(result.edits.length,1);assert.equal(result.wholeInverse,true);
 assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
 assert.ok(result.source.includes("createRequire(join(sourceRoot,'js/package.json'))"));
 assert.ok(result.source.includes('`createRequire(join(sourceRoot,"packages/javascript/package.json"))`'));
 assert.equal(result.source.slice(result.source.indexOf('export function')),source.slice(source.indexOf('export function')));
 assert.equal(transportConcreteSyntaxMeta(result.afterWire).source,result.source);
 assert.equal(substituteTypeScriptPackageLayout(result.source).changed,false);
});

test('crate-relative read substitutions preserve fixture labels embedded sources and write targets',{timeout:5000},()=>{
 const source='const child=`readFileSync(join(root,"src/lib.rs"))`;\nconst path="src/lib.rs";\nconst source=readFileSync(join(root,path),"utf8");\nconst entries=fs.readdirSync(join(ROOT,"src"));\nwriteFileSync(join(root,path),source);\n';
 const result=substituteRustPackageReads(source,'../repository-layout.mjs');
 assert.equal(result.edits.length,2);assert.equal(result.wholeInverse,true);
 assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
 assert.ok(result.source.includes('`readFileSync(join(root,"src/lib.rs"))`'));
 assert.ok(result.source.includes('const path="src/lib.rs";'));
 assert.ok(result.source.includes('readFileSync(join(root,rustPackageSourcePath(root,path)),"utf8")'));
 assert.ok(result.source.includes('writeFileSync(join(root,path),source)'));
 assert.equal(transportConcreteSyntaxMeta(result.afterWire).source,result.source);
 assert.equal(substituteRustPackageReads(result.source,'../repository-layout.mjs').changed,false);
});
test('current Git source read substitutions preserve historical revisions and embedded child sources',{timeout:5000},()=>{
 const source='const child=`execFileSync("git",["show","HEAD:"+name],{cwd:root})`;\nconst current=execFileSync("git",["show","HEAD:"+name],{cwd:root,encoding:"utf8"});\nconst manifest=execFileSync("git",["show","HEAD:Cargo.toml"],{cwd:ROOT});\nconst historical=execFileSync("git",["show","1234567:"+name],{cwd:root});\n';
 const result=substituteRepositoryGitSourceReads(source,'./fixtures/repository-paths.mjs');
 assert.equal(result.edits.length,2);assert.equal(result.wholeInverse,true);assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
 assert.ok(result.source.includes("'HEAD:'+repositorySourcePath(name,root)"));assert.ok(result.source.includes("'HEAD:'+repositorySourcePath(\"Cargo.toml\",ROOT)"));
 assert.ok(result.source.includes('`execFileSync("git",["show","HEAD:"+name],{cwd:root})`'));assert.ok(result.source.includes('["show","1234567:"+name]'));
 assert.equal(transportConcreteSyntaxMeta(result.afterWire).source,result.source);assert.equal(substituteRepositoryGitSourceReads(result.source,'./fixtures/repository-paths.mjs').changed,false);
});
