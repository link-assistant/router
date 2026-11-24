import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedOutcome} from './prepare-owned-outcome.mjs';
import {prepareOwnedOutcomeUnitSources} from './prepare-owned-outcome-unit-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedNumericAbi({root=ROOT}={}){
 const outcome=prepareOwnedOutcome({root}),units=prepareOwnedOutcomeUnitSources({root}),remaining={...units,files:units.files.filter(row=>!outcome.files.some(previous=>previous.path===row.path))};
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-numeric-abi/complete-originals-and-rules.json.gz',pin:'dab78c3dddccfeaa1c38586580d68b35083129a0b7f542f8c445a0cf84aefbc3',id:'router:owned-numeric-abi-source-substitutions-v1',laterPlans:[outcome,remaining]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedNumericAbi();
 if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned numeric ABI sources are stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
