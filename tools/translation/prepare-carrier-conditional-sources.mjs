import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareCarrierBranchLocalSources} from './prepare-carrier-branch-local-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCarrierConditionalSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/carrier-conditional-source/complete-originals-and-rules.json.gz',pin:'544c4e113e4274165d5acf8a0e2fe5b9b25f921fdab8dfd8532860dce7cbeaf1',id:'router:carrier-conditional-source-complete-source-substitutions-v1',laterPlans:[prepareCarrierBranchLocalSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCarrierConditionalSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Carrier conditional source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
