import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedScalarUnitSources} from './prepare-owned-scalar-unit-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedModuleAliasSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-module-aliases/complete-originals-and-rules.json.gz',pin:'44486177a862361a3b8a242852a055f83d98ea28b4b67936df384ca6ad8622fa',id:'router:owned-module-aliases-complete-source-substitutions-v1',laterPlans:[prepareOwnedScalarUnitSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedModuleAliasSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned module alias source draft differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
