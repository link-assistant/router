import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareNativeIntegerArithmeticSources} from './prepare-native-integer-arithmetic-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareConstantWrappingSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/constant-wrapping/complete-originals-and-rules.json.gz',pin:'088b6a21a05b6e5778cb573d365aeb9c6a5fc64ddb98237bc6cd9c7da1284958',id:'router:constant-wrapping-complete-source-substitutions-v1',laterPlans:[prepareNativeIntegerArithmeticSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareConstantWrappingSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Constant wrapping source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
