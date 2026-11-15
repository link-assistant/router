// Finite source diagnostic. No production source or generated output is written.
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {prepareSelectedGitCensus} from '../../tools/translation/prepare-selected-git-census.mjs';
import {prepareStaticSourceRelease} from '../../tools/translation/prepare-static-source-release.mjs';
const root=resolve('.'),out='ci-logs/issue-784-restart-2/current-selected-census-history';
const archive=JSON.parse(gunzipSync(readFileSync('tools/translation/source-profiles/selected-git-census/complete-originals.json.gz')));
const stage=mkdtempSync(join(tmpdir(),'router-census-history-probe-'));
try{
 for(const row of archive.rows){const path=join(stage,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source);}
 for(const path of ['tools/translation/source-profiles/selected-git-census/complete-originals.json.gz','tools/translation/prepare-selected-git-census.mjs','tools/translation/selected-git-size-records.mjs']){
  const target=join(stage,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(path));
 }
 const plan=prepareSelectedGitCensus({root:stage});
 for(const [at,row]of plan.files.entries()){
  writeFileSync(out+'-'+at+'-after.mjs',row.after,{flag:'wx'});
  writeFileSync(out+'-'+at+'-current.mjs',readFileSync(join(root,row.path)),{flag:'wx'});
  console.log(JSON.stringify({at,path:row.path,beforeBytes:Buffer.byteLength(row.before),afterBytes:Buffer.byteLength(row.after),currentBytes:readFileSync(row.path).length}));
 }
 const release=prepareStaticSourceRelease({root}),row=release.files[0];
 writeFileSync(out+'-release-original.mjs',row.original,{flag:'wx'});
 console.log(JSON.stringify({releaseMatchesCurrent:row.after===row.before,originalBytes:Buffer.byteLength(row.original),afterBytes:Buffer.byteLength(row.after)}));
}finally{rmSync(stage,{recursive:true,force:true});}
