import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveRustInverseSources} from './prepare-primitive-rust-inverse-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareReversePrimitiveOperatorSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/reverse-primitive-operators/complete-originals-and-rules.json.gz',pin:'4cf9c8fad60f3ab14f7f3553c05e22e4b8f8f17f634578b78c68ec2892f41acd',id:'router:reverse-primitive-operators-complete-source-substitutions-v1',laterPlans:[preparePrimitiveRustInverseSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareReversePrimitiveOperatorSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Reverse primitive operator source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
