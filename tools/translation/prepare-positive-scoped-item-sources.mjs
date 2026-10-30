import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {preparePositiveQualifiedTypeSources} from './prepare-positive-qualified-type-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePositiveScopedItemSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/positive-scoped-items/complete-originals-and-rules.json.gz',pin:'4bbca5b2d00e02fea9c3896dce3fc2e06482738f55ac0c9de835c59c57c58f52',id:'router:positive-scoped-items-complete-source-substitutions-v1',laterPlans:[preparePositiveQualifiedTypeSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePositiveScopedItemSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Positive scoped item source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
