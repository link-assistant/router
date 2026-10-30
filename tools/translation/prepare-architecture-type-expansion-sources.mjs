import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareStructuredDocumentationConsumerSources} from './prepare-structured-documentation-consumer-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareArchitectureTypeExpansionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/architecture-types-expansion/complete-originals-and-rules.json.gz',pin:'6e384d59ff297d1b642e0fa87331152809e325f45844965e604d766d0201de56',id:'router:architecture-types-expansion-complete-source-substitutions-v1',laterPlans:[prepareStructuredDocumentationConsumerSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareArchitectureTypeExpansionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Architecture types expansion source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
