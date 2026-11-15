// Bounded payload diagnostic using every complete retained CLI artifact.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createPrivateOutputTextRetention} from '../../tools/translation/private-output-text.mjs';
const [output]=process.argv.slice(2);if(!output)throw TypeError('use FRESH_GZIP');
const path='docs/case-studies/issue-784/evidence/native-retention-history/current-native-retention-cli-matrix-trace.json.gz';
const packed=readFileSync(path),hash=raw=>createHash('sha256').update(raw).digest('hex');
if(hash(packed)!=='8b49611a5f2d8ab5453cac63b850a5fd722cab086f4ce575eca43c3bcf2b3217')throw Error('complete original fixture archive differs');
const raw=gunzipSync(packed,{maxOutputLength:64*1024*1024}),fixture=JSON.parse(raw),storage=createPrivateOutputTextRetention();
if(fixture.completeArtifacts.length>4096)throw RangeError('complete artifact count bound');
let bytes=0;const values=fixture.completeArtifacts.map(row=>{const data=Buffer.from(row.base64,'base64'),text=data.toString('utf8');if(!Buffer.from(text).equals(data)||data.length>8*1024*1024||(bytes+=data.length)>32*1024*1024)throw RangeError('complete original UTF8 payload bounds');return {path:row.path,text,bytes:data.length,sha256:hash(data)};});
const started=performance.now(),cells=values.map(row=>storage.retain(row.text)),retainedMilliseconds=performance.now()-started,restoredMilliseconds=[];
for(let pass=0;pass<3;pass++){const start=performance.now();for(let at=0;at<values.length;at++)if(storage.restore(cells[at])!==values[at].text)throw Error('complete original artifact changed');restoredMilliseconds.push(performance.now()-start);}
const observations=values.map((row,at)=>({path:row.path,bytes:row.bytes,sha256:row.sha256,observation:storage.observation(cells[at])}));
const packet={schema:'bounded-original-retention-payload-probe-v1',node:process.version,source:readFileSync('tools/translation/private-output-text.mjs','utf8'),fixture:{path,bytes:packed.length,sha256:hash(packed),decodedBytes:raw.length,decodedSha256:hash(raw)},completePayloads:values.length,completeBytes:bytes,retainedMilliseconds,restoredMilliseconds,observations,allFullPayloadsRestoredExactly:true,controlledComparativeBenchmark:false,performanceQualified:false};
const encoded=Buffer.from(JSON.stringify(packet)+'\n');writeFileSync(output,gzipSync(encoded),{flag:'wx'});if(!gunzipSync(readFileSync(output)).equals(encoded))throw Error('complete diagnostic readback differs');
console.log(JSON.stringify({output,bytes:readFileSync(output).length,sha256:hash(readFileSync(output)),completePayloads:values.length,completeBytes:bytes,retainedMilliseconds,restoredMilliseconds,performanceQualified:false}));
