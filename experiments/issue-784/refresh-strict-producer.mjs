// Derive a complete external source proposal, then install only its reviewed file.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareStrictStaticSourceProducer} from '../../tools/translation/prepare-strict-static-source-producer.mjs';

const input='tools/translation/prepare-real-source-fixtures.mjs';
const output='tools/translation/strict-static-source-producer.mjs';
const original=readFileSync(input),previous=readFileSync(output);
const root=mkdtempSync(join(tmpdir(),'router-issue-784-strict-proposal-'));
try{
  mkdirSync(join(root,'tools/translation'),{recursive:true});
  writeFileSync(join(root,input),original);
  const proposal=prepareStrictStaticSourceProducer({root});
  writeFileSync('ci-logs/restart-export-strict-proposal.json',JSON.stringify(proposal)+'\n');
  const row=proposal.files[0];
  assert.equal(row.path,output);
  assert.equal(row.before,original.toString('utf8'));
  assert.equal(row.after,previous.toString('utf8').replaceAll('level:1,mtime:0','level:9,mtime:0'));
  assert.ok(readFileSync(input).equals(original));
  assert.ok(readFileSync(output).equals(previous));
  writeFileSync(output,row.after);
  console.log(JSON.stringify({path:output,completeSourceProposal:true,
    onlyCompressionLevelChanged:true,typescript:proposal.typescriptVersion,
    nativeScopeChecked:row.nativeBindings.nativeSemanticScopeChecked}));
}finally{rmSync(root,{recursive:true,force:true});}
