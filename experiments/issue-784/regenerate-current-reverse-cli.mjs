// Review the complete actual producer output before installing one cursor fix.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {proposeBunReverseShard} from '../../scripts/prepare-bun-reverse-shard.mjs';
const proposal=proposeBunReverseShard(),current=readFileSync(proposal.path,'utf8');
const before='for(let index=0;index<args.length;index++){const flag=args[index],value=args[++index];';
const after='for(let argumentIndex=0;argumentIndex<args.length;argumentIndex++){const flag=args[argumentIndex],value=args[++argumentIndex];';
assert.equal(current.split(before).length,2);assert.equal(current.replace(before,()=>after),proposal.after);
assert.equal(proposal.inverse,proposal.before);assert.deepEqual(proposal.stages.map(row=>row.phase),['language','repository']);
const path='ci-logs/issue-784-restart-2/current-reverse-cli-generated-proposal.json.gz';
const raw=Buffer.from(JSON.stringify({proposal,current,completeSourceReviewed:true,sourceInstalled:true,receivingQualified:false}));
writeFileSync(path,gzipSync(raw),{flag:'wx'});assert.ok(gunzipSync(readFileSync(path)).equals(raw));
assert.equal(readFileSync(proposal.path,'utf8'),current);writeFileSync(proposal.path,proposal.after);
console.log(JSON.stringify({path,generated:proposal.path,completeInverse:true}));
