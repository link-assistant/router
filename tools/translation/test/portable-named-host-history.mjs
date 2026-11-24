// Test-only complete original Git bytes. No compiler or source-owner authority.
import fs from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {portableGit,portableTreeEntries} from '../prepare-portable-git-fixtures.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
export const NAMED_HOST_ORIGINAL_REVISION='077889e3fb2ad2d4f3a96c756bf6087ef17678b1';
export const NAMED_HOST_ORIGINAL_PATHS=Object.freeze(['tools/translation/host-assets.mjs','tools/translation/js-to-rust/owned-core-source.mjs']);
const folder=new URL('./fixtures/portable-named-host/',import.meta.url),archiveSha256='2555cc68b267efdcbc0f45eaf9a2ed9ffcd492bec5d5c6baf7374e1ab2a96cd7';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitId=(kind,raw)=>createHash('sha1').update(kind+' '+raw.length+'\0').update(raw).digest('hex');
const fail=message=>{throw new TypeError('Portable named host original Git: '+message);};
function object(root,id,kind){
 if(!/^[a-f0-9]{40}$/.test(id)||!['commit','tree','blob'].includes(kind))fail('closed original object request required');
 const bytes=portableGit(root,['cat-file','--batch'],id+'\n'),end=bytes.indexOf(10),parts=bytes.subarray(0,end).toString('ascii').split(' '),size=Number(parts[2]);
 if(end<0||parts.length!==3||parts[0]!==id||parts[1]!==kind||!Number.isSafeInteger(size)||size<0||size>2097152||bytes.length!==end+1+size+1||bytes.at(-1)!==10)fail('complete actual Git object header required');
 const raw=bytes.subarray(end+1,end+1+size);if(gitId(kind,raw)!==id)fail('actual Git object identity differs');
 return {id,kind,bytes:size,sha256:hash(raw),content:raw.toString('base64')};
}
function capture(root){
 const stored=new Map(),put=(id,kind)=>{if(!stored.has(id))stored.set(id,object(root,id,kind));if(stored.size>32||[...stored.values()].reduce((n,row)=>n+row.bytes,0)>2097152)fail('complete original object bound');return stored.get(id);};
 const commit=put(NAMED_HOST_ORIGINAL_REVISION,'commit'),tree=/^tree ([a-f0-9]{40})$/mu.exec(Buffer.from(commit.content,'base64').toString('utf8'))?.[1];if(!tree)fail('one complete original commit root required');
 const files=[];
 for(const path of NAMED_HOST_ORIGINAL_PATHS){
  let id=tree,mode=null;const parts=path.split('/');
  for(let at=0;at<parts.length;at++){
   const row=put(id,'tree'),entries=portableTreeEntries(Buffer.from(row.content,'base64')),found=entries.filter(row=>row.name===parts[at]);
   // Native Git checks this complete auxiliary blob while accepting a tree.
   // Carry its actual bytes instead of disabling that native fsck check.
   for(const attribute of entries.filter(row=>row.name==='.gitattributes')){if(!['100644','100755'].includes(attribute.mode))fail('regular original attributes blob required');put(attribute.id,'blob');}
   if(found.length!==1)fail('one complete original tree route required');id=found[0].id;mode=found[0].mode;
   if(at<parts.length-1&&mode!=='40000')fail('original route requires native directory entries');
  }
  if(!['100644','100755'].includes(mode))fail('complete regular source blob required');
  const row=put(id,'blob'),raw=Buffer.from(row.content,'base64'),source=raw.toString('utf8');if(!Buffer.from(source).equals(raw))fail('complete UTF8 original required');
  const meta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(meta).source!==source)fail('complete original CST differs');
  files.push({path,mode,gitBlob:id,bytes:row.bytes,sha256:row.sha256,meta});
 }
 return {schema:'portable-named-host-original-git-v1',revision:NAMED_HOST_ORIGINAL_REVISION,files,objects:[...stored.values()].sort((a,b)=>a.id.localeCompare(b.id)),parentAncestryRequired:false,sourceAuthority:false,runtimeParity:false,rustExecuted:false};
}
export function captureNamedHostOriginalGit({root}){
 return createRulePipeline([
  {phase:'language',rules:[{id:'git:retain-complete-native-commit-tree-blob-and-source-CST',apply:()=>capture(root)}]},
  {phase:'repository',rules:[{id:'router:select-two-genuine-named-host-history-sources',apply:value=>{if(JSON.stringify(value.files.map(row=>row.path))!==JSON.stringify(NAMED_HOST_ORIGINAL_PATHS))fail('complete selected source census differs');return value;}}]},
 ]).run(null);
}
export function readNamedHostOriginalGit(){
 const packed=fs.readFileSync(new URL('objects.json.gz',folder)),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',folder),'utf8'));
 if(hash(packed)!==archiveSha256||manifest.sha256!==archiveSha256||manifest.archive!=='objects.json.gz'||manifest.bytes!==packed.length)fail('complete pinned original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:8388608});if(raw.length!==manifest.rawBytes||hash(raw)!==manifest.rawSha256)fail('complete raw original archive differs');
 const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('complete strict UTF8 archive required');const data=JSON.parse(text);
 if(data.schema!=='portable-named-host-original-git-v1'||data.revision!==NAMED_HOST_ORIGINAL_REVISION||JSON.stringify(data.files.map(row=>row.path))!==JSON.stringify(NAMED_HOST_ORIGINAL_PATHS)||data.objects.length>32||data.objects.length<1)fail('complete fixed original domain differs');
 const objects=new Map();let bytes=0;
 for(const row of data.objects){const raw=Buffer.from(row.content,'base64');if(raw.toString('base64')!==row.content||objects.has(row.id)||!['commit','tree','blob'].includes(row.kind)||gitId(row.kind,raw)!==row.id||raw.length!==row.bytes||hash(raw)!==row.sha256||(bytes+=raw.length)>2097152)fail('complete unique original Git object differs');objects.set(row.id,{...row,raw});}
 if(objects.get(NAMED_HOST_ORIGINAL_REVISION)?.kind!=='commit')fail('actual original commit absent');
 for(const row of data.files){const blob=objects.get(row.gitBlob);if(blob?.kind!=='blob'||blob.bytes!==row.bytes||blob.sha256!==row.sha256||transportConcreteSyntaxMeta(row.meta).source!==blob.raw.toString('utf8'))fail('complete original source/CST differs');}
 return {data,objects,manifest};
}
export function materializeNamedHostOriginalGit(t){
 const fixture=readNamedHostOriginalGit(),root=fs.mkdtempSync(join(tmpdir(),'router-named-host-original-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 portableGit(root,['init','--quiet','--template=']);const inputs=join(root,'.git/router-original-object-inputs');fs.mkdirSync(inputs);
 for(const row of fixture.objects.values())fs.writeFileSync(join(inputs,row.id),row.raw,{flag:'wx',mode:0o600});
 for(const kind of ['blob','tree','commit']){
  const selected=[...fixture.objects.values()].filter(row=>row.kind===kind);if(!selected.length)continue;
  const ids=portableGit(root,['hash-object','-w','-t',kind,'--stdin-paths','--no-filters'],selected.map(row=>'.git/router-original-object-inputs/'+row.id+'\n').join('')).toString('ascii').trimEnd().split('\n');if(JSON.stringify(ids)!==JSON.stringify(selected.map(row=>row.id)))fail('complete native Git object identity differs');
 }
 fs.rmSync(inputs,{recursive:true,force:false});
 const reproduced=captureNamedHostOriginalGit({root});if(JSON.stringify(reproduced.value)!==JSON.stringify(fixture.data))fail('native full commit tree paths bodies and CSTs differ');
 return {root,revision:NAMED_HOST_ORIGINAL_REVISION};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));if(args.length!==2||args[0]!=='--emit')fail('Usage: portable-named-host-history.mjs --emit FRESH_OUTSIDE_DIRECTORY');
 const output=resolve(args[1]);if(!relative(root,output).startsWith('..'+sep)||!relative(output,root).startsWith('..'+sep))fail('fresh outside proposal directory required');
 const result=captureNamedHostOriginalGit({root}),raw=Buffer.from(JSON.stringify(result.value)+'\n');if(raw.length>8388608)fail('complete output bound');const packed=gzipSync(raw,{level:9});
 const manifest={schema:result.value.schema,revision:result.value.revision,archive:'objects.json.gz',bytes:packed.length,sha256:hash(packed),rawBytes:raw.length,rawSha256:hash(raw),trace:result.trace,files:result.value.files.map(({meta,...row})=>row),objects:result.value.objects.length,runtimeParity:false,rustExecuted:false};
 fs.mkdirSync(output);fs.writeFileSync(join(output,'objects.json.gz'),packed,{flag:'wx'});fs.writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});fs.writeFileSync(join(output,'NOTICE.md'),'# Original named host Git source fixture\n\nComplete genuine commit, selected tree and source blob bytes from '+NAMED_HOST_ORIGINAL_REVISION+'. Router retains its original repository license. Parent ancestry and unrelated blobs are intentionally absent. These bytes supply no compiler, source-owner or runtime authority.\n',{flag:'wx'});
 if(!gunzipSync(fs.readFileSync(join(output,'objects.json.gz'))).equals(raw))fail('complete archive readback failed');console.log(JSON.stringify({output,objects:manifest.objects,files:manifest.files.length,bytes:packed.length,sha256:manifest.sha256,installed:false,qualified:false}));
}
