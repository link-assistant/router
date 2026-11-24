import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareConditionalSourceOperationSources} from './prepare-conditional-source-operation-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareGeneratedConditionalNormalizationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/generated-conditional-normalization/complete-originals-and-rules.json.gz',pin:'f4cbcda3f4db966158e9481aac8526a1f2fb1ecc32ca106da0c76f5a10b49293',id:'router:generated-conditional-normalization-complete-source-substitutions-v1',laterPlans:[prepareConditionalSourceOperationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareGeneratedConditionalNormalizationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Generated conditional normalization source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
