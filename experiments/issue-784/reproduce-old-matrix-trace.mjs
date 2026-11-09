// Run the entire new regression file against the genuine predecessor worker.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';assert.equal(existsSync(output),false);
const root=mkdtempSync(resolve('experiments/issue-784/old-matrix-trace-'));
const worker=join(root,'old-worker.mjs'),test=join(root,'original-regression.test.mjs');
const previous=execFileSync('git',['show','37147a95ce5fb1efeced23b2ba49dcd036a53a8a:tools/translation/isolated-matrix-profile.mjs'],{encoding:'utf8',maxBuffer:1024*1024});
const regression=readFileSync('tools/translation/test/isolated-matrix-trace.test.mjs','utf8');
const base=pathToFileURL(resolve('tools/translation')+'/').href;
const workerRules=[
  ["from './compilation-matrix.mjs'",'from '+JSON.stringify(base+'compilation-matrix.mjs')],
  ["from './source-corpus.mjs'",'from '+JSON.stringify(base+'source-corpus.mjs')],
  ["await import('./'+request.plannerModule)",'await import('+JSON.stringify(base)+'+request.plannerModule)'],
];
const testRules=[
  ["from '../compilation-matrix.mjs'",'from '+JSON.stringify(base+'compilation-matrix.mjs')],
  ["from '../source-corpus.mjs'",'from '+JSON.stringify(base+'source-corpus.mjs')],
  ["fileURLToPath(new URL('../isolated-matrix-profile.mjs',import.meta.url))",JSON.stringify(worker)],
];
function relocate(source,rules){
  let after=source;
  for(const [before,replacement]of rules){assert.equal(after.split(before).length,2);after=after.replace(before,replacement);}
  let inverse=after;for(const [before,replacement]of [...rules].reverse())inverse=inverse.replace(replacement,before);
  assert.equal(inverse,source);return {source,after,rules,inverse};
}
const workerCopy=relocate(previous,workerRules),testCopy=relocate(regression,testRules);
let child;
try{
  writeFileSync(worker,workerCopy.after);writeFileSync(test,testCopy.after);
  assert.equal(readFileSync(worker,'utf8'),workerCopy.after);assert.equal(readFileSync(test,'utf8'),testCopy.after);
  child=spawnSync(process.execPath,['scripts/run-node-tests.mjs','--outer-timeout-ms=180000',test],{encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=192'}});
  const document={schema:'old-matrix-trace-regression-v1',predecessor:'37147a95ce5fb1efeced23b2ba49dcd036a53a8a',workerCopy,testCopy,
    status:child.status,signal:child.signal,error:child.error?String(child.error):null,stdout:child.stdout,stderr:child.stderr,
    productionSourcesChanged:false,originalTestAssertionsAndDeadlinesChanged:false};
  const raw=Buffer.from(JSON.stringify(document));writeFileSync(output,gzipSync(raw),{flag:'wx'});
  assert.deepEqual(gunzipSync(readFileSync(output)),raw);
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status,1);
  assert.match(child.stdout,/not ok 1 - matrix diagnostics arrive before actual worker exit/);
  assert.match(child.stdout,/false !== true/);
  assert.match(child.stdout,/# tests 2\n/);
  console.log(JSON.stringify({output,sha256:createHash('sha256').update(raw).digest('hex'),regressionExit:child.status,expectedPredecessorFailure:true}));
}finally{rmSync(root,{recursive:true,force:true});}
