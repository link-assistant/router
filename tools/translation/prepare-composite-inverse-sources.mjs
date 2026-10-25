import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareDerivedInverseModule} from './prepare-derived-inverse-module.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCompositeInverseSources({root=ROOT}={}){
 const main=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/composite-inverse/complete-originals-and-rules.json.gz',pin:'b3603cc1e08704e6a9ca5b191c7c0a77043cf99e470ff627cb3eab3924216f6d',id:'router:composite-inverse-complete-source-substitutions-v1'});
 const derived=prepareDerivedInverseModule({root,archive:'tools/translation/source-profiles/composite-inverse/derived-functions.json.gz',pin:'c78658d1b0d39e655310fd4e438c5c06b269eb5f9bd9438deb932d1feabe7690',id:'router:composite-inverse-function-source-extraction-v1'});
 return {...main,files:main.files.concat(derived.files),originalInputs:main.originalInputs.concat(derived.originalInputs)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCompositeInverseSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Composite inverse source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
