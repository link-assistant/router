import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareNamespacePositionBatchSources} from './prepare-namespace-position-batch-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareStructuredDocumentationConsumerSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/structured-documentation-consumers/complete-originals-and-rules.json.gz',pin:'1fb363593e08e4a08f96e25c46c4335ffa6a0342e321fe26c6649271744b68a6',id:'router:structured-documentation-consumers-complete-source-substitutions-v1',laterPlans:[prepareNamespacePositionBatchSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareStructuredDocumentationConsumerSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Structured documentation consumer source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
