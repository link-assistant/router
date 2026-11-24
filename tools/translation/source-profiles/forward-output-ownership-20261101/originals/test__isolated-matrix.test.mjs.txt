import {repositorySourcePath} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../compilation-matrix.mjs';
import {captureSourceCorpus} from '../source-corpus.mjs';
import {createIsolatedMatrixSession} from '../isolated-matrix-session.mjs';
import {deriveIsolatedMatrixSources} from '../prepare-isolated-matrix.mjs';
import {regenerateCompilationMatrix as isolate} from '../isolated-matrix-bulk.mjs';
import {validateRegenerationPlan} from '../bulk.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {loadProjectMetaStorage} from '../project-meta-storage.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const paths=['src/lib.rs','src/windows.rs'];
const source={
 'src/lib.rs':'pub const SHARED:u8=7;#[cfg(unix)]pub mod platform {pub const FAMILY:u8=11;pub fn value()->u8{super::SHARED+FAMILY}}#[cfg(windows)]#[path="windows.rs"]pub mod platform;#[cfg(unix)]pub fn result()->u8{platform::value()}#[cfg(windows)]pub fn result()->u8{platform::value()}',
 'src/windows.rs':'pub const FAMILY:u8=23;pub fn value()->u8{super::SHARED+FAMILY}',
};
const matrix=()=>createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
function fixture(t,git=false){
 const directory=mkdtempSync(join(tmpdir(),'router-isolated-matrix-receiving-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));mkdirSync(join(directory,'src'));
 for(const [name,value]of Object.entries(source))writeFileSync(join(directory,name),value);
 if(git){const run=args=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','gc.auto=0',...args],{cwd:directory,stdio:'pipe'});run(['init','--quiet']);run(['add','--',...paths]);run(['-c','user.name=Router fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','Complete source fixture']);}
 return directory;
}
function vector(directory){
 const rows=[];function walk(relative){if(!existsSync(join(directory,relative)))return;for(const entry of readdirSync(join(directory,relative),{withFileTypes:true})){const path=relative+'/'+entry.name;if(entry.isDirectory())walk(path);else rows.push({path,bytes:readFileSync(join(directory,path)).toString('base64')});}}walk('profiles');return rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
function noTemporary(directory){assert.deepEqual(readdirSync(directory).filter(name=>name.startsWith('.router-isolated-matrix-')),[]);}
function retain(name,value){const directory=process.env.ROUTER_ISOLATED_MATRIX_VECTORS;if(!directory)return;mkdirSync(directory,{recursive:true});const bytes=Buffer.from(JSON.stringify(value)+'\n'),path=join(directory,name+'.json.gz');writeFileSync(path,gzipSync(bytes),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path)),bytes);}
const variants=[
 ['ordinary','matrix-bulk.mjs','isolated-matrix-bulk.mjs'],
 ['retained','retained-matrix-bulk.mjs','isolated-retained-matrix-bulk.mjs'],
 ['owned','owned-definitions-matrix-bulk.mjs','isolated-owned-definitions-matrix-bulk.mjs'],
 ['retained-owned','retained-owned-definitions-matrix-bulk.mjs','isolated-retained-owned-definitions-matrix-bulk.mjs'],
];
for(const [label,originalPath,currentPath]of variants)test('separate fresh '+label+' profiles preserve every original output byte, full source and strict typed behavior',{timeout:90000},async t=>{
 const directory=fixture(t,label.includes('owned')),selection=matrix(),options={root:directory,matrix:selection,sources:paths},original=await import('../'+originalPath),current=await import('../'+currentPath);
 const before=original.regenerateCompilationMatrix(options),expected=vector(directory);let actual,observed;
 try{actual=current.regenerateCompilationMatrix(options);observed=vector(directory);}finally{retain('01-complete-'+label,{source,before,expected,actual,observed:observed??vector(directory)});}
 assert.deepEqual(actual,before);assert.deepEqual(observed,expected);noTemporary(directory);
 for(const member of actual.manifest.profiles){
  const row=member.projects.find(project=>project.entry==='src/lib.rs'),meta=loadProjectMetaStorage(readFileSync(join(directory,row.targets.meta)),{metaPath:row.targets.meta,targets:row.targets,read:path=>readFileSync(join(directory,path))}).meta;
  await verifyTypedTargets({meta,javascript:readFileSync(join(directory,row.targets.javascript),'utf8'),typescript:readFileSync(join(directory,row.targets.typescript),'utf8')},api=>{assert.equal(api.SHARED,7n);if(member.name==='neutral')assert.equal(api.result,undefined);else assert.equal(api.result(),member.name==='unix-family'?18n:30n);},{childTimeoutMs:20000});
 }
 assert.deepEqual(current.regenerateCompilationMatrix({...options,check:true}).failures,[]);assert.deepEqual(vector(directory),expected);noTemporary(directory);
});

test('isolated check retains all missing stale and unexpected refusals and leaves complete outputs unchanged',{timeout:90000},t=>{
 const directory=fixture(t),selection=matrix(),options={root:directory,matrix:selection,sources:paths},written=isolate(options),first=written.manifest.profiles[0],last=written.manifest.profiles.at(-1),missing=first.projects[0].targets.javascript,stale=last.projects[0].targets.typescript,extra=first.directory+'/js/generated/rust-project/extra.mjs';
 rmSync(join(directory,missing));writeFileSync(join(directory,stale),'stale');writeFileSync(join(directory,extra),'extra');const before=vector(directory),checked=isolate({...options,check:true});retain('02-complete-check-refusals',{source,written,missing,stale,extra,before,checked,after:vector(directory)});assert.deepEqual(checked.failures.sort(),['missing: '+missing,'stale: '+stale,'unexpected: '+extra].sort());assert.deepEqual(vector(directory),before);noTemporary(directory);isolate(options);assert.equal(existsSync(join(directory,extra)),false);noTemporary(directory);
});

test('changed original input after a complete profile refuses before any profile is published',{timeout:90000},t=>{
 const directory=fixture(t),selection=matrix();let changed=false;
 assert.throws(()=>isolate({root:directory,matrix:selection,sources:paths,progress:record=>{if(!changed&&record.stage==='profile'&&record.state==='end'){changed=true;writeFileSync(join(directory,'src/windows.rs'),source['src/windows.rs']+'\n');}}}),/complete original source/);assert.equal(changed,true);assert.deepEqual(vector(directory),[]);noTemporary(directory);retain('03-complete-changed-input',{source,changed,after:readFileSync(join(directory,'src/windows.rs'),'utf8'),outputs:vector(directory)});
});

test('every staged byte is rejoined after all profiles and a damaged staged output cannot be published',{timeout:90000},t=>{
 const directory=fixture(t),selection=matrix();let changed=false,damaged;
 assert.throws(()=>isolate({root:directory,matrix:selection,sources:paths,progress:record=>{if(!changed&&record.stage==='profile'&&record.state==='end'){changed=true;const staging=readdirSync(directory).filter(name=>name.startsWith('.router-isolated-matrix-'));assert.equal(staging.length,1);damaged=compilationMatrixDescription(selection).profiles[0].directory+'/js/generated/rust-project/src/lib.mjs';writeFileSync(join(directory,staging[0],damaged),'changed staged output');}}}),/staged output byte/);assert.equal(changed,true);assert.deepEqual(vector(directory),[]);noTemporary(directory);retain('04-complete-damaged-staging',{source,changed,damaged,outputs:vector(directory)});
});

test('a later worker symlink failure preserves all original outputs and external sentinel bytes',{timeout:90000},t=>{
 const directory=fixture(t),outside=mkdtempSync(join(tmpdir(),'router-isolated-external-sentinel-'));t.after(()=>rmSync(outside,{recursive:true,force:true}));writeFileSync(join(outside,'sentinel'),'external unchanged');const selection=matrix(),members=compilationMatrixDescription(selection).profiles;let changed=false;
 assert.throws(()=>isolate({root:directory,matrix:selection,sources:paths,progress:record=>{if(!changed&&record.stage==='profile'&&record.state==='end'){changed=true;const staging=readdirSync(directory).find(name=>name.startsWith('.router-isolated-matrix-'));symlinkSync(outside,join(directory,staging,members[1].directory),'dir');}}}),/Fresh complete profile.*failed/);assert.equal(changed,true);assert.equal(readFileSync(join(outside,'sentinel'),'utf8'),'external unchanged');assert.deepEqual(vector(directory),[]);noTemporary(directory);retain('05-complete-worker-refusal',{source,changed,sentinel:readFileSync(join(outside,'sentinel'),'utf8'),outputs:vector(directory)});
});

test('copied corpus and matrix handles and public staged plan fields grant no private planner authority',{timeout:30000},t=>{
 const directory=fixture(t),selection=matrix(),corpus=captureSourceCorpus({root:directory,paths}),options={root:directory,matrix:selection,corpus,paths,entries:['src/lib.rs'],plannerModule:'bulk.mjs'};
 assert.throws(()=>createIsolatedMatrixSession({...options,matrix:structuredClone(selection)}),/original explicit compilation matrix/);assert.throws(()=>createIsolatedMatrixSession({...options,corpus:structuredClone(corpus)}),/unsealed/);noTemporary(directory);
 const session=createIsolatedMatrixSession(options);try{assert.throws(()=>session.validate({schema:'checked-bulk-output-plan-v1',outputs:[],manifest:{runtimeParity:true}}),/unissued/);assert.throws(()=>session.applyAll([]),/complete selected profile set/);assert.throws(()=>session.applyAll([{}, {}, {}]),/unissued/);assert.throws(()=>validateRegenerationPlan({schema:'checked-bulk-output-plan-v1',outputs:[]}),/Unsealed/);}finally{session.close();}noTemporary(directory);
});

test('every complete process-lifetime copy reproduces its original source and CST inverse',{timeout:30000},()=>{
 const proposal=deriveIsolatedMatrixSources(root);assert.equal(proposal.files.length,5);for(const row of proposal.files){assert.equal(readFileSync(join(root,repositorySourcePath(row.path,root)),'utf8'),row.text);assert.equal(row.inverse,row.source);assert.ok(row.beforeMeta);assert.ok(row.afterMeta);assert.equal(row.semanticAuthority,false);}retain('06-complete-source-derivation',proposal);
});
