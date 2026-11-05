// Fresh per-analysis qualification through the complete original filesystem
// compiler. No public descriptor, saved verdict or runtime hash can admit a use.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {translateFilesystemControlJavaScript} from './filesystem-control.mjs';
import {httpResourceFilesystemContracts} from './http-resource-filesystem-contracts.mjs';
const RUNTIME=new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url);
const DECLARATIONS=new URL('../extensions/filesystem-effects-runtime.d.mts',import.meta.url);
export function requireHttpResourceFilesystemSources(imports,context){
 const contracts=httpResourceFilesystemContracts(),selected=[...new Set(imports.values())].map(name=>contracts.find(row=>row.javascriptName===name)).filter(Boolean);if(!selected.length)return;
 if(context.filesystemDeclarationSource!==readFileSync(DECLARATIONS,'utf8'))throw new TypeError('Complete actual matching filesystem declaration input required');
 const sourcePath=posix.join(posix.dirname(context.sourcePath),'original-filesystem-operation.mjs'),relative=posix.relative(posix.dirname(sourcePath),context.flowRuntimePath),edge=relative.startsWith('.')?relative:'./'+relative;
 for(const row of selected){
  const parameters=row.args.map((_,index)=>'argument'+index),call='selected_operation('+parameters.join(', ')+')',body=row.async?'defer_operation(async () => { return await '+call+'; })':call,source='import { '+row.javascriptName+' as selected_operation, deferFilesystemFlow as defer_operation } from '+JSON.stringify(edge)+';\n/** '+parameters.map(name=>'@param {string} '+name).join(' ')+' */\nexport function original_filesystem_operation('+parameters.join(', ')+') { return '+body+'; }\n',result=translateFilesystemControlJavaScript(source,{sourcePath,runtimePath:context.flowRuntimePath,runtimeSource:context.flowSource});
  if(result.mappings.length!==1||result.mappings[0].operation!==row.javascriptName||typeof result.checkedRustMeta!=='string'||!result.checkedRustMeta.length)throw new TypeError('Complete original standard filesystem semantic association differs');
 }
 if(readFileSync(RUNTIME,'utf8')!==context.flowSource)throw new TypeError('Original filesystem runtime changed during independent semantic qualification');
 if(context.filesystemDeclarationSource!==readFileSync(DECLARATIONS,'utf8'))throw new TypeError('Original filesystem declarations changed during independent semantic qualification');
}
