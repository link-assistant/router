import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedScalarSliceSources} from './prepare-owned-scalar-slice-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePredicateInverseSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/predicate-inverse/complete-originals-and-rules.json.gz',pin:'a67c4939c582c9e65c2dca7825b8f1d394f1fac734ac6c9e43386dc539d9fe0a',id:'router:predicate-inverse-complete-source-substitutions-v1',laterPlans:[prepareOwnedScalarSliceSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePredicateInverseSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Predicate inverse source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
