// Receiving DATA constructor only. The real original linker still decides
// source custody; this copied pure callback cannot issue any private token.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from '../source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {createUnitMatchesDataArchive} from './unit-matches-data-archive.mjs';
export async function originalUnitMatchesRelocator(t){
 const origin=new URL('../extensions/source-links.mjs',import.meta.url),source=readFileSync(origin,'utf8'),ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);return file;};
 const file=parse(fileURLToPath(origin),source),selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='relocatedSyntax');assert.equal(selected.length,1);
 const fn=selected[0],language=fn.getText(file),after='export '+language+'\n';assert.equal(fn.modifiers?.length??0,0);
 const copy=ts.getSynthesizedDeepClone(fn),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};detach(copy);
 const printed=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printNode(ts.EmitHint.Unspecified,copy,file),shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 assert.deepEqual(shape(parse('detached-relocation.mjs',printed).statements[0]),shape(fn));
 const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]}),run=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[rule(source,language,'javascript:copy-actual-complete-relocation-callback')],repositoryRules:[rule(language,after,'receiving:export-pure-source-relocation-data-constructor')]}),afterMeta=serializeConcreteSyntaxMeta(run.value),reparsed=transportConcreteSyntaxMeta(afterMeta),undo=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:[rule(after,source,'javascript:restore-complete-original-source-linker')],repositoryRules:[]});
 assert.equal(reparsed.source,after);assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source,source);
 const directory=mkdtempSync(join(tmpdir(),'router-unit-relocation-fixture-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'relocation.mjs');parse(path,after);
 const originalBindings=verifyNativeCopiedSourceBindings(ts,fileURLToPath(origin),source),nativeBindings=verifyNativeCopiedSourceBindings(ts,path,after);
 const evidence=createUnitMatchesDataArchive();evidence.retain('actual-source-relocation-fixture',{sourcePath:fileURLToPath(origin),source,span:[fn.getStart(file),fn.end],language,after,detachedCopy:printed,originalBindings,nativeBindings,beforeMeta:first.meta,afterMeta,inverse:source,trace:run.trace,sourceCustodyAuthority:false});evidence.complete();
 writeFileSync(path,after,{flag:'wx'});assert.equal(readFileSync(path,'utf8'),after);return (await import(pathToFileURL(path).href)).relocatedSyntax;
}
