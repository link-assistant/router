// Original complete ordinary plan, finite tracked corpus, no output applied.
import {resolve} from 'node:path';
import {planRegeneration} from '../../tools/translation/bulk.mjs';
const start=performance.now();
const plan=planRegeneration({root:resolve('.'),progress:event=>console.log('PROGRESS '+JSON.stringify(event))});
console.log(JSON.stringify({scope:'Actual ordinary planner, 768 MiB diagnostic heap; original CI worker has its unchanged 2048 MiB heap. No plan applied or current matrix qualification.',elapsedMilliseconds:performance.now()-start,totals:plan.inventory?.totals??null}));
