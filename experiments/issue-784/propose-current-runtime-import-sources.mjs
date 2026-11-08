import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareRuntimeImportCurrentSources} from '../../tools/translation/prepare-runtime-import-current-sources.mjs';
const plan=prepareRuntimeImportCurrentSources(),path='ci-logs/issue-784-restart-2/current-runtime-import-composition-proposal.json.gz';
const raw=Buffer.from(JSON.stringify(plan));assert.ok(raw.length<32*1024*1024);
const packed=gzipSync(raw);writeFileSync(path,packed,{flag:'wx'});assert.ok(gunzipSync(readFileSync(path)).equals(raw));
console.log(JSON.stringify({path,files:plan.files.map(row=>({path:row.path,beforeBytes:Buffer.byteLength(row.before),afterBytes:Buffer.byteLength(row.after),inverse:row.equation.inverse===row.before})),bytes:packed.length,installed:false}));
