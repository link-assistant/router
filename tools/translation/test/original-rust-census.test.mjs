import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {currentOriginalRustPaths,assertOriginalRustCensus} from './original-rust-census.mjs';
import {repositoryCratePaths} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url);
test('current original Rust discovery includes every tracked path while retaining the pinned historical census',()=>{
 const physical=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean),expected=repositoryCratePaths(physical,root),actual=currentOriginalRustPaths(root);
 assert.equal(expected.length,physical.length);assert.equal(new Set(expected).size,physical.length);
 assert.deepEqual(actual,expected);assert.notStrictEqual(actual,currentOriginalRustPaths(root));assert.strictEqual(assertOriginalRustCensus(actual),actual);
});
test('equal-size source replacement duplicates holes and escaping paths cannot replace original census members',()=>{
 const actual=currentOriginalRustPaths(root),historical='src/verification.rs',at=actual.indexOf(historical);assert.ok(at>=0);
 for(const replacement of ['tests/new_fake.rs',actual[(at+1)%actual.length],'../escape.rs','/outside.rs','src/line\nbreak.rs']){const changed=[...actual];changed[at]=replacement;assert.throws(()=>assertOriginalRustCensus(changed));}
 const missing=[...actual];missing.splice(at,1);assert.throws(()=>assertOriginalRustCensus(missing));const hole=[...actual];delete hole[at];assert.throws(()=>assertOriginalRustCensus(hole));assert.deepEqual(actual,currentOriginalRustPaths(root));
});
