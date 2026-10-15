// Test discovery only: retain the pinned historical census and include every
// current tracked Rust path. This does not issue a source or body capability.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const bytes=readFileSync(new URL('../fixtures/static-source-performance/original-rust-inputs.json',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'dd3d5e25091c74e980a5529f33a6d5b311264e32769efce669a0e3efd6a1bff4');
const inventory=JSON.parse(bytes),historical=inventory.rustSources.map(row=>row.path);
assert.equal(inventory.originalCommit,'688bf9b9a1257a1dc58c758b50b6906ecc4eee63');
assert.equal(inventory.originalRustFiles,804);assert.equal(historical.length,804);assert.equal(new Set(historical).size,804);
export function assertOriginalRustCensus(paths){
 assert.ok(Array.isArray(paths)&&paths.length>=804&&paths.length<=20000,'bounded complete current Rust census');
 const seen=new Set();
 for(const path of paths){assert.ok(typeof path==='string'&&path.endsWith('.rs')&&!/[\\:\u0000-\u001f\u007f]/u.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'safe current Rust path');assert.ok(!seen.has(path),'duplicate current Rust path');seen.add(path);}
 for(const path of historical)assert.ok(seen.has(path),'historical original Rust path missing: '+path);
 return paths;
}
export function currentOriginalRustPaths(root){
 const output=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});
 return assertOriginalRustCensus(output.split('\0').filter(Boolean));
}
