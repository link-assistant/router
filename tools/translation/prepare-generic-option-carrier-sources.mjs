import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceOptionConstructorSources} from './prepare-http-resource-option-constructors-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareGenericOptionCarrierSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/generic-option-carrier/complete-originals-and-rules.json.gz',pin:'207d30de1ae02edbdbba7090806ea0a8f95898f6a1bb18abb72d6ec0e6bc75d0',id:'router:generic-option-carrier-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceOptionConstructorSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareGenericOptionCarrierSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Generic Option carrier source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
