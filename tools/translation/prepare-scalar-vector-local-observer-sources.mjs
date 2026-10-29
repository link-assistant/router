import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareScalarVectorLocalWiringSources} from './prepare-scalar-vector-local-wiring-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareScalarVectorLocalObserverSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/scalar-vector-local-observer/complete-originals-and-rules.json.gz',pin:'f9e0041a95050b681f1081180daf1016daf235325baaa1b008b3d23d4d63a507',id:'router:scalar-vector-local-observer-complete-source-substitutions-v1',laterPlans:[prepareScalarVectorLocalWiringSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareScalarVectorLocalObserverSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Scalar vector local observer source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
