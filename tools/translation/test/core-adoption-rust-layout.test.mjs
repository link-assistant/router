import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {repositoryRustLayout,rustPackageSourcePath} from '../repository-layout.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const PYTHON=process.env.ROUTER_TRANSLATION_PYTHON??(existsSync('/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12')?'/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12':'python3');
const env={...process.env,PYTHONDONTWRITEBYTECODE:'1'};
const paths=['src/lib.rs','src','tests/oracle.rs','Cargo.toml','Cargo.lock','build.rs','README.md','rust/src/already.rs','fuzz/Cargo.toml','proptest-regressions/cases.txt'];
const script="import sys,json;sys.dont_write_bytecode=True;sys.path.insert(0,sys.argv[1]);import core_adoption_review as source_review;d=json.load(sys.stdin);print(json.dumps({'layout':source_review.repository_rust_layout(d['root']),'paths':[[p,source_review.rust_package_source_path(d['root'],p)] for p in d['paths']],'classification':[[p,source_review.is_rust_cargo_path(p)] for p in d.get('classification',[])]}))";
function observe(root,classification=[]){
 return JSON.parse(execFileSync(PYTHON,['-c',script,join(ROOT,'tools/translation')],{cwd:ROOT,input:JSON.stringify({root,paths,classification}),encoding:'utf8',env,timeout:20000,maxBuffer:2*1024*1024}));
}
function fixture(run){
 const root=mkdtempSync(join(tmpdir(),'router-core-layout-'));
 const write=(name,text='')=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),text);};
 try{return run(root,write);}finally{rmSync(root,{recursive:true,force:true});}
}
let plan;
test('the complete four-file producer retains native Python selections both CST phases and whole inverses',{timeout:60000},()=>{
 plan=JSON.parse(execFileSync(PYTHON,[join(ROOT,'tools/translation/prepare-core-adoption-layout.py'),'--emit',ROOT],{cwd:ROOT,encoding:'utf8',env,timeout:20000,maxBuffer:64*1024*1024}));
 assert.equal(plan.files.length,4);assert.equal(plan.newRuntimeFiles,false);assert.equal(plan.acrossInvocationCache,false);assert.equal(plan.semanticAuthority,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(s=>s.phase),['language','repository']);assert.equal(row.nativePythonAstChecked,true);
  for(const stage of row.stages){assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);
   for(const [source,meta]of [[stage.before,stage.beforeMeta],[stage.after,stage.afterMeta]]){assert.equal(meta.spanUnit,'utf8-byte');assert.equal(JSON.parse(JSON.stringify(meta)).pieces.map(p=>p.text).join(''),source);const bytes=Buffer.from(source);for(const piece of meta.pieces)assert.equal(bytes.subarray(...piece.span).toString(),piece.text);}
  }
 }
});
for(const shape of ['flat','workspace-root-lock','workspace-package-lock'])test('independent Python and JavaScript layout observations agree for '+shape,{timeout:60000},()=>{
 fixture((root,write)=>{
  write('Cargo.toml',shape==='flat'?'[package]\nname="fixture"\n':'[workspace]\nmembers=["rust"]\n');
  if(shape!=='flat')write('rust/Cargo.toml','[package]\nname="fixture"\n');
  write(shape==='workspace-package-lock'?'rust/Cargo.lock':'Cargo.lock');
  const result=observe(root);assert.deepEqual(result.layout,repositoryRustLayout(root));assert.deepEqual(result.paths,paths.map(path=>[path,rustPackageSourcePath(root,path)]));
  assert.equal(result.layout.productionPrefix,shape==='flat'?'src/':'rust/src/');
 });
});
test('both implementations reject a linked manifest or linked Rust package directory',{timeout:60000},()=>{
 for(const shape of ['manifest','directory'])fixture((root,write)=>{
  write('Cargo.toml','[workspace]\nmembers=["rust"]\n');write('actual/Cargo.toml','[package]\nname="fixture"\n');
  if(shape==='manifest'){mkdirSync(join(root,'rust'));symlinkSync(join(root,'actual/Cargo.toml'),join(root,'rust/Cargo.toml'));}
  else symlinkSync(join(root,'actual'),join(root,'rust'));
  assert.throws(()=>repositoryRustLayout(root),/ordinary physical file/);assert.throws(()=>observe(root),/ordinary physical file/);
 });
});
test('all Rust sources and exact nested Cargo basenames remain in the independent guard universe',{timeout:60000},()=>{
 fixture((root,write)=>{write('Cargo.toml','[package]\nname="fixture"\n');
  const rows=[['src/lib.rs',true],['rust/src/lib.rs',true],['Cargo.toml',true],['Cargo.lock',true],['rust/Cargo.toml',true],['rust/fuzz/Cargo.toml',true],['nested/Cargo.lock',true],['src/Cargo.toml.backup',false],['notCargo.toml',false],['README.md',false]];
  assert.deepEqual(observe(root,rows.map(row=>row[0])).classification,rows);
 });
});
test('logical fixture CORE declaration is retained while its independent physical intersections move with the package',{timeout:60000},()=>{
 assert.ok(plan);
 const row=plan.files.find(row=>row.path.endsWith('/core_adoption_json_readers_review.py'));
 const original=row.before.match(/^    expected_core=.*$/m);assert.ok(original);assert.ok(row.after.includes(original[0]));
 assert.match(row.after,/original_paths=\{source_review\.rust_package_source_path\(root,row\[k\]\)/);
 assert.ok(!row.after.includes("visit(root / 'src')"));
 const producer=plan.files.find(row=>row.path==='scripts/propose-core-adoption.py');
 assert.ok(!producer.after.includes("os.walk(ROOT/'src'"));assert.ok(producer.after.includes("'**/Cargo.toml','**/Cargo.lock'"));
});
test('bare controllers retain invalid and foreign CLI diagnostics before importing the operational helper',{timeout:60000},()=>{
 fixture((directory,write)=>{
  const root=join(directory,'source'),source=readFileSync(join(ROOT,'scripts/propose-core-adoption.py'),'utf8');
  write('source/scripts/propose-core-adoption.py',source);write('source/foreign.py',source);
  for(const [script,sequence,expected]of [['scripts/propose-core-adoption.py','unsupported',/invalid choice/],['foreign.py','json-readers',/execute the captured checked-in proposal controller/]]){
   const output=join(directory,'proposal'),child=spawnSync(PYTHON,['-B',join(root,script),'--root',root,'--expected-head','0'.repeat(40),'--output',output,'--sequence',sequence],{cwd:ROOT,env,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
   assert.equal(child.signal,null);assert.notEqual(child.status,0);assert.match(child.stderr,expected);assert.doesNotMatch(child.stderr,/ModuleNotFoundError/);assert.equal(existsSync(output),false);
  }
 });
});
