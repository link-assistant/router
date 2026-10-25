import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedOutcomeUnitSources} from './prepare-owned-outcome-unit-sources.mjs';
import {prepareJsonFieldSources} from './prepare-json-field-sources.mjs';
import {prepareOwnedNumericAbi} from './prepare-owned-numeric-abi.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedStateFlow({root=ROOT}={}){
 const fields=prepareJsonFieldSources({root}),numeric=prepareOwnedNumericAbi({root}),remaining={...numeric,files:numeric.files.filter(row=>!fields.files.some(previous=>previous.path===row.path))};
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-state-flow/complete-originals-and-rules.json.gz',pin:'40110f0af42161755f799c092e8a6439cea6868a2457fe432a16b7881c4b8c83',id:'router:owned-state-flow-substitutions-v1',laterPlans:[fields,remaining,prepareOwnedOutcomeUnitSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedStateFlow();
 if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned state flow sources are stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
