import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeCodexCatalogSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readNativeInputs(root),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-codex-catalog/complete-originals-and-rules.json.gz',pin:'770ae455127f2fc2a660c7df7e3f1c888ce713f2aebec0b0e0eb4a7e3c50c31b',id:'router:native-codex-catalog-complete-source-substitutions-v1'});for(const row of inputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)throw new TypeError('Current native client implementation input changed');return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeCodexCatalogSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native Codex catalog source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
function readNativeInputs(root){
 const bytes=readFileSync(resolve(root,'tools/translation/source-profiles/native-codex-catalog/native-inputs.json'));if(createHash('sha256').update(bytes).digest('hex')!=='131965dd9b6e3553d85645b943a04734ee08dbc9e11bc60211583c12871e1cff')throw new TypeError('Complete native client source provenance differs');const data=JSON.parse(bytes);return data.files.map(row=>{const source=readFileSync(resolve(root,row.originalPath),'utf8');if(Buffer.byteLength(source)!==row.bytes||createHash('sha256').update(source).digest('hex')!==row.sha256||readFileSync(resolve(root,row.path),'utf8')!==source)throw new TypeError('Actual complete native client input differs');const concrete=transportConcreteSyntaxSource(source,{language:row.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete native client CST inverse differs');return {...row,source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
}
