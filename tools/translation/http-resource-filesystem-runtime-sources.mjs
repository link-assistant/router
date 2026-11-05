// Additive receiving closure; the original deadline/core source APIs are intact.
import {readFileSync} from 'node:fs';
import {httpDeadlineResultRuntimeSources} from './http-deadline-result-runtime-sources.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
const DECLARATION=new URL('./extensions/filesystem-effects-runtime.d.mts',import.meta.url);
export function httpResourceFilesystemRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 const rows=httpDeadlineResultRuntimeSources(runtimeRoot,declarationRoot),source=readFileSync(DECLARATION,'utf8'),path=declarationRoot+'/extensions/filesystem-effects-runtime.d.mts',concrete=transportConcreteSyntaxSource(source,{language:'TypeScript'}),ts=ownershipCompiler();
 if(ts.version!=='5.9.3'||transportConcreteSyntaxMeta(concrete.meta).source!==source||ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length||rows.some(row=>row.path===path)||rows.filter(row=>/\.(mjs|mts)$/u.test(row.path)).length>=128)throw new TypeError('Complete original filesystem declaration source closure differs');
 if(readFileSync(DECLARATION,'utf8')!==source)throw new TypeError('Original filesystem declaration changed');return rows.concat([{path,source}]).sort((left,right)=>left.path.localeCompare(right.path));
}
