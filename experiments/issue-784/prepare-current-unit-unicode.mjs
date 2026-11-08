// Retain complete source equations before installing any generated outputs.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,createGunzip} from 'node:zlib';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {prepareCurrentCoreUnitUnicode} from '../../tools/translation/prepare-current-core-unit-unicode.mjs';
const plan=prepareCurrentCoreUnitUnicode(),hash=value=>createHash('sha256').update(value).digest('hex');
for(const row of plan.files){
 const inputs=plan.layers.flatMap(layer=>[...layer.files,...(layer.originalUnicodePlan?.files??[])]).filter(old=>old.path===row.path).flatMap(old=>[old.before,old.after]);
 if(!inputs.includes(row.current)&&!(row.current===null&&inputs.includes('')))throw Error('Unknown actual complete input '+row.path);
 if(row.current!==null&&readFileSync(row.path,'utf8')!==row.current)throw Error('Actual current input changed '+row.path);
}
const bytes=Buffer.from(JSON.stringify({schema:'current-unit-unicode-complete-proposal-v1',plan,installed:false,semanticAuthority:false})+'\n'),packed=gzipSync(bytes,{level:6,mtime:0});
let readback=0;for await(const chunk of Readable.from([packed]).pipe(createGunzip())){
 if(readback+chunk.length>bytes.length||!chunk.equals(bytes.subarray(readback,readback+chunk.length)))throw Error('Complete retained proposal differs');
 readback+=chunk.length;
}
if(readback!==bytes.length)throw Error('Complete retained proposal is truncated');
writeFileSync('ci-logs/issue-784-restart-2/current-unit-unicode-source-proposal.json.gz',packed,{flag:'wx'});
console.log(JSON.stringify({files:plan.files.map(row=>({path:row.path,before:row.current===null?null:hash(row.current),after:hash(row.after)})),completeProposalBytes:bytes.length,compressedBytes:packed.length,installed:false,semanticAuthority:false}));
