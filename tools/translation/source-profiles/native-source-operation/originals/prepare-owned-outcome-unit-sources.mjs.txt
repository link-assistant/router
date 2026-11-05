import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareFilesystemControlSources} from './prepare-filesystem-control-sources.mjs';
import {prepareOwnedForwardSources} from './prepare-owned-forward-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedOutcomeUnitSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-outcome-unit/complete-originals-and-rules.json.gz',pin:'1925d866d116d50215e898e6c5ba269aa89799532ed015af5eb19bfdc3d960f7',id:'router:owned-outcome-source-unit-substitutions-v1',laterPlans:[prepareOwnedForwardSources({root}),prepareFilesystemControlSources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedOutcomeUnitSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Owned outcome source-unit substitutions are stale');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
