// The current untransformed Host entry is source DATA. All24 class definitions
// and their13 fixed source domains retain their original independent checks.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Class birth entry source: '+message);};
export function prepareClassBirthEntrySource({root=fileURLToPath(new URL('../../',import.meta.url))}={}){
 const path='tools/translation/prepare-original-class-birth.mjs',entryPath='tools/translation/extensions/host-contracts.mjs',before=readFileSync(resolve(root,path),'utf8'),entry=readFileSync(resolve(root,entryPath),'utf8');
 const head=execFileSync('/usr/bin/git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',timeout:30000}).trim(),original=execFileSync('/usr/bin/git',['-C',root,'--no-replace-objects','show',head+':'+entryPath],{encoding:'utf8',timeout:30000,maxBuffer:1048576});if(entry!==original||Buffer.byteLength(entry)>262144)fail('complete unchanged current entry must join normal Git');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const file=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete producer grammar');
 const declarations=file.statements.filter(ts.isVariableStatement).flatMap(row=>[...row.declarationList.declarations]).filter(row=>ts.isIdentifier(row.name)&&row.name.text==='INPUTS');if(declarations.length!==1||!declarations[0].initializer||!ts.isArrayLiteralExpression(declarations[0].initializer))fail('unique fixed original input array');
 const initializer=declarations[0].initializer,inputs=JSON.parse(initializer.getText(file)),rows=inputs.filter(row=>row.path===entryPath);if(rows.length!==1||inputs.length!==new Set(inputs.map(row=>row.path)).size)fail('one original fixed Host entry input');
 const prior={...rows[0]},pin={path:entryPath,bytes:Buffer.byteLength(entry),sha256:createHash('sha256').update(entry).digest('hex')};Object.assign(rows[0],pin);const replacement=JSON.stringify(inputs),after=before.slice(0,initializer.getStart(file))+replacement+before.slice(initializer.end);
 if(ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('whole current grammar');
 const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),sequence={languageRules:[{id:'javascript:native-fixed-input-array-entry-selection',edits:[]}],repositoryRules:[{id:'class-birth:current-untransformed-Host-entry-source-pin',edits:[{span:[initializer.getStart(file),initializer.end],expected:initializer.getText(file),replacement}]}]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),beforeMeta=serializeConcreteSyntaxMeta(first.document),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==after)fail('complete source reparse');
 const reverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[],repositoryRules:[{id:'class-birth:complete-entry-source-inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]}]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reverse.value)).source!==before)fail('whole original inverse');
 return {path,before,after,beforeMeta,afterMeta,inverse:before,sequence,trace:run.trace,head,entry:{path:entryPath,source:entry,prior,pin},classDefinitionsChanged:false,registeredClassDomainExpanded:false,sourceInstalled:false,runtimeAuthority:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-class-birth-entry.mjs --emit|--check');const result=prepareClassBirthEntrySource();if(args[0]==='--check'){if(result.before!==result.after)fail('current Host source entry metadata is stale');console.log('Current Host entry metadata joins complete normal Git source; no runtime authority.');}else console.log(JSON.stringify(result));
}
