import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedStateUnitSources} from './prepare-owned-state-unit-sources.mjs';
import {prepareOwnedStateFlow} from './prepare-owned-state-flow.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedState({root=ROOT}={}){
 const unit=prepareOwnedStateUnitSources({root}),flow=prepareOwnedStateFlow({root}),remaining={...flow,files:flow.files.filter(row=>!unit.files.some(previous=>previous.path===row.path))};
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-state/complete-originals-and-rules.json.gz',pin:'ca7308cc0cd26a3462f98344d3817341ef6bf18a08fa4fc076b9d9c3fd6c5dd4',id:'router:owned-json-state-source-copy-v1',laterPlans:[unit,remaining]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedState();
 if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Owned state source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
