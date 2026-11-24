// Whole source ancestry and original predecessor regression source; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {knownProtectedSourceInstallationSuccessor} from '../protected-source-installation-20261102-successor.mjs';
import {knownLayoutOwnershipSourceSuccessor} from '../layout-ownership-bulk-20261101-successor.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {proposeProtectedSourceInstallationCopies} from '../protected-source-installation-20261102-source.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),path='tools/translation/unit-runtime-materialization.mjs';
test('both complete historical installer epochs retain the new full policy successor and all inverses',{timeout:60000},()=>{
 const text=relative=>readFileSync(new URL('../../../'+relative,import.meta.url),'utf8'),before=text('tools/translation/source-profiles/protected-source-installation-20261102/unit-before.mjs.txt'),current=text(path),old=text('tools/translation/source-profiles/layout-ownership-bulk-20261101/originals/unit-runtime-materialization.mjs.txt');
 const direct=knownProtectedSourceInstallationSuccessor({root,path,before});assert.equal(direct.after,current);assert.equal(direct.inverse,before);assert.equal(direct.history.inverse,before);assert.deepEqual(direct.stages.map(row=>row.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(direct.history.afterMeta).source,current);
 const prior=knownLayoutOwnershipSourceSuccessor({root,path,before:old});assert.equal(prior.before,old);assert.equal(prior.after,before);assert.equal(prior.currentAfter,current);assert.equal(prior.inverse,old);assert.equal(prior.laterHistories.length,1);assert.equal(prior.laterHistories[0].before,before);assert.equal(prior.laterHistories[0].after,current);
 assert.equal(knownLayoutOwnershipSourceSuccessor({root,path,before}).currentAfter,current);assert.equal(knownProtectedSourceInstallationSuccessor({root,path,before:before+'\n'}),null);assert.equal(knownProtectedSourceInstallationSuccessor({root,path:'other.mjs',before}),null);
});
test('full installer successor and preparer source proposals retain complete ordered phases and exact source equations',{timeout:60000},()=>{
 const packet=JSON.parse(gunzipSync(readFileSync(new URL('../../../docs/development/protected-source-installation-20261102/complete-source-draft.json.gz',import.meta.url)))),input=packet.equations.map(row=>({path:row.originalPath,source:row.before})),result=proposeProtectedSourceInstallationCopies(input);
 assert.equal(result.rows.length,3);for(let at=0;at<result.rows.length;at++){const row=result.rows[at];assert.equal(row.after,packet.equations[at].after);assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}assert.equal(result.sourceInstalled,false);assert.equal(result.semanticAuthority,false);input[0].source+='\n';assert.throws(()=>proposeProtectedSourceInstallationCopies(input));
});
