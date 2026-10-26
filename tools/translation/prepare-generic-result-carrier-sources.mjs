import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceNativeGenericArgumentSources} from './prepare-http-resource-native-generic-argument-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareGenericResultCarrierSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/generic-result-carrier/complete-originals-and-rules.json.gz',pin:'970b33aae0a32aa0629189db8452981cf91092c478a92c3ca9a75ab85c42cb03',id:'router:generic-result-carrier-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceNativeGenericArgumentSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareGenericResultCarrierSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Generic Result carrier source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
