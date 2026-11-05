// Additive current source closure; old runtime APIs retain their original roots.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {ownedCancellationRuntimeSources} from './js-to-rust/owned-cancellation.mjs';
import {ownedOutcomeRuntimeAssets} from './owned-outcome-runtime-assets.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {HTTP_DEADLINE_RUNTIME_SOURCE,HTTP_DEADLINE_DECLARATIONS_SOURCE} from './http-deadline-native-source.mjs';
const names=['http-deadline-runtime.mjs','http-deadline-runtime.d.mts'];
export function httpDeadlineRuntimeAssets(){
 const assets=ownedOutcomeRuntimeAssets();for(const [index,name]of names.entries()){const source=readFileSync(new URL('./'+name,import.meta.url),'utf8'),expected=index?HTTP_DEADLINE_DECLARATIONS_SOURCE:HTTP_DEADLINE_RUNTIME_SOURCE;if(source!==expected)throw new TypeError('Complete actual HTTP deadline runtime/declaration differs');assets.set(name,source);}return assets;
}
export function httpDeadlineRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 const rows=ownedCancellationRuntimeSources(runtimeRoot,declarationRoot),assets=httpDeadlineRuntimeAssets(),ts=ownershipCompiler();if(ts.version!=='5.9.3')throw new TypeError('Lockfile TypeScript5.9.3 required');const actual=new Map(rows.map(row=>[row.path,row.source])),additions=[];
 if(rows.filter(row=>/\.(mjs|mts)$/u.test(row.path)).length+names.length>128)throw new TypeError('Original complete runtime source-count bound');
 for(const name of names){const typed=name.endsWith('.mts'),root=typed?declarationRoot:runtimeRoot,path=root+'/'+name,source=assets.get(name),concrete=transportConcreteSyntaxSource(source,{language:typed?'TypeScript':'JavaScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete HTTP deadline CST inverse differs');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,typed?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw new TypeError('Complete native HTTP deadline module syntax differs');
  for(const statement of file.statements)if((ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement))&&statement.moduleSpecifier){if(!ts.isStringLiteral(statement.moduleSpecifier)||!statement.moduleSpecifier.text.startsWith('.'))throw new TypeError('Actual relative HTTP deadline runtime edge required');const dependency=posix.normalize(posix.join(posix.dirname(path),statement.moduleSpecifier.text));if(!actual.has(dependency)&&!actual.has(dependency.replace(/\.mjs$/u,'.d.mts')))throw new TypeError('Complete actual HTTP deadline dependency is missing');}
  if(actual.has(path))throw new TypeError('Competing original HTTP deadline runtime root');additions.push({path,source});
 }
 const current=httpDeadlineRuntimeAssets();for(const row of rows){const root=row.path.endsWith('.mts')?declarationRoot:runtimeRoot;if(!row.path.startsWith(root+'/')||current.get(row.path.slice(root.length+1))!==row.source)throw new TypeError('Complete original base runtime source changed');}return rows.concat(additions).sort((a,b)=>a.path.localeCompare(b.path));
}
