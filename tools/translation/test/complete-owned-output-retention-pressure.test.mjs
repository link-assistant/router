import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

test('complete owned storage retention and live output census preserve every original byte under heap pressure',{timeout:60000},t=>{
 const temporary=mkdtempSync(join(tmpdir(),'router-complete-retention-pressure-'));t.after(()=>rmSync(temporary,{recursive:true,force:true}));
 const fixture=fileURLToPath(new URL('./fixtures/complete-owned-output-retention-pressure.mjs',import.meta.url));
 const stdout=execFileSync('node',['--max-old-space-size=1792',fixture],{encoding:'utf8',timeout:55000,maxBuffer:4*1024*1024,env:{...process.env,TMPDIR:temporary,TMP:temporary,TEMP:temporary}});
 const rows=stdout.trim().split('\n').map(line=>JSON.parse(line)),reference=rows.find(row=>row.mode==='reference'&&row.outputs),pressure=rows.find(row=>row.mode==='pressure'&&row.outputs),entry=rows.find(row=>row.mode==='pressure'&&row.phase==='retained-live-heap-pressure');
 assert.ok(reference&&pressure&&entry);const census=rows.find(row=>row.mode==='pressure'&&row.phase==='retained-output-census');assert.ok(census);assert.equal(census.expectedBytes,pressure.outputs.reduce((sum,row)=>sum+row.bytes,0));assert.ok(entry.memory.heapUsed>=1640*1024*1024);
 assert.deepEqual(pressure.inputs,reference.inputs);assert.deepEqual(pressure.outputs,reference.outputs);assert.deepEqual(pressure.targets,reference.targets);
 const decoded=rows.filter(row=>row.phase==='complete-decoded-concrete-syntax');assert.ok(decoded.length===0||decoded.length===2);if(decoded.length)assert.equal(decoded[0].sha256,decoded[1].sha256);
 assert.equal(pressure.originalBoundsUnchanged,true);assert.equal(pressure.wholeRetainedDataset,true);assert.equal(pressure.fullCompilerQualified,false);assert.equal(pressure.rustExecuted,false);
 // The child independently compares every complete byte before emitting these
 // receipts; this summary neither grants source authority nor substitutes hashes.
 console.log(JSON.stringify({reference,pressure,liveHeapBytes:entry.memory.heapUsed,decodedConcrete:decoded,heapLimitMiB:1792,fullCompilerQualified:false,rustExecuted:false}));
});
