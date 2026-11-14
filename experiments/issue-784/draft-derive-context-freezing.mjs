// Complete reversible source draft; performance and semantic qualification stay separate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const paths=['tools/translation/derive-bang-context.mjs','tools/translation/derive-enclosing-namespace-context.mjs'];
const rows=[];
for(const path of paths){
 const before=readFileSync(path,'utf8');
 assert.equal(before,execFileSync('git',['show',head+':'+path],{encoding:'utf8',maxBuffer:262144}));
 const importBefore="import {createHash} from 'node:crypto';";
 const edits=[
  [importBefore,importBefore+"\nimport {createCompletedDataFreezer} from './private-data-freeze.mjs';"],
  ["const id=(module,span)=>",'const freezeCompleted=createCompletedDataFreezer(freeze);\nconst id=(module,span)=>'],
  ['const certificate=freeze({...evidence,digest', 'const certificate=freezeCompleted({...evidence,digest'],
  ['const context=freeze({...evidence,digest', 'const context=freezeCompleted({...evidence,digest'],
 ];
 let after=before;
 for(const [from,to]of edits){assert.equal(after.split(from).length,2,path+': '+from);after=after.replace(from,()=>to);}
 let inverse=after;for(const [from,to]of [...edits].reverse()){assert.equal(inverse.split(to).length,2);inverse=inverse.replace(to,()=>from);}assert.equal(inverse,before);
 rows.push({path,before,after,edits,inverse});
}
const hash=source=>createHash('sha256').update(source).digest('hex');
const helperPath='tools/translation/private-data-freeze.mjs',helper=readFileSync(helperPath,'utf8');
const record={schema:'complete-derive-context-freezing-draft-v1',head,rows:rows.map(row=>({...row,beforeSha256:hash(row.before),afterSha256:hash(row.after)})),helper:{path:helperPath,source:helper,sha256:hash(helper)},deadlinesChanged:false,semanticAuthority:false,performanceQualified:false};
const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/derive-context-freezing-draft.json',Buffer.from(JSON.stringify(record)));
for(const row of rows)writeFileSync(row.path,row.after);
console.log(JSON.stringify({output,changed:rows.map(row=>row.path)}));
