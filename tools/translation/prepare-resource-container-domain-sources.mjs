import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareSourceExpressionBlockSources} from './prepare-source-expression-block-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareResourceContainerDomainSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/resource-container-domains-source/complete-originals-and-rules.json.gz',pin:'b25655c80a6e1b3e07d3df599ecbea7012b8f1fbecd84c4318a1f85de563cf3b',id:'router:resource-container-domains-source-complete-source-substitutions-v1',laterPlans:[prepareSourceExpressionBlockSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareResourceContainerDomainSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Resource container domain source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
