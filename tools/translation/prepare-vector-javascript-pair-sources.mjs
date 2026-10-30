import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareVectorSourceUnitSources} from './prepare-vector-source-unit-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareVectorJavaScriptPairSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/vector-javascript-pair/complete-originals-and-rules.json.gz',pin:'dc51aa988e6ab85539af90c889ebfb40cc301c65d631d1b8b63c9d56540de0f7',id:'router:vector-javascript-pair-complete-source-substitutions-v1',laterPlans:[prepareVectorSourceUnitSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareVectorJavaScriptPairSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Vector JavaScript pair source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
