import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceBooleanValueSources} from './prepare-http-resource-boolean-value-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePartitionedCompilerExportSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/partitioned-compiler-export/complete-originals-and-rules.json.gz',pin:'7c218f8230325fb7dab98b242843acca0d45dc683c28cab9f25cd1e3eb16423c',id:'router:partitioned-compiler-export-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceBooleanValueSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePartitionedCompilerExportSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Partitioned compiler export source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
