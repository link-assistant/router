import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareSynchronizationExportSources} from './prepare-synchronization-export-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareBulkForwardStringsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/bulk-forward-strings/complete-originals-and-rules.json.gz',pin:'c2093315446cb69d7d7530b0c5441aa1f21bfc3711527defd54b3a6b8f0e4677',id:'router:bulk-forward-strings-complete-source-substitutions-v1',laterPlans:[prepareSynchronizationExportSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareBulkForwardStringsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Bulk forward string source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
