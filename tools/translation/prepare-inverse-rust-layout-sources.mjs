import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveLocalExpressionSources} from './prepare-primitive-local-expression-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareInverseRustLayoutSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/inverse-rust-layout-source/complete-originals-and-rules.json.gz',pin:'becd3705d1b49594ad42581ad906e5ac2a71a244d195c4b041ef7c19839eb922',id:'router:inverse-rust-layout-source-complete-source-substitutions-v1',laterPlans:[preparePrimitiveLocalExpressionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareInverseRustLayoutSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Inverse Rust layout source source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
