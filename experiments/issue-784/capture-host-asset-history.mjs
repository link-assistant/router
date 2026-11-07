// Capture the actual ASCII host declaration equation as test DATA only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {prepareCoreAsciiSources} from '../../tools/translation/prepare-core-ascii-sources.mjs';
const path='tools/translation/host-assets.mjs',hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(process.argv.length,3,'one fresh output path required');
const sourceHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),plan=prepareCoreAsciiSources();
const rows=plan.files.filter(row=>row.path===path);assert.equal(rows.length,1);const row=rows[0];
assert.equal(row.after,readFileSync(path,'utf8'));assert.equal(row.inverse,row.before);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead);
const raw=Buffer.from(JSON.stringify({schema:'host-asset-complete-source-history-v1',sourceHead,path,layers:[{schema:plan.schema,row}],semanticAuthority:false})+'\n');
assert.ok(raw.length<8*1024*1024);const packed=gzipSync(raw,{level:9});writeFileSync(process.argv[2],packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(process.argv[2])),raw);
console.log(JSON.stringify({sourceHead,beforeSha256:hash(row.before),afterSha256:hash(row.after),rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed),installed:false,semanticAuthority:false}));
