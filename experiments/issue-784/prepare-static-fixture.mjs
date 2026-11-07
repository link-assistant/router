// Generate an external proposal using the complete source fixture producer.
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {prepareStaticSourceLifecycleProposalReleased,writeStaticSourceLifecycleProposal}
  from '../../tools/translation/prepare-real-source-fixtures.mjs';

const proposal=prepareStaticSourceLifecycleProposalReleased({
  root:resolve('.'),currentRevision:'HEAD',
  historyArchive:resolve('tools/translation/source-profiles/static-source-lifecycle'),
});
const output=mkdtempSync(join(tmpdir(),'router-issue-784-static-proposal-'));
writeStaticSourceLifecycleProposal(proposal,output);
const receipt={output,node:process.version,subjectRevision:proposal.subjectRevision,
  sourceFiles:proposal.before.length,inputsUnchanged:JSON.stringify(proposal.before)===JSON.stringify(proposal.after),
  completeInverse:proposal.completeInverse,authority:proposal.authority,
  files:proposal.files.map(({path,bytes,sha256})=>({path,bytes,sha256}))};
writeFileSync('ci-logs/'+(process.argv[2]??'restart-static')+'-proposal.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
