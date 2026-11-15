// Complete finite tracked ordinary input; output is never installed.
import {resolve} from 'node:path';
import {planRegeneration} from '../../tools/translation/bulk.mjs';
const started=performance.now();
const plan=planRegeneration({root:resolve('.'),progress:event=>console.log(JSON.stringify({
 elapsedMilliseconds:performance.now()-started,memory:process.memoryUsage(),event,
 diagnosticOnly:true,heapLimitMiB:512,
}))});
console.log(JSON.stringify({elapsedMilliseconds:performance.now()-started,inventory:plan.inventory,
 diagnosticOnly:true,scope:'Actual complete ordinary planner with extra namespace progress only. Separate 512 MiB diagnostic heap; original CI worker remains 2048 MiB. No output applied or gate qualification.'}));
