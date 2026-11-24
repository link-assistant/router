// Diagnostic only: the original complete plan, with no artifact application.
import {resolve} from 'node:path';
import {planRegeneration} from '../../tools/translation/retained-owned-definitions-bulk.mjs';
const started=performance.now();
const plan=planRegeneration({root:resolve('.'),progress:record=>process.stderr.write(JSON.stringify({...record,elapsedMilliseconds:Math.floor(performance.now()-started)})+'\n')});
process.stdout.write(JSON.stringify({totals:plan.manifest.totals,outputs:plan.outputs.length,applied:false,diagnosticOnly:true,runtimeParity:false})+'\n');
