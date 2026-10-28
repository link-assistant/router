import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareVectorParameterSources} from './prepare-vector-parameter-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareVectorRepeatOriginSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/vector-repeat-origin/complete-originals-and-rules.json.gz',pin:'607adbdd677fd3fae6ab608d4270c4dc8c7a33eb12d71664fa23b2c16c0633ed',id:'router:vector-repeat-origin-complete-source-substitutions-v1',laterPlans:[prepareVectorParameterSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareVectorRepeatOriginSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Vector repeat origin source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
