// SOURCE ONLY / UNRUN. The complete unchanged original corpus test file stays
// mandatory through the existing Node/Bun forward globs; no duplicate import.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {readBoundedTrackedSourceBytes as read,withBoundedTrackedSourceOperation as scope} from '../forward-output-ownership-20261101-bounded-bytes.mjs';
import {captureSourceCorpus,sourceCorpusPaths,sourceCorpusText} from '../source-corpus.mjs';
import {proposeBoundedSourceReaderHistory} from '../forward-output-ownership-20261101-reader-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-bounded-source-data-')));fs.mkdirSync(join(root,'src'));fs.writeFileSync(join(root,'src/lib.rs'),'pub fn answer()->u8{7}\n');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function exact(run,expected){let failed=false,value;try{run();}catch(error){failed=true;value=error;}assert.equal(failed,true);assert.strictEqual(value,expected);}
function git(root,...args){return execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false',...args],{timeout:10000,maxBuffer:1048576,env:Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_')))});}
test('complete independent reader/corpus source history preserves original issuer and two inverse sequences',{timeout:60000},()=>{
 const proposal=proposeBoundedSourceReaderHistory();assert.equal(proposal.files.length,2);assert.equal(proposal.originalCorpusIssuerPreserved,true);assert.equal(proposal.newNamespaceIssuer,false);
 for(const row of proposal.files){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);assert.deepEqual(row.inverseTrace.map(step=>step.phase),['language','repository']);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 const reader=proposal.files.find(row=>row.kind==='independent-data-only-reader-and-synchronous-operation-fence');assert.doesNotMatch(reader.after,/new WeakMap|captureSourceCorpus|sourceCorpusPaths|namespaceAuthority\s*:\s*true/);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);
});
test('original private corpus handle and complete byte/source APIs stay genuine',{timeout:60000},t=>{
 const root=fixture(t),original=read(root,'src/lib.rs'),corpus=captureSourceCorpus({root,paths:['src/lib.rs']});assert.deepEqual(sourceCorpusPaths(corpus,root),['src/lib.rs']);assert.equal(sourceCorpusText(corpus,root,'src/lib.rs'),original.toString('utf8'));
 assert.throws(()=>sourceCorpusPaths(structuredClone(corpus),root),/unsealed/);assert.throws(()=>sourceCorpusPaths({schema:corpus.schema,sources:corpus.sources},root),/unsealed/);
 const raw=scope(root,()=>read(root,'src/lib.rs'));raw.fill(0);assert.equal(sourceCorpusText(corpus,root,'src/lib.rs'),original.toString('utf8'));assert.deepEqual(read(root,'src/lib.rs'),original);
});
test('ordinary actual Windows source/corpus reads retain the original API without POSIX flag prerequisites',{timeout:60000,skip:process.platform!=='win32'},t=>{
 const root=fixture(t),expected=fs.readFileSync(join(root,'src/lib.rs'));
 assert.deepEqual(scope(root,()=>read(root,'src/lib.rs')),expected);const value=captureSourceCorpus({root,paths:['src/lib.rs']});assert.equal(sourceCorpusText(value,root,'src/lib.rs'),expected.toString('utf8'));
});
test('public buffers and detached DATA observer events cannot modify private baselines',{timeout:60000},t=>{
 const root=fixture(t),original=read(root,'src/lib.rs'),events=[];
 scope(root,()=>{const first=read(root,'src/lib.rs');first.fill(0);scope(root,()=>{const second=read(root,'src/lib.rs');assert.deepEqual(second,original);second.fill(1);});},{observe:event=>{events.push({root:event.root,path:event.path,sourceAuthority:event.sourceAuthority,semanticAuthority:event.semanticAuthority});event.bytes.fill(2);event.identity.fill(0);event.parents.length=0;}});
 assert.ok(events.length>=2);assert.ok(events.every(event=>event.path==='src/lib.rs'&&event.root===root&&!event.sourceAuthority&&!event.semanticAuthority));assert.deepEqual(read(root,'src/lib.rs'),original);
 assert.throws(()=>scope(root,()=>{const value=read(root,'src/lib.rs');value.fill(3);fs.writeFileSync(join(root,'src/lib.rs'),value);}),/changed/);
});
test('caught read failures poison returned success but preserve an actually thrown callback primary',{timeout:60000},t=>{
 const root=fixture(t),nativeRead=fs.readSync,readFailure=Object.freeze({kind:'frozen read failure'}),callbackFrozen=Object.freeze({kind:'frozen callback failure'}),callbackError=new Error('unrelated callback failure');
 for(const callbackPrimary of [false,undefined,null,callbackFrozen,callbackError]){
  let attempts=0;try{fs.readSync=()=>{attempts++;throw readFailure;};exact(()=>scope(root,()=>{exact(()=>read(root,'src/lib.rs'),readFailure);const before=attempts;exact(()=>read(root,'src/lib.rs'),readFailure);assert.equal(attempts,before);throw callbackPrimary;}),callbackPrimary);}finally{fs.readSync=nativeRead;}
 }
 try{fs.readSync=()=>{throw readFailure;};exact(()=>scope(root,()=>{exact(()=>read(root,'src/lib.rs'),readFailure);return false;}),readFailure);}finally{fs.readSync=nativeRead;}
 assert.equal(scope(root,()=>read(root,'src/lib.rs').length)>0,true);
});
test('caught root acquisition failure remains poisoned after root lookup is restored',{timeout:60000},t=>{
 const root=fixture(t),nativeRealpath=fs.realpathSync,primary=Object.freeze({root:'resolution failed'});
 exact(()=>scope(root,()=>{read(root,'src/lib.rs');try{fs.realpathSync=()=>{throw primary;};exact(()=>read(root,'src/lib.rs'),primary);}finally{fs.realpathSync=nativeRealpath;}exact(()=>read(root,'src/lib.rs'),primary);return 5;}),primary);
 assert.ok(scope(root,()=>read(root,'src/lib.rs').length)>0);
});
test('actual temporarily broken/restored root spelling cannot escape the canonical operation',{timeout:60000,skip:process.platform==='win32'},t=>{
 const root=fixture(t),holder=fixture(t),alias=join(holder,'project-alias');fs.symlinkSync(root,alias,'dir');let failure,primary,failed=false;
 try{scope(alias,()=>{read(alias,'src/lib.rs');fs.unlinkSync(alias);try{read(alias,'src/lib.rs');}catch(error){failure=error;}assert.ok(failure);fs.symlinkSync(root,alias,'dir');exact(()=>read(alias,'src/lib.rs'),failure);return 7;});}catch(error){failed=true;primary=error;}
 assert.equal(failed,true);assert.strictEqual(primary,failure);assert.deepEqual(read(alias,'src/lib.rs'),read(root,'src/lib.rs'));
});
test('operation and per-read options use own data descriptors without getters or proxy traps',{timeout:60000},t=>{
 const root=fixture(t);let calls=0;const get=()=>{calls++;throw new Error('getter/trap');};
 const options={get observe(){return get();}},limits={get bytes(){return get();}},readOptions={get maxBytes(){return get();}},proxy=new Proxy({},{ownKeys:get,getOwnPropertyDescriptor:get,getPrototypeOf:get});
 assert.throws(()=>scope(root,()=>0,options),/own operation options/);assert.throws(()=>scope(root,()=>0,proxy),/ordinary/);assert.throws(()=>scope(root,()=>0,{limits}),/without getters/);assert.throws(()=>read(root,'src/lib.rs',readOptions),/without getters/);assert.equal(calls,0);
 assert.throws(()=>scope(root,()=>{assert.throws(()=>read(root,'src/lib.rs',readOptions),/without getters/);return 0;}),/without getters/);assert.equal(calls,0);
});
test('every fd closes after read or initial fstat failure and closing cannot replace falsy/frozen primary',{timeout:60000},t=>{
 const root=fixture(t),nativeRead=fs.readSync,nativeClose=fs.closeSync,nativeStat=fs.fstatSync;
 for(const primary of [false,undefined,Object.freeze({stage:'read'})]){let closed=0;const closing=new Error('secondary close');try{fs.readSync=()=>{throw primary;};fs.closeSync=fd=>{closed++;nativeClose(fd);throw closing;};exact(()=>read(root,'src/lib.rs'),primary);}finally{fs.readSync=nativeRead;fs.closeSync=nativeClose;}assert.equal(closed,1);}
 const primary=Object.freeze({stage:'initial fstat'});let closed=0;try{fs.fstatSync=()=>{throw primary;};fs.closeSync=fd=>{closed++;return nativeClose(fd);};exact(()=>read(root,'src/lib.rs'),primary);}finally{fs.fstatSync=nativeStat;fs.closeSync=nativeClose;}assert.equal(closed,1);
});
test('file growth remains max-plus-one bounded and never invokes readFileSync',{timeout:60000},t=>{
 const root=fixture(t),file=join(root,'src/lib.rs');fs.writeFileSync(file,'1234');const nativeRead=fs.readSync,nativeFile=fs.readFileSync;let bytes=0,calls=0;
 try{fs.readFileSync=()=>{throw new Error('unbounded read forbidden');};fs.readSync=(...args)=>{const count=nativeRead(...args);bytes+=count;if(++calls===1)fs.appendFileSync(file,'5678901234567890');return count;};assert.throws(()=>read(root,'src/lib.rs',{maxBytes:4}),/byte budget/);}finally{fs.readSync=nativeRead;fs.readFileSync=nativeFile;}
 assert.ok(bytes<=5);assert.ok(calls<=2);
});
test('inode values beyond Number precision and sub-millisecond clocks remain distinct',{timeout:60000},t=>{
 const root=fixture(t),file=join(root,'src/lib.rs'),nativeLstat=fs.lstatSync,nativeFstat=fs.fstatSync;
 for(const field of ['ino','mtimeNs'])try{
  fs.lstatSync=(name,...args)=>{const row=nativeLstat(name,...args);if(resolve(name)===file&&field==='ino')row.ino=9007199254740992n;return row;};
  fs.fstatSync=(fd,...args)=>{const row=nativeFstat(fd,...args);if(field==='ino')row.ino=9007199254740993n;else row.mtimeNs+=1n;return row;};
  assert.throws(()=>read(root,'src/lib.rs'),/replaced|changed/);
 }finally{fs.lstatSync=nativeLstat;fs.fstatSync=nativeFstat;}
});
test('POSIX regular-file to FIFO replacement uses nonblocking no-follow open and closes its fd',{timeout:30000,skip:process.platform==='win32'},t=>{
 const root=fixture(t),file=join(root,'src/lib.rs'),nativeOpen=fs.openSync,nativeClose=fs.closeSync;let replaced=false,closed=0;
 try{fs.openSync=(name,flags,...args)=>{if(resolve(name)===file&&!replaced){assert.ok(flags&fs.constants.O_NONBLOCK);assert.ok(flags&fs.constants.O_NOFOLLOW);replaced=true;fs.renameSync(file,file+'.original');execFileSync('mkfifo',[file],{timeout:10000});}return nativeOpen(name,flags,...args);};fs.closeSync=fd=>{closed++;return nativeClose(fd);};assert.throws(()=>read(root,'src/lib.rs'),/changed|replaced/);}finally{fs.openSync=nativeOpen;fs.closeSync=nativeClose;}assert.equal(replaced,true);assert.equal(closed,1);
});
test('symlink ancestor and restored same-name directory replacement remain refused',{timeout:60000},t=>{
 const root=fixture(t),other=fixture(t),source=fs.readFileSync(join(root,'src/lib.rs'));
 fs.renameSync(join(root,'src'),join(root,'original-src'));try{fs.symlinkSync(join(other,'src'),join(root,'src'),process.platform==='win32'?'junction':'dir');}catch(error){if(process.platform==='win32'&&['EPERM','EACCES'].includes(error.code)){t.skip('host link privilege unavailable; Windows reparse qualification remains OPEN');return;}throw error;}
 assert.throws(()=>read(root,'src/lib.rs'),/ancestor/);fs.unlinkSync(join(root,'src'));fs.renameSync(join(root,'original-src'),join(root,'src'));
 assert.throws(()=>scope(root,()=>{read(root,'src/lib.rs');fs.renameSync(join(root,'src'),join(root,'old-src'));fs.mkdirSync(join(root,'src'));fs.writeFileSync(join(root,'src/lib.rs'),source);}),/changed/);
});
test('sparse source closes exact HEAD, skip bit, absence and whole immutable blob',{timeout:60000},t=>{
 const root=fixture(t);git(root,'init','--quiet');git(root,'add','src/lib.rs');git(root,'-c','user.name=Reader fixture','-c','user.email=reader@example.invalid','commit','--quiet','-m','source');const expected=fs.readFileSync(join(root,'src/lib.rs'));
 git(root,'update-index','--skip-worktree','src/lib.rs');fs.unlinkSync(join(root,'src/lib.rs'));assert.deepEqual(scope(root,()=>read(root,'src/lib.rs')),expected);
 assert.throws(()=>scope(root,()=>{read(root,'src/lib.rs');git(root,'update-index','--no-skip-worktree','src/lib.rs');}),/source|changed/);
 assert.throws(()=>read(root,'src/lib.rs'),error=>error.code==='ENOENT');
});
test('observer failure, thenable and recursive reads invalidate the operation without invoking getters',{timeout:60000},t=>{
 const root=fixture(t),primary=Object.freeze({observer:'failed'});exact(()=>scope(root,()=>{exact(()=>read(root,'src/lib.rs'),primary);return 7;},{observe:()=>{throw primary;}}),primary);
 let called=0;const thenable={get then(){called++;throw new Error('getter');}};assert.throws(()=>scope(root,()=>read(root,'src/lib.rs'),{observe:()=>thenable}),/synchronously/);assert.equal(called,0);
 assert.throws(()=>scope(root,()=>read(root,'src/lib.rs'),{observe:()=>read(root,'src/lib.rs')}),/recursive/);
 assert.throws(()=>scope(root,()=>Promise.resolve(3)),/synchronously/);assert.throws(()=>scope(root,()=>0,{observe:async()=>0}),/ordinary/);
});
test('generic operation does not silently impose the optional corpus path count',{timeout:120000},t=>{
 const root=fixture(t),paths=Array.from({length:20004},(_,index)=>'src/empty_'+index+'.rs');for(const name of paths)fs.writeFileSync(join(root,name),'');
 assert.equal(scope(root,()=>{for(const name of paths)assert.equal(read(root,name,{maxBytes:0}).length,0);return paths.length;}),20004);
 assert.throws(()=>scope(root,()=>{for(const name of paths)read(root,name,{maxBytes:0});},{limits:{paths:20003,bytes:0}}),/path bound/);
});
test('aggregate byte buckets apply only when the caller explicitly selects that original domain',{timeout:120000},t=>{
 const root=fixture(t),chunk=Buffer.alloc(4*1024*1024,120),paths=Array.from({length:23},(_,index)=>'src/raw_'+index+'.rs');for(const name of paths)fs.writeFileSync(join(root,name),chunk);
 assert.equal(scope(root,()=>paths.reduce((sum,name)=>sum+read(root,name).length,0)),92*1024*1024);
 assert.throws(()=>scope(root,()=>{for(const name of paths)read(root,name);},{limits:{paths:20003,bytes:88*1024*1024}}),/byte bucket/);
});
test('nesting is finite and operation records expire after both failure and success',{timeout:60000},t=>{
 const root=fixture(t),descend=depth=>scope(root,()=>depth?descend(depth-1):read(root,'src/lib.rs').length);
 assert.ok(descend(8)>0);assert.throws(()=>descend(256),/nesting/);assert.equal(scope(root,()=>read(root,'src/lib.rs').length)>0,true);
});
