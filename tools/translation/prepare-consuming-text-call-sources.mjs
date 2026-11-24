import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareGeneratedHeaderSources} from './prepare-generated-header-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareConsumingTextCallSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/consuming-text-call-source/complete-originals-and-rules.json.gz',pin:'be0fac9ad8e0c2d804d5f0d3ac249d289e3b86067bc1a58cf6c4e1884e1d4014',id:'router:consuming-text-call-source-complete-source-substitutions-v1',laterPlans:[prepareGeneratedHeaderSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareConsumingTextCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Consuming text call source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
