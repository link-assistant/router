import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareModulePublicAPI} from './prepare-module-public-api.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareHoistedModuleCycles({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/hoisted-module-cycles/complete-originals-and-rules.json.gz',pin:'ba09f663517fa1eea9e81fcba2c376656eff946a85c19165c7e19b5c6be94006',id:'router:hoisted-module-cycles-source-copy-v1',laterPlans:[prepareModulePublicAPI({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareHoistedModuleCycles();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Hoisted module source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
