// Generate/check complete fixed PROGRAM storage; never issue a compiler permit.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderClassProgramStorage} from './class-program-storage.mjs';
export {renderClassProgramStorage};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))throw Error('Usage: prepare-class-program-storage.mjs --emit|--check');
 const path='tools/translation/extensions/original-class-definition-birth.mjs',source=readFileSync(new URL('./extensions/original-class-definition-birth.mjs',import.meta.url),'utf8'),proposal=renderClassProgramStorage({source});
 if(args[0]==='--check'){if(proposal.text!==source)throw Error('Complete registered class PROGRAM storage is stale');console.log('Complete registered class PROGRAM storage is current; no execution authority.');}
 else console.log(JSON.stringify({schema:'complete-class-program-storage-source-proposal-v1',path,...proposal,sourceInstalled:false,semanticChecksPassed:false,rustExecuted:false}));
}
