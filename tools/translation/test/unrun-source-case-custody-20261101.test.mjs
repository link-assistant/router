// Independent read-only case-source lifetime cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,renameSync,rmSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {captureUnrunSourceCaseCustody,withUnrunSourceCaseCustody} from '../unrun-source-case-custody-20261101.mjs';
const limits={timeout:60000};
function fixture(t){const root=realpathSync(mkdtempSync(join(tmpdir(),'router-unrun-case-source-')));t.after(()=>rmSync(root,{recursive:true,force:true}));const path='tools/translation/test/independent-case.mjs',source='export const independent = 1;\n';mkdirSync(join(root,'tools/translation/test'),{recursive:true});writeFileSync(join(root,path),source);return {root,path,source};}
test('unrun case source is not a compiler cohort and retains actual whole source until release',limits,t=>{
 const {root,path,source}=fixture(t),lease=captureUnrunSourceCaseCustody(root,[{path,source}]);lease.verify();lease.release();assert.throws(()=>lease.verify(),/expired/);assert.throws(()=>lease.release(),/one actual/);
});
test('same-byte replacement and changed case bytes refuse even though no project compiler consumes cases',limits,t=>{
 for(const changed of [false,true]){const {root,path,source}=fixture(t);assert.throws(()=>withUnrunSourceCaseCustody(root,[{path,source}],()=>{if(changed)writeFileSync(join(root,path),source+'// changed\n');else{writeFileSync(join(root,path+'.replacement'),source);renameSync(join(root,path+'.replacement'),join(root,path));}}),/case source|case custody/i);}
});
test('callback primary remains exact while every case closer still runs',limits,t=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(Error('independent case source primary'))]){const {root,path,source}=fixture(t);let failed=false,actual;try{withUnrunSourceCaseCustody(root,[{path,source}],()=>{writeFileSync(join(root,path),source+'// closing failure\n');throw primary;});}catch(error){failed=true;actual=error;}assert.equal(failed,true);assert.strictEqual(actual,primary);}
});
test('foreign paths and source descriptors never expand native/compiler input permission',limits,t=>{
 const {root,path,source}=fixture(t);let reads=0;const accessor={path};Object.defineProperty(accessor,'source',{enumerable:true,get(){reads++;return source;}});assert.throws(()=>captureUnrunSourceCaseCustody(root,[accessor]));assert.equal(reads,0);for(const name of ['rust/src/lib.rs','../outside.mjs','tools/translation/test/../outside.mjs'])assert.throws(()=>captureUnrunSourceCaseCustody(root,[{path:name,source}]));
});
