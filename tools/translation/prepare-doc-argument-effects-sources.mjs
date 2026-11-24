import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareAttributeExpressionConfinementSources} from './prepare-attribute-expression-confinement-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareDocArgumentEffectsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/doc-argument-effects/complete-originals-and-rules.json.gz',pin:'b350eaba4b4ddb1d3b220fb4ca92df019d6e3b0956ccc20af1944e146f138022',id:'router:doc-argument-effects-complete-source-substitutions-v1',laterPlans:[prepareAttributeExpressionConfinementSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareDocArgumentEffectsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Doc argument effects source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
