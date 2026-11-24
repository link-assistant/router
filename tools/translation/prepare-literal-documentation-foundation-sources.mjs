import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareLiteralDocumentationConsumerSources} from './prepare-literal-documentation-consumer-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareLiteralDocumentationFoundationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/literal-documentation-foundation/complete-originals-and-rules.json.gz',pin:'e7438d6e1f1f929fd1014651b6fbf5589fc0d668079dca9f86e45cfe77386cc0',id:'router:literal-documentation-foundation-complete-source-substitutions-v1',laterPlans:[prepareLiteralDocumentationConsumerSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareLiteralDocumentationFoundationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Literal documentation foundation source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
