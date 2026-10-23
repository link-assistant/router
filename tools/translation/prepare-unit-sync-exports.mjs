// Native-selected packaging copy; immutable original APIs remain inspectable.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {verifyNativeCopiedSourceBindingBatch} from './source-copy-native-bindings.mjs';
import {TRANSLATOR_ENTRYPOINTS} from './translator-entrypoints.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/unit-sync-exports/';
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Source unit export draft: '+message);};
// Filled from the complete captured original archive during source construction.
const PIN='1f47a6462688b4eb781053798d1d9aefe40a474e8b98b5023838f1be26999d34';
export function prepareUnitSyncExports({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,BASE+'complete-originals.json.gz'));need(hash(packed)===PIN,'complete original archive');const data=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));need(data.schema==='source-unit-export-originals-v1'&&data.files.length===3,'complete original census');
 const ts=ownershipCompiler(),files=[];need(ts.version==='5.9.3','lockfile TypeScript5.9.3');
 for(const original of data.files){
  const {path,source:before}=original;need(hash(before)===original.sha256&&Buffer.byteLength(before)===original.bytes,'complete original source');const file=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);need(!file.parseDiagnostics.length,'whole original native grammar');const selected=[];
  for(const statement of file.statements)if(ts.isVariableStatement(statement))for(const node of statement.declarationList.declarations)if(ts.isIdentifier(node.name)&&node.name.text===(path.endsWith('/export-bundle.mjs')?'roots':'EXTRA'))selected.push(node);
  need(selected.length===1&&ts.isArrayLiteralExpression(selected[0].initializer),'whole original native packaging vector');const node=selected[0].initializer,values=node.elements.map(value=>{need(ts.isStringLiteral(value),'complete original literal entries');return value.text;}),originalScripts=values.filter(value=>value.startsWith('scripts/'));
  need(JSON.stringify(originalScripts)===JSON.stringify(TRANSLATOR_ENTRYPOINTS.slice(0,-1)),'all original CLI entries remain in order');const tail=path.endsWith('/export-bundle.mjs')?["'tools/translation'",'...TRANSLATOR_ENTRYPOINTS']:['...TRANSLATOR_ENTRYPOINTS',...values.filter(value=>!value.startsWith('scripts/')).map(value=>JSON.stringify(value))];
  const selection={span:[node.getStart(file),node.end],expected:node.getText(file),replacement:'['+tail.join(',')+']'},language=before.slice(0,selection.span[0])+selection.replacement+before.slice(selection.span[1]),after="import {TRANSLATOR_ENTRYPOINTS} from './translator-entrypoints.mjs';\n"+language;
  const run=createRulePipeline([{phase:'language',rules:[{id:'javascript:replace-native-selected-complete-entrypoint-vector',apply:value=>{need(value===before,'whole original join');return language;}}]},{phase:'repository',rules:[{id:'router:share-original-and-source-unit-CLI-packaging',apply:value=>{need(value===language,'whole language join');return after;}}]}]).run(before);
  const stages=transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]).map((row,index)=>({...row,phase:index?'repository':'language'}));need(run.value===after&&stages[0].inverse===before&&stages[1].inverse===language,'complete source substitutions and CST inverses');const current=readFileSync(resolve(root,path),'utf8');need(current===before||current===after,'unknown full current packaging source');files.push({path,before,language,after,current,nativeSelection:selection,stages,trace:run.trace,inverse:before});
 }
 const bindings=verifyNativeCopiedSourceBindingBatch(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));files.forEach((row,index)=>{row.nativeBindings=bindings[index];need(readFileSync(resolve(root,row.path),'utf8')===row.current,'physical packaging source changed');});need(readFileSync(resolve(root,BASE+'complete-originals.json.gz')).equals(packed),'original archive changed');
 return {schema:'source-unit-complete-export-rules-v1',files,originalInputs:data.files,sourceAuthority:false,semanticAuthority:false,existingGateCommandsChanged:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareUnitSyncExports();if(args[0]==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);if(args[0]==='--check')need(plan.files.every(row=>row.current===row.after),'current unit-sync export rules are stale');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),qualified:false}));
}
