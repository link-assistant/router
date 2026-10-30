import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedOutcomeUnitSources} from './prepare-owned-outcome-unit-sources.mjs';
import {prepareOwnedStateFlow} from './prepare-owned-state-flow.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedStateUnitSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-state-unit/complete-originals-and-rules.json.gz',pin:'af06ee808682f8c43a78a9e9ff63d79df85319ce4ab26785428046ea848dbf3c',id:'router:owned-state-source-unit-substitutions-v1',laterPlans:[prepareOwnedStateFlow({root}),prepareOwnedOutcomeUnitSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedStateUnitSources();
 if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned state unit sources are stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
