// Finite original/new retention comparison; no compiler admission is inferred.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {retainMatrixDraft} from '../../tools/translation/matrix-draft-custody.mjs';
const originalSource=execFileSync('git',['show','b63dd5a337c4e17f9df51f9ce866cb73fdea7662:tools/translation/matrix-draft-custody.mjs'],{encoding:'utf8'});
const original=await import('data:text/javascript;base64,'+Buffer.from(originalSource).toString('base64'));
const root=mkdtempSync(join(tmpdir(),'router-issue-784-index-reproduction-'));
try{
 const staging=join(root,'staging'),path='profiles/p/output.mjs',bytes=Buffer.from('export const answer=42;\n');
 mkdirSync(join(staging,'profiles/p'),{recursive:true});writeFileSync(join(staging,path),bytes);
 const computedIndices=[{path:'profiles/owned-definitions-matrix-'+ 'a'.repeat(64)+'.json',content:'{"complete":"actual computed index"}\n'}];
 const options={root,staging,plans:[{outputs:[{path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]}],inputs:{head:'b'.repeat(40)},directory:'js/node_modules/.matrix-drafts',computedIndices};
 const oldPath=original.retainMatrixDraft(options),before=JSON.parse(readFileSync(join(oldPath,'manifest.json')));
 let failure;try{assert.equal(before.indices?.length,1);}catch(error){failure={code:error.code,message:error.message};}
 assert.equal(failure?.code,'ERR_ASSERTION');
 const newPath=retainMatrixDraft(options),after=JSON.parse(readFileSync(join(newPath,'manifest.json')));
 assert.equal(after.indices.length,1);assert.deepEqual(gunzipSync(readFileSync(join(newPath,after.indices[0].storedAs))),Buffer.from(computedIndices[0].content));
 console.log(JSON.stringify({originalSource,originalRecord:before,originalRegressionFailure:failure,currentRecord:after,wholeIndexBytesVerified:true,semanticAuthority:false,runtimeParity:false}));
}finally{rmSync(root,{recursive:true,force:true});}
