import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareJsonTotalScalarFlowSources} from './prepare-json-total-scalar-flow-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareReadonlyTextHelpersSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/readonly-text-helpers/complete-originals-and-rules.json.gz',pin:'c8973d3c6c9f9768dde45a75fa2489890adafb2450bc2b591ec17953f8cd8bd6',id:'router:readonly-text-helpers-complete-source-substitutions-v1',laterPlans:[prepareJsonTotalScalarFlowSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareReadonlyTextHelpersSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Readonly text helpers source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
