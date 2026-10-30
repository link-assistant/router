import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeCodexCatalogSources} from './prepare-native-codex-catalog-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeGlobalRepairSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readNativeInputs(root),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-global-repair/complete-originals-and-rules.json.gz',pin:'4317a057031e0df31d2849fa91d46f8b56b2a51d4540b0fd97b5a5688b1a11bd',id:'router:native-global-repair-complete-source-substitutions-v1',laterPlans:[prepareNativeCodexCatalogSources({root})]});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeGlobalRepairSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native global repair source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
function readNativeInputs(root){
 const bytes=readFileSync(resolve(root,'tools/translation/source-profiles/native-global-repair/native-inputs.json'));if(createHash('sha256').update(bytes).digest('hex')!=='c2650f78e88280c9b1af8aba36a10dd7851148a5f804798d74486ef4a09895e8')throw new TypeError('Complete native client source provenance differs');const data=JSON.parse(bytes);return data.files.map(row=>{const originalSource=readFileSync(resolve(root,row.originalPath),'utf8');if(Buffer.byteLength(originalSource)!==row.bytes||createHash('sha256').update(originalSource).digest('hex')!==row.sha256)throw new TypeError('Actual complete native original input differs');const joined=currentNativeSourceProvenance(root,{...row,source:originalSource}),source=joined.source;const concrete=transportConcreteSyntaxSource(source,{language:joined.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete native client CST inverse differs');return {...row,...joined,originalBytes:row.bytes,originalSha256:row.sha256,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
}

import {currentNativeSourceProvenance,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
