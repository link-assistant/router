import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOperationPart3} from './prepare-native-source-operation-part-3.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeSourceOperationPart2({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-source-operation/part-2/complete-originals-and-rules.json.gz',pin:'3a9e9ed5dfeaaf094efd2f60ad7040b3157f368189f9e6ea7829999d47de5bb6',id:'router:native-source-operation-part-2-complete-substitutions-v1',laterPlans:[prepareNativeSourceOperationPart3({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeSourceOperationPart2();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Complete native source operation source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
