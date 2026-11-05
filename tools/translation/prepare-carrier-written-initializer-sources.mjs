import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareInverseRustLayoutSources} from './prepare-inverse-rust-layout-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCarrierWrittenInitializerSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/carrier-written-initializer-source/complete-originals-and-rules.json.gz',pin:'f52df82f66daafbbdeccbc7e71ab2eaef405d71721bd874ff663bbd5f4142325',id:'router:carrier-written-initializer-source-complete-source-substitutions-v1',laterPlans:[prepareInverseRustLayoutSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCarrierWrittenInitializerSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Carrier written initializer source source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
