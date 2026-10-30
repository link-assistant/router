import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareVectorNativeJsonEmitterSources} from './prepare-vector-native-json-emitter-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareBoundedJsonCallSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/bounded-json-calls/complete-originals-and-rules.json.gz',pin:'60bd80f205b3cd100b0ba2a6e63025e6a68d57c878e687084716fe8116355ec1',id:'router:bounded-json-calls-complete-source-substitutions-v1',laterPlans:[prepareVectorNativeJsonEmitterSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareBoundedJsonCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Bounded JSON caller source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
