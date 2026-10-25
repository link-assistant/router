import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareDerivedInverseModule} from './prepare-derived-inverse-module.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareStandardFloatingCallSources({root=ROOT}={}){
 const main=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/standard-floating-calls/complete-originals-and-rules.json.gz',pin:'117b6c7e509b07d399063b0bf6d0662f9cb1e1fca570253d0a234d4d3cf9663a',id:'router:standard-floating-calls-complete-source-substitutions-v1'});const derived=prepareDerivedInverseModule({root,archive:'tools/translation/source-profiles/standard-floating-calls/derived-functions.json.gz',pin:'11abb6dd89624131f0c28f83e5a46715482466345e65cd708b5aff2f79e1a076',id:'router:standard-floating-functions-source-extraction-v1'});return {...main,files:main.files.concat(derived.files),originalInputs:main.originalInputs.concat(derived.originalInputs)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareStandardFloatingCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Standard floating call source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
