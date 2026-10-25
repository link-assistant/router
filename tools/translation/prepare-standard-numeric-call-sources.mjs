import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareDerivedInverseModule} from './prepare-derived-inverse-module.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareStandardNumericCallSources({root=ROOT}={}){
 const main=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/standard-numeric-calls/complete-originals-and-rules.json.gz',pin:'e891b8506a52b88410b2fa63f4de7e7e0f608ebf6b73ad95663cd21097827ee9',id:'router:standard-numeric-calls-complete-source-substitutions-v1'});
 const derived=prepareDerivedInverseModule({root,archive:'tools/translation/source-profiles/standard-numeric-calls/derived-functions.json.gz',pin:'b4cbf912d3b7162a63abb799bbb612916f8636518f73a496f20f291d4211f096',id:'router:standard-numeric-functions-source-extraction-v1'});
 return {...main,files:main.files.concat(derived.files),originalInputs:main.originalInputs.concat(derived.originalInputs)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareStandardNumericCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Standard numeric call source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
