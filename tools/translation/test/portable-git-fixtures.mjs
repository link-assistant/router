// Test-only materialization of genuine raw Git objects. Parent ancestry may be
// missing; selected commit/tree/blob bytes are never invented or substituted.
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {portableGit,readPortableGitFixture,PORTABLE_CONCRETE_REVISION} from '../prepare-portable-git-fixtures.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new TypeError('Portable original Git fixture: '+message);};
function temporary(t,label){const root=fs.mkdtempSync(join(tmpdir(),'router-portable-'+label+'-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function put(root,path,bytes,mode=0o644){const target=join(root,path);fs.mkdirSync(dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx',mode});}
function originalObjects(root,fixture){portableGit(root,['init','--quiet','--template=']);for(const row of fixture.objects.values()){const id=portableGit(root,['hash-object','-w','-t',row.kind,'--stdin'],row.raw).toString('ascii').trim();if(id!==row.id)fail('stock Git object identity differs');}for(const profile of [fixture.data.concrete,fixture.data.compiler])if(portableGit(root,['rev-parse','--verify',profile.commit+'^{commit}']).toString('ascii').trim()!==profile.commit)fail('genuine original commit unavailable');}
export function materializeConcreteOriginalGit(t,{folder}={}){const fixture=readPortableGitFixture({folder}),root=temporary(t,'concrete');originalObjects(root,fixture);return {root,revision:PORTABLE_CONCRETE_REVISION,fixture};}
export function materializeRegisteredCompilerGit(t,{root,registry,folder}){
 const fixture=readPortableGitFixture({folder}),packed=fs.readFileSync(join(root,'tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz')),actual=JSON.parse(gunzipSync(packed).toString('utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(registry)||JSON.stringify(actual)!==JSON.stringify(fixture.data.registry))fail('actual complete installed registry differs');const captured=[],ts=fs.realpathSync(join(root,'packages/javascript/node_modules/typescript'));
 for(const row of registry.sources){const source=row.origin==='typescript'?join(ts,row.path.slice('packages/javascript/node_modules/typescript/'.length)):join(root,row.path),stat=fs.lstatSync(source);if(!stat.isFile()||stat.isSymbolicLink())fail('ordinary full source file required');const bytes=fs.readFileSync(source);if(bytes.length!==row.bytes||hash(bytes)!==row.sha256||(stat.mode&0o111?'100755':'100644')!==row.mode)fail('actual original full source changed');captured.push({row,bytes});}
 const target=temporary(t,'compiler');originalObjects(target,fixture);for(const {row,bytes}of captured)put(target,row.path,bytes,row.mode==='100755'?0o755:0o644);
 const rows=registry.sources.filter(row=>row.origin==='compiler'),ids=portableGit(target,['hash-object','-w','--stdin-paths','--no-filters'],rows.map(row=>row.path).join('\n')+'\n').toString('ascii').trim().split('\n');if(JSON.stringify(ids)!==JSON.stringify(rows.map(row=>row.gitBlob)))fail('complete original compiler blob differs');portableGit(target,['update-index','-z','--index-info'],rows.map(row=>`${row.mode} ${row.gitBlob}\t${row.path}\0`).join(''));
 put(target,'tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz',packed);
 for(const name of ['isolated-project-batch.mjs','isolated-project-driver.mjs'])put(target,'tools/translation/'+name,fs.readFileSync(join(root,'tools/translation',name)));
 return {root:target,registry:actual,fixture,selected:rows.map(row=>({path:row.path,mode:row.mode,gitBlob:row.gitBlob}))};
}
