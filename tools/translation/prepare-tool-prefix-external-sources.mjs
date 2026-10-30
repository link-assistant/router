import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareQualifiedFunctionItemSources} from './prepare-qualified-function-item-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareToolPrefixExternalSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/tool-prefix-external-source/complete-originals-and-rules.json.gz',pin:'2f2e49b8ff4bf4f3e86fda481062874c550f43e12f66dc3110ebc67590d64608',id:'router:tool-prefix-external-source-complete-source-substitutions-v1',laterPlans:[prepareQualifiedFunctionItemSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareToolPrefixExternalSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Tool external prefix source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
