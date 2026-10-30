import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeTotalOperatorsSources} from './prepare-native-total-operators-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareScopedNativeEmissionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/scoped-native-emission/complete-originals-and-rules.json.gz',pin:'077cd5ef3c45b53340a8cab31407980bbaae53185ebed6d72f498479663b3979',id:'router:scoped-native-emission-complete-source-substitutions-v1',laterPlans:[prepareNativeTotalOperatorsSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareScopedNativeEmissionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Scoped native emission source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
