// Read-only census of a complete-source gzip profile: for every row, does the
// expected version equal the current working tree, and did it equal <ref>?
// Usage: node archive-profile-census.mjs <archive.json.gz> [ref]
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const [archive,ref='4f812e5ea^1']=process.argv.slice(2);
const profile=JSON.parse(gunzipSync(readFileSync(archive)).toString('utf8'));
const at=(path)=>{try{return execFileSync('git',['show',`${ref}:${path}`],{maxBuffer:1<<28,stdio:['ignore','pipe','ignore']}).toString('utf8');}catch{return null;}};
const rows=[...(profile.rows??[]),...(profile.additions??[]),...(profile.resources??[])];
let drift=0;
for(const row of rows){
  for(const [label,index] of Object.hasOwn(row,'version')?[['version',row.version]]:[['before',row.physicalBeforeVersion],['after',row.afterVersion]]){
    const expected=profile.sources[index];
    const now=existsSync(row.path)?readFileSync(row.path,'utf8'):null;
    const old=at(row.path);
    const state=`${now===expected?'now=':'now≠'} ${old===expected?'ref=':'ref≠'}`;
    if(now!==expected)drift++;
    console.log(`${state} ${label} ${row.path}`);
  }
}
console.log(`${rows.length} rows, ${drift} version checks differ from the working tree`);
