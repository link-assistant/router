// Retain complete generated source equations before reviewing installation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareRuntimeImportCurrentSources} from '../../tools/translation/prepare-runtime-import-current-sources.mjs';
import {prepareRuntimeLoaderComparison} from '../../tools/translation/prepare-runtime-loader-comparison.mjs';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const base='ci-logs/issue-784-restart-2/'+label;assert.ok(!existsSync(base+'-summary.json'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const started=performance.now(),plan=prepareRuntimeImportCurrentSources(),rows=[];
plan.files.push(prepareRuntimeLoaderComparison());
for(const [at,row]of plan.files.entries()){
 const raw=Buffer.from(JSON.stringify(row)),output=base+'-'+at+'.json.gz';
 assert.ok(raw.length<64*1024*1024);assert.ok(!existsSync(output));
 writeFileSync(output,gzipSync(raw));assert.deepEqual(gunzipSync(readFileSync(output)),raw);
 assert.equal(readFileSync(row.path,'utf8'),row.current);
 rows.push({path:row.path,output,bytes:raw.length,sha256:hash(raw),beforeSha256:hash(row.before),afterSha256:hash(row.after),currentEqualsAfter:row.current===row.after});
}
const inputs=['tools/translation/prepare-runtime-import-current-sources.mjs','tools/translation/prepare-runtime-loader-comparison.mjs','tools/translation/source-profiles/runtime-loader-comparison/original.mjs.gz','experiments/issue-784/prepare-loader-comparison-batch.mjs'].map(path=>({path,sha256:hash(readFileSync(path))}));
writeFileSync(base+'-summary.json',JSON.stringify({rows,inputs,elapsedMilliseconds:performance.now()-started,typescriptVersion:plan.typescriptVersion,installed:false,semanticAuthority:false},null,2),{flag:'wx'});
console.log(JSON.stringify({rows,elapsedMilliseconds:performance.now()-started,installed:false}));
