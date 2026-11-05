import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceNativeIfLetSources} from './prepare-http-resource-native-if-let-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTargetFeatureNamespaceSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/target-feature-namespace/complete-originals-and-rules.json.gz',pin:'4bc65d08c39839473ed82ebbfa7ed2382597ed269023b2875d7749a77eb55a3e',id:'router:target-feature-namespace-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceNativeIfLetSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTargetFeatureNamespaceSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Target feature namespace source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
