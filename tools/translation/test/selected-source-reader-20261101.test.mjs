// Independent source cases. UNRUN; no production/corpus installation performed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {readSelectedTrackedSourceBytes as read,withSelectedTrackedSourceOperation as operation} from '../selected-source-reader-20261101.mjs';
import {withBoundedTrackedSourceOperation as oldOperation} from '../forward-output-ownership-20261101-bounded-bytes.mjs';
import {proposeSelectedSourceReaderHistory} from '../selected-source-reader-20261101-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {acquireSelectedSourceIndexImage,withSelectedSourceIndexHandle,verifySelectedSourceIndexImage,closeSelectedSourceIndexImage,inspectSelectedSourceIndexImage,preloadSelectedSourceIndexInputs,readSelectedSourceRustPaths,readSelectedSourceOwnedRustPaths,readSelectedSourceCargoPaths,readSelectedSourceOwnedCargoPaths,readSelectedSourceInputListing} from '../selected-source-reader-20261101-index.mjs';
import {captureSelectedSourceGitEnvelope,verifySelectedSourceGitEnvelope} from '../selected-source-reader-20261101-metadata.mjs';
const env=()=>({...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_CONFIG_SYSTEM:process.platform==='win32'?'NUL':'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'});
function git(root,args,input){return cp.execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','core.fsmonitor=false','-c','core.untrackedCache=false',...args],{env:env(),encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024,...(input===undefined?{}:{input})});}
function fixture(t,{initialized=true,committed=true}={}){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-selected-source-')));fs.mkdirSync(join(root,'src'));fs.writeFileSync(join(root,'src/lib.rs'),'pub fn value()->u8{7}\n');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 if(initialized){git(root,['init','--template=']);git(root,['config','user.name','Source case']);git(root,['config','user.email','source-case@example.invalid']);if(committed){git(root,['add','--','src/lib.rs']);git(root,['commit','--no-gpg-sign','-m','original complete source']);}}
 return root;
}
function exact(run,expected){let failed=false,primary;try{run();}catch(error){failed=true;primary=error;}assert.equal(failed,true);assert.strictEqual(primary,expected);}
function spyGit(run){const old=cp.execFileSync,rows=[];try{cp.execFileSync=(file,args,...rest)=>{rows.push({file,args:[...args],options:rest[0]});return old(file,args,...rest);};syncBuiltinESMExports();return run(rows);}finally{cp.execFileSync=old;syncBuiltinESMExports();}}

test('complete successor and virtual original-issuer delegation retain full CST/inverse history',{timeout:60000},()=>{
 const value=proposeSelectedSourceReaderHistory();assert.equal(value.files.length,4);assert.equal(value.sourceAuthority,false);assert.equal(value.originalCorpusPhysicallyChanged,false);
 for(const row of value.files){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);assert.deepEqual(row.inverseTrace.map(step=>step.phase),['language','repository']);}
 const corpus=value.files.find(row=>row.path==='tools/translation/source-corpus.mjs');assert.equal(corpus.physicallyInstalled,false);assert.match(corpus.before,/const states=new WeakMap/);assert.match(corpus.after,/const states=new WeakMap/);assert.match(corpus.after,/readSelectedTrackedSourceBytes/);
});
test('actual tracked dirty, ordinary untracked, empty and no-Git reads preserve byte domains',{timeout:60000},t=>{
 const root=fixture(t);fs.writeFileSync(join(root,'src/lib.rs'),'dirty original\0bytes');fs.writeFileSync(join(root,'untracked.rs'),'ordinary untracked');
 assert.deepEqual(operation(root,()=>read(root,'src/lib.rs')),Buffer.from('dirty original\0bytes'));assert.equal(operation(root,()=>read(root,'untracked.rs')).toString(),'ordinary untracked');assert.equal(operation(root,()=>[]).length,0);
 const plain=fixture(t,{initialized:false});assert.equal(operation(plain,()=>read(plain,'src/lib.rs')).toString(),'pub fn value()->u8{7}\n');
});
test('selected transport never launches a global Rust census, including empty selection',{timeout:60000},t=>{
 const root=fixture(t);spyGit(rows=>{operation(root,()=>read(root,'src/lib.rs'));operation(root,()=>0);assert.ok(rows.length>0);for(const row of rows){assert.ok(!row.args.includes('*.rs'));const at=row.args.indexOf('ls-files');if(at>=0){assert.ok(row.args.includes(':(top,literal)src/lib.rs'));assert.ok(row.args.includes(':(top,literal,exclude)src/lib.rs/'));}}});
});
test('actual selected metadata preload batches by argv geometry and closes all rows',{timeout:60000},t=>{
 const root=fixture(t),names=Array.from({length:2000},(_,index)=>'src/untracked-'+index+'.rs');names.push('src/lib.rs');
 spyGit(rows=>{operation(root,()=>{for(let index=0;index<100;index++)read(root,'src/lib.rs');},{preload:names});const queries=rows.filter(row=>row.args.includes('ls-files'));assert.ok(queries.length>2);assert.ok(queries.length<100);assert.ok(queries.every(row=>!row.args.includes('*.rs')));for(const row of queries){assert.ok(row.args.join('\0').length<30000);assert.ok(Buffer.byteLength(row.args.join('\0'))<24000);}});
});
test('closed original listings retain raw bytes, exact flags, omitted defaults and original bounds',{timeout:60000},t=>{
 const root=fixture(t);fs.mkdirSync(join(root,'tools/translation/source-profiles'),{recursive:true});fs.writeFileSync(join(root,'tools/translation/compiler.mjs'),'export const checked=7;\n');fs.writeFileSync(join(root,'tools/translation/source-profiles/profile.mjs'),'export const profile=1;\n');fs.writeFileSync(join(root,'Cargo.toml'),'[package]\nname="source-case"\nversion="0.0.0"\n');git(root,['add','--','tools/translation/compiler.mjs','tools/translation/source-profiles/profile.mjs','Cargo.toml']);
 fs.writeFileSync(join(root,'.gitignore'),'*.ignored.mjs\n');fs.writeFileSync(join(root,'tools/translation/untracked.ignored.mjs'),'original untracked input');
 spyGit(rows=>{operation(root,()=>{
  assert.match(readSelectedSourceRustPaths(root),/src\/lib\.rs\0/u);assert.match(readSelectedSourceOwnedRustPaths(root),/src\/lib\.rs\0/u);assert.match(readSelectedSourceCargoPaths(root),/Cargo\.toml\0/u);assert.match(readSelectedSourceOwnedCargoPaths(root),/Cargo\.toml\0/u);
  for(const kind of ['compiler-stage','compiler-others','profile-stage','profile-others']){const raw=readSelectedSourceInputListing(root,kind);assert.ok(Buffer.isBuffer(raw));if(kind==='compiler-others')assert.match(raw.toString(),/untracked\.ignored\.mjs\0/u);raw.fill(0);readSelectedSourceInputListing(root,kind);}
 });
 const queries=rows.filter(row=>row.args.includes('ls-files'));assert.ok(queries.some(row=>row.args.includes('*.rs')&&!Object.hasOwn(row.options,'maxBuffer')&&!Object.hasOwn(row.options,'timeout')));assert.ok(queries.some(row=>row.args.includes('*.rs')&&row.options.maxBuffer===16*1024*1024&&row.options.timeout===30000));
 for(const row of queries.filter(row=>row.args.includes('tools/translation/')||row.args.includes('tools/translation/source-profiles/'))){assert.equal(row.options.maxBuffer,8*1024*1024);assert.equal(row.options.timeout,10000);assert.equal(Object.hasOwn(row.options,'encoding'),false);assert.ok(!row.args.includes('--exclude-standard'));}
 });
});
test('explicit inherited-parent listings keep original cwd; ordinary no-Git reads never discover it',{timeout:60000},t=>{
 const root=fixture(t),cwd=join(root,'src');spyGit(rows=>{assert.ok(operation(cwd,()=>read(cwd,'lib.rs')).length>0);assert.equal(rows.length,0);});
 operation(cwd,()=>{assert.equal(readSelectedSourceRustPaths(cwd),'lib.rs\0');assert.ok(read(cwd,'lib.rs').length>0);});
});
test('unknown listing kinds and changed original untracked census remain caught poison',{timeout:60000},t=>{
 const root=fixture(t);assert.throws(()=>operation(root,()=>{try{readSelectedSourceInputListing(root,'caller-command');}catch{}return false;}),/fixed/);
 fs.mkdirSync(join(root,'tools/translation'),{recursive:true});assert.throws(()=>operation(root,()=>{readSelectedSourceInputListing(root,'compiler-others');fs.writeFileSync(join(root,'tools/translation/new.mjs'),'new untracked actual source');}),/changed/);
});
test('async owner keeps a genuine live image without an ACTIVE context across awaits',{timeout:60000},async t=>{
 const root=fixture(t);git(root,['update-index','--split-index']);const handle=acquireSelectedSourceIndexImage(root);let metadata,descriptor,primary,failed=false;
 try{descriptor=inspectSelectedSourceIndexImage(handle);withSelectedSourceIndexHandle(handle,()=>{preloadSelectedSourceIndexInputs(root,['src/lib.rs','optional.rs']);metadata=captureSelectedSourceGitEnvelope(root);});await Promise.resolve();
  withSelectedSourceIndexHandle(handle,()=>{verifySelectedSourceGitEnvelope(root,metadata);assert.ok(read(root,'src/lib.rs').length>0);});verifySelectedSourceIndexImage(handle);
 }catch(error){failed=true;primary=error;}finally{try{closeSelectedSourceIndexImage(handle);}catch(error){if(!failed){failed=true;primary=error;}}}
 if(failed)throw primary;assert.equal(inspectSelectedSourceIndexImage(handle).closed,true);assert.equal(fs.existsSync(descriptor.temporaryDirectory),false);assert.throws(()=>verifySelectedSourceIndexImage(handle),/live/);assert.throws(()=>withSelectedSourceIndexHandle({...handle},()=>0),/live/);
});
test('private async-owner handles retain caught falsy poison and attempt exact closing',{timeout:60000},t=>{
 const root=fixture(t),handle=acquireSelectedSourceIndexImage(root),descriptor=inspectSelectedSourceIndexImage(handle);
 exact(()=>withSelectedSourceIndexHandle(handle,()=>{throw undefined;}),undefined);exact(()=>withSelectedSourceIndexHandle(handle,()=>7),undefined);exact(()=>verifySelectedSourceIndexImage(handle),undefined);exact(()=>closeSelectedSourceIndexImage(handle),undefined);assert.equal(inspectSelectedSourceIndexImage(handle).closed,true);assert.equal(fs.existsSync(descriptor.temporaryDirectory),false);
});
test('caught/restored root lookup failures poison explicit handles and cannot skip cleanup',{timeout:60000},t=>{
 const root=fixture(t),handle=acquireSelectedSourceIndexImage(root),descriptor=inspectSelectedSourceIndexImage(handle),saved=fs.realpathSync;
 exact(()=>withSelectedSourceIndexHandle(handle,()=>{try{fs.realpathSync=()=>{throw null;};exact(()=>read(root,'src/lib.rs'),null);}finally{fs.realpathSync=saved;}return 7;}),null);
 exact(()=>closeSelectedSourceIndexImage(handle),null);assert.equal(fs.existsSync(descriptor.temporaryDirectory),false);
});
test('actual unrelated index census above old16Mi does not constrain explicit or empty successor reads',{timeout:60000},t=>{
 const root=fixture(t),oid=git(root,['hash-object','-w','--stdin'],'unrelated immutable blob').trim();let input='';
 // Actual Git index, not a fabricated Git response or semantic source permit.
 // 70,000 long unrelated paths make the old stage census exceed16MiB.
 for(let index=0;index<70000;index++)input+='100644 '+oid+'\tunrelated/'+String(index).padStart(6,'0')+'x'.repeat(220)+'.rs\n';
 git(root,['update-index','--index-info'],input);
 assert.equal(operation(root,()=>read(root,'src/lib.rs')).toString(),'pub fn value()->u8{7}\n');assert.equal(operation(root,()=>false),false);
 assert.throws(()=>oldOperation(root,()=>0));
});
test('an ordinary file shadowing an indexed directory keeps only exact literal rows',{timeout:60000},t=>{
 const root=fixture(t);fs.mkdirSync(join(root,'shadow.rs'));fs.writeFileSync(join(root,'shadow.rs/child.rs'),'indexed child');git(root,['add','--','shadow.rs/child.rs']);fs.rmSync(join(root,'shadow.rs'),{recursive:true});fs.writeFileSync(join(root,'shadow.rs'),'ordinary shadow');assert.equal(operation(root,()=>read(root,'shadow.rs')).toString(),'ordinary shadow');
});
test('literal metacharacters and conflicted index stages are complete DATA, not type authority',{timeout:60000},t=>{
 const root=fixture(t),name='src/[literal]*.rs';if(process.platform==='win32')return;fs.writeFileSync(join(root,name),'literal name');git(root,['--literal-pathspecs','add','--',name]);assert.equal(operation(root,()=>read(root,name)).toString(),'literal name');
 const first=git(root,['hash-object','-w','--stdin'],'one').trim(),second=git(root,['hash-object','-w','--stdin'],'two').trim();git(root,['update-index','--index-info'],'0 '+'0'.repeat(first.length)+'\tsrc/lib.rs\n100644 '+first+' 1\tsrc/lib.rs\n100644 '+first+' 2\tsrc/lib.rs\n100644 '+second+' 3\tsrc/lib.rs\n');assert.equal(operation(root,()=>read(root,'src/lib.rs')).toString(),'pub fn value()->u8{7}\n');
});
test('unmerged D/F descendants do not leak into exact ordinary file selection',{timeout:60000},t=>{
 const root=fixture(t),oid=git(root,['hash-object','-w','--stdin'],'conflicted original').trim();
 git(root,['update-index','--index-info'],'100644 '+oid+' 2\tconflict.rs\n100644 '+oid+' 3\tconflict.rs/child.rs\n');fs.writeFileSync(join(root,'conflict.rs'),'ordinary conflict original');assert.equal(operation(root,()=>read(root,'conflict.rs')).toString(),'ordinary conflict original');
});
test('malformed or extra selected rows poison the actual operation even when caught',{timeout:60000},t=>{
 const root=fixture(t),saved=cp.execFileSync;let caught;
 try{cp.execFileSync=(file,args,...rest)=>{const value=saved(file,args,...rest);if(args.includes('ls-files')&&args.includes('--stage'))return value+'100644 '+'a'.repeat(40)+' 0\tother.rs\0';return value;};syncBuiltinESMExports();
  let failed=false,primary;try{operation(root,()=>{try{read(root,'src/lib.rs');}catch(error){caught=error;}return 'caught';});}catch(error){failed=true;primary=error;}assert.equal(failed,true);assert.ok(caught);assert.strictEqual(primary,caught);
 }finally{cp.execFileSync=saved;syncBuiltinESMExports();}
});
test('sparse originals require exact HEAD/skip state; ordinary missing deletion stays refused',{timeout:60000},t=>{
 const root=fixture(t);git(root,['update-index','--skip-worktree','--','src/lib.rs']);fs.unlinkSync(join(root,'src/lib.rs'));assert.equal(operation(root,()=>read(root,'src/lib.rs')).toString(),'pub fn value()->u8{7}\n');
 assert.throws(()=>operation(root,()=>{read(root,'src/lib.rs');git(root,['update-index','--no-skip-worktree','--','src/lib.rs']);}),/changed/);
 assert.throws(()=>operation(root,()=>read(root,'src/lib.rs')));
});
test('actual split index, linked worktree, packed refs, detached and unborn HEAD retain reads',{timeout:60000},t=>{
 const root=fixture(t);git(root,['update-index','--split-index']);assert.equal(operation(root,()=>read(root,'src/lib.rs')).length>0,true);git(root,['pack-refs','--all']);assert.equal(operation(root,()=>read(root,'src/lib.rs')).length>0,true);
 const holder=fixture(t,{initialized:false}),linked=join(holder,'linked');git(root,['worktree','add','--detach','--',linked,'HEAD']);assert.equal(operation(linked,()=>read(linked,'src/lib.rs')).length>0,true);git(root,['checkout','--detach']);assert.equal(operation(root,()=>read(root,'src/lib.rs')).length>0,true);
 const unborn=fixture(t,{committed:false});assert.equal(operation(unborn,()=>read(unborn,'src/lib.rs')).length>0,true);
});
test('actual v4 prefix-compressed and SHA256 split indices remain native-decoded DATA',{timeout:60000},t=>{
 const root=fixture(t);git(root,['update-index','--index-version=4']);assert.ok(operation(root,()=>read(root,'src/lib.rs')).length>0);
 const sha=fixture(t,{initialized:false});git(sha,['init','--template=','--object-format=sha256']);git(sha,['add','--','src/lib.rs']);git(sha,['update-index','--split-index']);assert.ok(operation(sha,()=>read(sha,'src/lib.rs')).length>0);
});
test('split transport preserves original full timestamps and disables private conversion hooks',{timeout:60000},t=>{
 const root=fixture(t);git(root,['update-index','--split-index']);const shared=fs.readdirSync(join(root,'.git')).filter(name=>name.startsWith('sharedindex.')).map(name=>join(root,'.git',name)),paths=[join(root,'.git/index'),...shared];
 const stamp=file=>{const stat=fs.lstatSync(file,{bigint:true});return [stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(String);},before=paths.map(stamp),marker=join(root,'must-not-run-hook'),hook=join(root,'.git/hooks/post-index-change');fs.writeFileSync(hook,'#!/bin/sh\nprintf forbidden > "'+marker+'"\n',{mode:0o700});
 const rawIndex=process.env.GIT_INDEX_FILE;process.env.GIT_INDEX_FILE=join(root,'caller-forged-index');
 try{spyGit(rows=>{assert.ok(operation(root,()=>read(root,'src/lib.rs')).length>0);const conversions=rows.filter(row=>row.args.includes('update-index'));assert.equal(conversions.length,1);for(const row of conversions){assert.ok(row.args.includes('--no-split-index'));assert.ok(row.args.includes('core.hooksPath=/dev/null'));assert.ok(row.args.includes('core.fsmonitor=false'));assert.equal(row.options.env.GIT_COMMON_DIR,join(root,'.git'));assert.ok(row.options.env.GIT_DIR.includes('router-selected-index-'));assert.equal(row.options.env.GIT_OPTIONAL_LOCKS,'0');}
  for(const row of rows.filter(row=>row.args.includes('ls-files'))){assert.equal(row.options.env.GIT_DIR,undefined);assert.equal(row.options.env.GIT_COMMON_DIR,undefined);assert.ok(row.options.env.GIT_INDEX_FILE.includes('router-selected-index-'));assert.notEqual(row.options.env.GIT_INDEX_FILE,process.env.GIT_INDEX_FILE);}
 });}finally{if(rawIndex===undefined)delete process.env.GIT_INDEX_FILE;else process.env.GIT_INDEX_FILE=rawIndex;}
 assert.deepEqual(paths.map(stamp),before);assert.equal(fs.existsSync(marker),false);
});
test('owned image cleanup retains unknown paths and never removes original sources',{timeout:60000},t=>{
 const root=fixture(t),saved=fs.mkdtempSync,created=[];try{fs.mkdtempSync=(prefix,...rest)=>{const value=saved(prefix,...rest);if(String(prefix).includes('router-selected-index-'))created.push(value);return value;};
  assert.throws(()=>operation(root,()=>{assert.equal(created.length,1);fs.writeFileSync(join(created[0],'unknown-evidence'),'retain unknown');read(root,'src/lib.rs');}),/unknown/);
 }finally{fs.mkdtempSync=saved;}
 assert.equal(fs.readFileSync(join(root,'src/lib.rs'),'utf8'),'pub fn value()->u8{7}\n');assert.equal(fs.readFileSync(join(created[0],'unknown-evidence'),'utf8'),'retain unknown');for(const directory of created)t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
});
test('hidden synchronous handle reports retained paths without replacing falsy or frozen primary',{timeout:60000},t=>{
 const root=fixture(t),savedMake=fs.mkdtempSync,savedWrite=fs.writeSync,created=[],messages=[];
 try{fs.mkdtempSync=(prefix,...rest)=>{const value=savedMake(prefix,...rest);if(String(prefix).includes('router-selected-index-'))created.push(value);return value;};fs.writeSync=(fd,buffer,offset,length,...rest)=>{if(fd===2){messages.push(Buffer.from(buffer.subarray(offset,offset+length)));return length;}return savedWrite(fd,buffer,offset,length,...rest);};
  for(const primary of [false,undefined,Object.freeze({failure:'frozen original'})]){
   const start=created.length;exact(()=>operation(root,()=>{const directory=created[start];fs.writeFileSync(join(directory,'unknown-evidence'),'retain actual unknown');throw primary;}),primary);
   const report=JSON.parse(messages.at(-1).toString());assert.equal(report.schema,'selected-source-reader-recovery-data-v1');assert.equal(report.phase,'scope-failed');assert.deepEqual(report.recoveryPaths,[created[start]]);assert.equal(report.complete,true);assert.equal(report.omittedPaths,0);assert.equal(report.cleanupAllowed,false);assert.equal(report.sourceAuthority,false);assert.equal(report.semanticAuthority,false);assert.ok(messages.at(-1).length<=512*1024);assert.equal(fs.readFileSync(join(created[start],'unknown-evidence'),'utf8'),'retain actual unknown');
  }
  const start=created.length,savedRead=fs.readSync;
  exact(()=>operation(root,()=>{try{fs.readSync=()=>{throw false;};exact(()=>read(root,'src/lib.rs'),false);}finally{fs.readSync=savedRead;}fs.writeFileSync(join(created[start],'unknown-after-caught-failure'),'retain caught failure');return 'caught source false';}),false);
  const caughtReport=JSON.parse(messages.at(-1).toString());assert.deepEqual(caughtReport.recoveryPaths,[created[start]]);assert.equal(caughtReport.phase,'scope-failed');assert.equal(caughtReport.cleanupAllowed,false);assert.equal(fs.readFileSync(join(created[start],'unknown-after-caught-failure'),'utf8'),'retain caught failure');
 }finally{fs.mkdtempSync=savedMake;fs.writeSync=savedWrite;for(const directory of created)t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));}
});
test('partial acquisition emits bounded recovery DATA and failed stderr cannot replace original',{timeout:60000},t=>{
 const root=fixture(t),savedMake=fs.mkdtempSync,savedOpen=fs.openSync,savedWrite=fs.writeSync,created=[],messages=[];let failDiagnostic=false,attempts=0;
 try{fs.mkdtempSync=(prefix,...rest)=>{const value=savedMake(prefix,...rest);if(String(prefix).includes('router-selected-index-'))created.push(value);return value;};
  fs.openSync=(file,...rest)=>{if(String(file).endsWith('original-index')){fs.writeFileSync(join(created.at(-1),'unknown-acquisition-evidence'),'retain acquisition unknown');throw false;}return savedOpen(file,...rest);};
  fs.writeSync=(fd,buffer,offset,length,...rest)=>{if(fd===2){attempts++;if(failDiagnostic)throw Object.freeze({failure:'stderr secondary'});messages.push(Buffer.from(buffer.subarray(offset,offset+length)));return length;}return savedWrite(fd,buffer,offset,length,...rest);};
  exact(()=>acquireSelectedSourceIndexImage(root),false);const report=JSON.parse(Buffer.concat(messages).toString());assert.equal(report.phase,'acquire-failed');assert.deepEqual(report.recoveryPaths,[created[0]]);assert.equal(report.complete,true);assert.equal(report.cleanupAllowed,false);assert.ok(Buffer.concat(messages).length<=512*1024);
  failDiagnostic=true;exact(()=>acquireSelectedSourceIndexImage(root),false);assert.equal(attempts,2);assert.equal(fs.readFileSync(join(created[1],'unknown-acquisition-evidence'),'utf8'),'retain acquisition unknown');
 }finally{fs.mkdtempSync=savedMake;fs.openSync=savedOpen;fs.writeSync=savedWrite;for(const directory of created)t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));}
});
test('TMPDIR inside original namespace never grants a source ancestor stamp waiver',{timeout:60000},t=>{
 const root=fixture(t),inside=join(root,'temporary-parent');fs.mkdirSync(inside);const before=Object.fromEntries(['TMPDIR','TEMP','TMP'].map(key=>[key,process.env[key]]));let handle;
 try{for(const key of Object.keys(before))process.env[key]=inside;handle=acquireSelectedSourceIndexImage(root);const descriptor=inspectSelectedSourceIndexImage(handle);assert.ok(!descriptor.temporaryDirectory.startsWith(root+'/')&&!descriptor.temporaryDirectory.startsWith(root+'\\'));withSelectedSourceIndexHandle(handle,()=>assert.ok(read(root,'src/lib.rs').length>0));}
 finally{for(const [key,value] of Object.entries(before))if(value===undefined)delete process.env[key];else process.env[key]=value;if(handle)closeSelectedSourceIndexImage(handle);}
});
test('actual symbolic hop closure and unchanged-byte ref replacement remain fenced',{timeout:60000},t=>{
 const root=fixture(t),original=git(root,['symbolic-ref','HEAD']).trim();git(root,['symbolic-ref','refs/heads/source-alias',original]);git(root,['symbolic-ref','HEAD','refs/heads/source-alias']);assert.ok(operation(root,()=>read(root,'src/lib.rs')).length>0);
 const reference=join(root,'.git/refs/heads/source-alias');assert.throws(()=>operation(root,()=>{read(root,'src/lib.rs');const value=fs.readFileSync(reference);fs.writeFileSync(reference+'.replacement',value);fs.renameSync(reference+'.replacement',reference);}),/changed/);
});
test('metadata acquisition failure closes all acquired records and preserves falsy primary',{timeout:60000},t=>{
 const root=fixture(t),saved=fs.lstatSync,index=join(root,'.git/index');let injected=false,closed=0;
 try{fs.lstatSync=(file,...rest)=>{if(resolve(file)===index&&!injected){injected=true;throw false;}if(injected&&resolve(file)===root)closed++;return saved(file,...rest);};exact(()=>operation(root,()=>0),false);}finally{fs.lstatSync=saved;}assert.ok(injected);assert.ok(closed>0);
});
test('unrelated index replacement and byte-restoration changes cannot pass a selected fence',{timeout:60000},t=>{
 const root=fixture(t),index=join(root,'.git/index');assert.throws(()=>operation(root,()=>{read(root,'src/lib.rs');const bytes=fs.readFileSync(index);fs.writeFileSync(index,bytes);}),/changed/);
 assert.throws(()=>operation(root,()=>{const bytes=fs.readFileSync(index);fs.writeFileSync(index+'.new',bytes);fs.renameSync(index+'.new',index);}),/changed/);
});
test('source restoration and caught/falsy failures poison all matching frames exactly',{timeout:60000},t=>{
 const root=fixture(t,{initialized:false}),file=join(root,'src/lib.rs');assert.throws(()=>operation(root,()=>{const original=read(root,'src/lib.rs');fs.writeFileSync(file,'changed');fs.writeFileSync(file,original);}),/changed/);
 const saved=fs.readSync;for(const primary of [false,undefined,null,0,'',Object.freeze({failure:'read'})])try{fs.readSync=()=>{throw primary;};exact(()=>operation(root,()=>{exact(()=>read(root,'src/lib.rs'),primary);return 'caught';}),primary);exact(()=>operation(root,()=>{try{operation(root,()=>read(root,'src/lib.rs'));}catch{}return 'nested caught';}),primary);}finally{fs.readSync=saved;}
});
test('all FD closing attempts preserve exact primitive/frozen primaries and detached observations',{timeout:60000},t=>{
 const root=fixture(t),savedRead=fs.readSync,savedClose=fs.closeSync;for(const primary of [false,undefined,Object.freeze({failure:'primary'})]){let closed=0;try{fs.readSync=()=>{throw primary;};fs.closeSync=fd=>{closed++;savedClose(fd);throw new Error('secondary close');};exact(()=>operation(root,()=>read(root,'src/lib.rs')),primary);}finally{fs.readSync=savedRead;fs.closeSync=savedClose;}assert.ok(closed>0);}
 const events=[];operation(root,()=>read(root,'src/lib.rs'),{observe:event=>{events.push(event);event.bytes.fill(0);event.parents.length=0;}});assert.equal(events.length>0,true);assert.equal(operation(root,()=>read(root,'src/lib.rs')).toString(),'pub fn value()->u8{7}\n');assert.ok(events.every(row=>row.sourceAuthority===false&&row.semanticAuthority===false));
});
test('own DATA options, original per-read and explicit operation buckets remain closed',{timeout:60000},t=>{
 const root=fixture(t);let calls=0;const get=()=>{calls++;throw Error('getter');};assert.throws(()=>operation(root,()=>0,{get observe(){return get();}}));assert.throws(()=>read(root,'src/lib.rs',{get maxBytes(){return get();}}));assert.equal(calls,0);
 assert.throws(()=>operation(root,()=>read(root,'src/lib.rs'),{limits:{paths:0}}));assert.throws(()=>read(root,'src/lib.rs',{maxBytes:1}));assert.throws(()=>operation(root,()=>read(root,'src/lib.rs'),{observe:async()=>{}}));assert.throws(()=>operation(root,new Proxy(()=>0,{})));
 assert.throws(()=>operation(root,()=>{try{read(root,'../unknown');}catch{}return false;}));assert.equal(operation(root,()=>read(root,'src/lib.rs'),{limits:{paths:1,bytes:1024}}).length>0,true);
});
