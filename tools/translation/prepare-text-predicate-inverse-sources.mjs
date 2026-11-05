import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareDerivedInverseModule} from './prepare-derived-inverse-module.mjs';
import {prepareCompositeInverseSources} from './prepare-composite-inverse-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextPredicateInverseSources({root=ROOT}={}){
 const main=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-predicate-inverse/complete-originals-and-rules.json.gz',pin:'1d0c81e51d7b3cb661f6a2626b107df1d953c86025f321be8c23544e435e5e78',id:'router:text-predicate-inverse-complete-source-substitutions-v1',laterPlans:[prepareCompositeInverseSources({root})]});
 const derived=prepareDerivedInverseModule({root,archive:'tools/translation/source-profiles/text-predicate-inverse/derived-functions.json.gz',pin:'41a40a3311386774a77137c49226ed60fb9b08d0cb31d2bdf23cf487c5510e1c',id:'router:text-predicate-function-source-extraction-v1'});
 return {...main,files:main.files.concat(derived.files),originalInputs:main.originalInputs.concat(derived.originalInputs)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextPredicateInverseSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Text predicate inverse source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
