import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,lstatSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../compilation-matrix.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
// The full original isolated-matrix data model: shared constant, inline Unix
// owner, external Windows owner, and family-gated functions. Keep all profiles.
const sources={
 'src/lib.rs':'pub const SHARED:u8=7;#[cfg(unix)]pub mod platform {pub const FAMILY:u8=11;pub fn value()->u8{super::SHARED+FAMILY}}#[cfg(windows)]#[path="windows.rs"]pub mod platform;#[cfg(unix)]pub fn result()->u8{platform::value()}#[cfg(windows)]pub fn result()->u8{platform::value()}',
 'src/windows.rs':'pub const FAMILY:u8=23;pub fn value()->u8{super::SHARED+FAMILY}',
};
const env=()=>Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-field-three-profile-cli-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));mkdirSync(join(directory,'src'));
 for(const [path,source]of Object.entries(sources))writeFileSync(join(directory,path),source);
 const git=args=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','gc.auto=0',...args],{cwd:directory,env:env(),timeout:10000,stdio:'pipe'});git(['init','--quiet']);git(['add','--',...Object.keys(sources)]);return directory;
}
function artifacts(directory){
 const result=[];function walk(base){for(const name of readdirSync(join(directory,base))){if(!base&&name==='.git')continue;const path=base?base+'/'+name:name,physical=join(directory,path),stat=lstatSync(physical);assert.equal(stat.isSymbolicLink(),false,path);if(stat.isDirectory())walk(path);else{assert.equal(stat.isFile(),true,path);result.push({path,base64:readFileSync(physical).toString('base64')});}}}walk('');return result.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
function retain(name,value){
 const directory=process.env.ROUTER_OWNED_FIELD_MATRIX_VECTORS;if(!directory)return;mkdirSync(directory,{recursive:true});const raw=Buffer.from(JSON.stringify(value)+'\n'),target=join(directory,name+'.json.gz');assert.ok(raw.length<=64*1024*1024);writeFileSync(target,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(target),{maxOutputLength:64*1024*1024}),raw);
}
function run(directory,variant,{retained,check},records){
 const cli=join(root,'scripts',variant==='original'?'translate-router.mjs':'translate-router-owned-field-meta.mjs'),args=[cli,'--root',directory,'--profile-matrix',...(retained?['--retain-output-text']:[]),...(check?['--check']:[])];
 const result=spawnSync(process.execPath,args,{cwd:root,env:env(),encoding:'utf8',timeout:20000,maxBuffer:8388608}),record={variant,args,status:result.status,signal:result.signal,error:result.error?{name:result.error.name,message:result.error.message,code:result.error.code}:null,stdout:result.stdout,stderr:result.stderr};records.push(record);
 assert.equal(result.error,undefined,record.error?.message);assert.equal(result.signal,null);assert.equal(result.status,0,record.stderr);const report=JSON.parse(result.stdout);
 const expected=compilationMatrixDescription(createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES}));assert.equal(expected.profiles.length,3);assert.deepEqual(report.profiles.map(row=>({name:row.name,profileSha256:row.profileSha256})),expected.profiles.map(row=>({name:row.name,profileSha256:row.sha256})));assert.equal(report.mode,check?'check':'write');assert.equal(report.runtimeParity,false);
 assert.deepEqual(readdirSync(directory).filter(name=>name.startsWith('.router-isolated-matrix-')),[]);for(const [path,source]of Object.entries(sources))assert.equal(readFileSync(join(directory,path),'utf8'),source);return report;
}
for(const retained of [false,true]){
 const label=retained?'retained':'ordinary';
 test('all three genuine '+label+' isolated CLI write profiles preserve complete reports and every artifact byte',{timeout:60000},t=>{
  const directory=fixture(t),records=[];let before,after,expected,actual;
  try{before=run(directory,'original',{retained,check:false},records);expected=artifacts(directory);after=run(directory,'owned-field',{retained,check:false},records);actual=artifacts(directory);assert.deepEqual(after,before);assert.deepEqual(actual,expected);
   // A real nested full-payload mutation must fail the same complete comparison.
   const changed=structuredClone(actual),row=changed.find(row=>row.path.endsWith('/parity/rust-source-inventory.json'));assert.ok(row);row.base64=Buffer.from(Buffer.from(row.base64,'base64').toString('utf8')+' ').toString('base64');assert.throws(()=>assert.deepEqual(changed,expected));
  }finally{retain(label+'-write',{sources,records,before,after,expected,actual:actual??artifacts(directory)});}
 });
 test('all three genuine '+label+' isolated CLI check profiles preserve complete reports and leave every artifact unchanged',{timeout:60000},t=>{
  const directory=fixture(t),records=[];let prepared,before,after,expected,actual;
  try{prepared=run(directory,'original',{retained,check:false},records);expected=artifacts(directory);before=run(directory,'original',{retained,check:true},records);assert.deepEqual(artifacts(directory),expected);after=run(directory,'owned-field',{retained,check:true},records);actual=artifacts(directory);assert.deepEqual(after,before);assert.deepEqual(actual,expected);assert.equal(prepared.matrixSha256,before.matrixSha256);
  }finally{retain(label+'-check',{sources,records,prepared,before,after,expected,actual:actual??artifacts(directory)});}
 });
}
