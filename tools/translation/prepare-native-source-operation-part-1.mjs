import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOperationPart2} from './prepare-native-source-operation-part-2.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeSourceOperationPart1({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-source-operation/part-1/complete-originals-and-rules.json.gz',pin:'75c7696315ebcdc7253b7338fa3934e8d0dab417b7a2011c2829af8952342a4c',id:'router:native-source-operation-part-1-complete-substitutions-v1',laterPlans:[prepareNativeSourceOperationPart2({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeSourceOperationPart1();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Complete native source operation source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
