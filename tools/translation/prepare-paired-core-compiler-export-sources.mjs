import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './failure-aware-native-substitution-copy.mjs';
import {prepareOwnedTextVectorRootActivationSources} from './prepare-owned-text-vector-root-activation-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePairedCoreCompilerExportSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/paired-core-compiler-export/complete-originals-and-rules.json.gz',pin:'50421cd7b5ff26a07261deaaf8626d9c7e1dce695f6742f28dea0925df92face',id:'router:paired-core-compiler-export-complete-source-substitutions-v1',laterPlans:[prepareOwnedTextVectorRootActivationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePairedCoreCompilerExportSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Paired native core compiler export source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
