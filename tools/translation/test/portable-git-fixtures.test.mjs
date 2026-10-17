import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {preparePortableGitFixtureProposal,writePortableGitFixtureProposal,readPortableGitFixture,portableGit,PORTABLE_CONCRETE_REVISION,PORTABLE_CONCRETE_SOURCES} from '../prepare-portable-git-fixtures.mjs';
import {materializeConcreteOriginalGit,materializeRegisteredCompilerGit} from './portable-git-fixtures.mjs';
import {prepareIsolatedProjectCompiler} from '../prepare-isolated-project-compiler.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateOriginalProjectBatch} from '../isolated-project-batch.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),ASSETS=fileURLToPath(new URL('./fixtures/portable-git/',import.meta.url)),REGISTRY='tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz';
const packed=fs.readFileSync(join(ROOT,REGISTRY)),raw=gunzipSync(packed),registry=JSON.parse(raw),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function retain(name,value){const output=process.env.ROUTER_PORTABLE_GIT_VECTOR_DIR;if(output){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(join(output,name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'));}}
function temporary(t,label){const path=fs.mkdtempSync(join(tmpdir(),'router-portable-test-'+label+'-'));t.after(()=>fs.rmSync(path,{recursive:true,force:true}));return path;}
function changed(t,mutate){const target=temporary(t,'tamper'),{data,index}=readPortableGitFixture();mutate(data);const bytes=Buffer.from(JSON.stringify(data)+'\n'),compressed=gzipSync(bytes);fs.writeFileSync(join(target,'objects.json.gz'),compressed);fs.writeFileSync(join(target,'manifest.json'),JSON.stringify({...index,bytes:compressed.length,sha256:hash(compressed),rawBytes:bytes.length,rawSha256:hash(bytes)}));return target;}

test('portable actual Git returns all four full original source bodies and independent complete CSTs',{timeout:60000},t=>{
 const fixture=materializeConcreteOriginalGit(t),rows=[];assert.equal(portableGit(fixture.root,['remote']).toString(),'');assert.equal(fs.existsSync(join(fixture.root,'.git/objects/info/alternates')),false);assert.deepEqual(fs.readdirSync(join(fixture.root,'.git/refs')).sort(),['heads','tags']);
 for(const row of PORTABLE_CONCRETE_SOURCES){const bytes=portableGit(fixture.root,['show',PORTABLE_CONCRETE_REVISION+':'+row.path]);assert.equal(hash(bytes),row.sha256);assert.equal(bytes.length,row.bytes);const source=bytes.toString('utf8');assert.deepEqual(Buffer.from(source),bytes);const language=row.path.endsWith('.rs')?'Rust':'JavaScript',cst=transportConcreteSyntaxSource(source,{language});assert.deepEqual(transportConcreteSyntaxMeta(cst.meta),cst);assert.equal(cst.source,source);rows.push({row,bytes:bytes.toString('base64'),source,cst});}
 retain('01-complete-original-source-and-cst',{fixture:fixture.fixture.data,rows});
});

test('genuine compiler source commit tree modes complete blobs and installed TS stay exact',{timeout:60000},t=>{
 const fixture=materializeRegisteredCompilerGit(t,{root:ROOT,registry}),compiler=registry.sources.filter(row=>row.origin==='compiler'),bodies=portableGit(fixture.root,['cat-file','--batch'],compiler.map(row=>row.gitBlob+'\n').join(''));let at=0;const rows=[];
 for(const row of registry.sources){const bytes=fs.readFileSync(join(fixture.root,row.path));assert.equal(hash(bytes),row.sha256);assert.equal(bytes.length,row.bytes);assert.equal(fs.statSync(join(fixture.root,row.path)).mode&0o111? '100755':'100644',row.mode);if(row.origin==='compiler'){const end=bodies.indexOf(10,at);assert.equal(bodies.subarray(at,end).toString('ascii'),row.gitBlob+' blob '+row.bytes);at=end+1;assert.deepEqual(bodies.subarray(at,at+row.bytes),bytes);at+=row.bytes;assert.equal(bodies[at++],10);}rows.push({row,bytes:bytes.toString('base64')});}
 assert.equal(at,bodies.length);assert.equal(registry.sources.filter(row=>row.origin==='typescript').length,132);assert.equal(portableGit(fixture.root,['rev-parse',registry.sourceHead+'^{commit}']).toString().trim(),registry.sourceHead);retain('02-full-compiler-and-ts',{rows,metadata:fixture.fixture.data});
});

test('actual metadata producer is deterministic and full proposal roundtrip preserves installed packet',{timeout:60000},t=>{
 const a=preparePortableGitFixtureProposal({root:ROOT}),b=preparePortableGitFixtureProposal({root:ROOT});assert.deepEqual(a,b);assert.deepEqual(a.trace.map(row=>row.phase),['language','repository']);const parent=temporary(t,'proposal'),output=join(parent,'complete');writePortableGitFixtureProposal(a,output);for(const row of a.files){const bytes=fs.readFileSync(join(output,row.path.split('/').at(-1)));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);}assert.deepEqual(readPortableGitFixture({folder:output}).data,readPortableGitFixture().data);retain('03-complete-producer-and-readback',{a,b,readback:readPortableGitFixture({folder:output}).data});
});

test('forged object type bytes path commit and missing source evidence refuse without authority flags',{timeout:60000},t=>{
 const controls=[data=>{data.objects[0].content='AA==';},data=>{data.objects[0].kind='blob';},data=>{data.objects.push(data.objects[0]);},data=>{data.objects=data.objects.filter(row=>row.id!==data.concrete.rootTree);},data=>{data.concrete.rootTree='0'.repeat(40);},data=>{data.registry.sourceHead='0'.repeat(40);},data=>{data.registry.sources[0].path='../outside';},data=>{data.concrete.sources[0].bytes++;},data=>{data.authority.semantic=true;}];
 for(const [index,mutate]of controls.entries()){const folder=changed(t,mutate);assert.throws(()=>readPortableGitFixture({folder}),TypeError);retain('04-forged-'+index,{data:JSON.parse(gunzipSync(fs.readFileSync(join(folder,'objects.json.gz')))),scope:'Complete packet digests recomputed around forged evidence; actual original identity still refuses.'});}
});

test('genuine unavailable ancestry works without HEAD fallback while a missing selected blob fails',{timeout:60000},t=>{
 const fixture=materializeConcreteOriginalGit(t),commit=fixture.fixture.objects.get(PORTABLE_CONCRETE_REVISION).raw.toString('utf8'),parent=/^parent ([a-f0-9]{40})$/mu.exec(commit)?.[1];assert.ok(parent);assert.throws(()=>portableGit(fixture.root,['cat-file','-e',parent]));assert.throws(()=>portableGit(fixture.root,['rev-parse','--verify','HEAD']));
 const row=PORTABLE_CONCRETE_SOURCES[0],before=portableGit(fixture.root,['show',PORTABLE_CONCRETE_REVISION+':'+row.path]);assert.equal(hash(before),row.sha256);fs.unlinkSync(join(fixture.root,'.git/objects',row.gitBlob.slice(0,2),row.gitBlob.slice(2)));assert.throws(()=>portableGit(fixture.root,['show',PORTABLE_CONCRETE_REVISION+':'+row.path]));retain('05-unavailable-parent-and-selected-blob',{commit,parent,source:before.toString('utf8'),missing:row});
});

test('original isolated producer reconstructs exact registry bootstrap six substitutions and full undo',{timeout:60000},t=>{
 const fixture=materializeRegisteredCompilerGit(t,{root:ROOT,registry}),output=join(temporary(t,'isolated'),'proposal'),proposal=prepareIsolatedProjectCompiler({root:fixture.root,revision:registry.sourceHead,output});assert.deepEqual(fs.readFileSync(join(output,'manifest.json.gz')),packed);assert.deepEqual(fs.readFileSync(join(output,'manifest.json')),raw);assert.equal(proposal.edits.length,6);assert.equal(proposal.completeUndo,true);
 const emitted={};for(const [name,original]of [['isolated-project-driver.mjs','driver-before.mjs'],['isolated-project-batch.mjs','parent-before.mjs']]){let source=fs.readFileSync(join(output,name),'utf8');assert.equal(source,fs.readFileSync(join(ROOT,'tools/translation',name),'utf8'));emitted[name]=source;for(const edit of [...proposal.edits].reverse())if(edit.file===name){assert.equal(source.split(edit.after).length,2);source=source.replace(edit.after,edit.before);}assert.equal(source,fs.readFileSync(join(output,original),'utf8'));}
 const selected=registry.sources.find(row=>row.origin==='compiler'),blob=join(fixture.root,'.git/objects',selected.gitBlob.slice(0,2),selected.gitBlob.slice(2));fs.unlinkSync(blob);const forbidden=join(dirname(output),'missing-source');assert.throws(()=>prepareIsolatedProjectCompiler({root:fixture.root,revision:registry.sourceHead,output:forbidden}));assert.equal(fs.existsSync(forbidden),false);retain('06-full-bootstrap-and-undo',{proposal,emitted,registry,raw:raw.toString('utf8'),missing:selected});
});

test('output aliases existing destinations and changed full TS input refuse before accepted writes',{timeout:60000},t=>{
 const parent=temporary(t,'output'),alias=join(parent,'source-alias');fs.symlinkSync(ROOT,alias,'dir');const data={schema:'portable-original-git-proposal-v1',sourceRoot:ROOT,files:['manifest.json','objects.json.gz','NOTICE.md'].map(name=>{const bytes=fs.readFileSync(join(ASSETS,name));return {path:'tools/translation/test/fixtures/portable-git/'+name,encoding:'base64',content:bytes.toString('base64'),bytes:bytes.length,sha256:hash(bytes)};})};assert.throws(()=>writePortableGitFixtureProposal(data,join(alias,'must-not-create-portable-fixture')),/overlaps/);assert.equal(fs.existsSync(join(ROOT,'must-not-create-portable-fixture')),false);assert.throws(()=>writePortableGitFixtureProposal(data,parent),/fresh output/);
 const fixture=materializeRegisteredCompilerGit(t,{root:ROOT,registry}),row=registry.sources.find(row=>row.origin==='typescript'&&row.path.endsWith('/lib/typescript.js'));assert.ok(row);fs.appendFileSync(join(fixture.root,row.path),'\n// changed complete TS input\n');assert.throws(()=>materializeRegisteredCompilerGit(t,{root:fixture.root,registry}),/full source changed/);assert.throws(()=>materializeRegisteredCompilerGit(t,{root:ROOT,registry:{...registry,sourceHead:'0'.repeat(40)}}),/complete installed registry differs/);retain('07-original-input-and-output-refusals',{data,row,registry});
});

test('original callable still runs through genuine isolated compiler and strict target oracle',{timeout:60000},async()=>{
 const source='pub fn answer()->u8{7}\npub fn enabled()->bool{true}\n',request={schema:'original-project-child-request-v1',sourceFiles:[{path:'src/lib.rs',source}],entries:['src/lib.rs']},result=await translateOriginalProjectBatch(JSON.stringify(request)),text=path=>{const row=result.artifacts.find(row=>row.path===path);assert.ok(row,path);assert.equal(hash(row.text),row.sha256);return row.text;};
 const meta=JSON.parse(text('tools/translation/meta/src/lib.meta.json'));assert.equal(meta.items.map(row=>row.source).join(''),source);assert.equal(meta.concreteSyntaxMeta.source,source);assert.equal(result.receipt.issuerContextEscaped,false);const project={meta:{entry:'src/lib.rs'},javascript:text('packages/javascript/generated/rust-project/src/lib.mjs'),typescript:text('packages/typescript/generated/rust-project/src/lib.ts')};await verifyTypedTargets(project,api=>{assert.equal(api.answer(),7n);assert.equal(api.enabled(),true);},{childTimeoutMs:20000});retain('08-genuine-original-callable',{source,request,result,project});
});
