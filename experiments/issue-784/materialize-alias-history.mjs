// Preserve the complete producer proposal before installing its exact output.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareCompilerAliasHistory} from '../../tools/translation/prepare-compiler-alias-history.mjs';
import {COMPILER_ALIAS_ORIGINAL_CURRENT_PINS} from '../../tools/translation/compiler-alias-source-evolution.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const path='ci-logs/issue-784-restart-2/alias-history-proposal.json.gz';
const hash=value=>createHash('sha256').update(value).digest('hex');
const [mode,...rest]=process.argv.slice(2);assert.equal(rest.length,0);assert.ok(['--propose','--install'].includes(mode));
if(mode==='--propose'){
 const plan=prepareCompilerAliasHistory(),raw=Buffer.from(JSON.stringify(plan)+'\n'),packed=gzipSync(raw);
 assert.deepEqual(gunzipSync(packed),raw);writeFileSync(path,packed,{flag:'wx'});
 console.log(JSON.stringify({path,bytes:raw.length,compressedBytes:packed.length,sha256:hash(packed),files:plan.files.map(row=>row.path),sourceAuthority:false}));
}else{
 const plan=JSON.parse(gunzipSync(readFileSync(path)));
 assert.equal(plan.files.length,1);assert.equal(plan.files[0].path,'tools/translation/test/fixtures/compiler-data-alias-history.mjs');assert.equal(plan.records.length,6);
 for(const row of plan.records){assert.equal(row.currentSha256,COMPILER_ALIAS_ORIGINAL_CURRENT_PINS[row.name]);assert.equal(hash(row.completeCurrent),row.currentSha256);assert.equal(hash(row.completeHistorical),row.historicalSha256);assert.equal(readFileSync(row.path,'utf8'),row.completePhysical);}
 for(const row of plan.files){assert.equal(readFileSync(row.path,'utf8'),row.before);assert.equal(row.before.split('\n').find(line=>line.startsWith('const RECORDS=')),row.after.split('\n').find(line=>line.startsWith('const RECORDS=')),'every complete original history record remains byte exact');assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);}
 for(const row of plan.files)writeFileSync(row.path,row.after);
 console.log(JSON.stringify({files:plan.files.map(row=>row.path),allSixCurrentPinsPreserved:true,completeProposalRetained:path,runtimeAuthority:false}));
}
