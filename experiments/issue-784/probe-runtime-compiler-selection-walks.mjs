// Finite whole pinned-compiler diagnostic; this is not the original case clock.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {proposeRuntimeCompilerSelections} from '../../tools/translation/prepare-runtime-compiler-selections.mjs';
const ts=ownershipCompiler(),root=new URL('../../',import.meta.url),path='tools/translation/prepare-owned-runtime-import-edges.mjs';
const before=readFileSync(new URL(path,root),'utf8'),proposal=proposeRuntimeCompilerSelections(ts,path,before);
const require=createRequire(new URL('js/package.json',root)),compiler=require.resolve('typescript'),source=readFileSync(compiler,'utf8');
assert.equal(Buffer.byteLength(source),9112572);
assert.equal(createHash('sha256').update(source).digest('hex'),'3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675');
const select=(text,name)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(nodes.length,1);return nodes[0].getText(file);};
const fail=message=>{throw TypeError(message);},one=(rows,label)=>{assert.equal(rows.length,1,label);return rows[0];};
const names=['createSourceFile','parseSourceFileWorker','fixupParentReferences','setParentRecursive','setParent','forEachChild','forEachChildRecursively','gatherPossibleChildren','isJSDocNode','hasJSDocNodes'];
const original=Function('one','fail','names',select(before,'find')+'\nconst lazy='+select(before,'nativeLazyAssertions')+`;return (ts,file)=>{
 const value=lazy(ts,file),nodes=names.map(name=>one(find(ts,file,node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name));
 nodes.push(one(find(ts,file,node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='forEachChildTable'),'table'));
 return {lazy:value,tail:nodes.map(node=>({source:node.getText(file),span:[node.getStart(file),node.end]}))};
};`)(one,fail,names);
const current=Function('one','fail','names',select(proposal.after,'find')+'\n'+select(proposal.after,'nativeCompilerSelections')+'\nconst lazy='+select(proposal.after,'nativeLazyAssertions')+`;return (ts,file)=>{
 const index=nativeCompilerSelections(ts,file),value=lazy(ts,file,index),nodes=names.map(name=>one(index.functions.get(name)??[],name));
 nodes.push(one(index.childTables,'table'));
 return {lazy:value,tail:nodes.map(node=>({source:node.getText(file),span:[node.getStart(file),node.end]}))};
};`)(one,fail,names);
const observations=[];
let expected;
for(const [name,run]of [['original',original],['indexed',current]]){
 let visits=0;const observed={...ts,forEachChild(node,visitor){visits++;return ts.forEachChild(node,visitor);}};
 const file=ts.createSourceFile(compiler,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),start=performance.now(),value=run(observed,file);
 observations.push({name,visits,milliseconds:performance.now()-start});
 if(name==='original')expected=value;else assert.deepEqual(value,expected);
}
console.log(JSON.stringify({schema:'finite-native-compiler-walk-comparison-v1',observations,completeLazyAndParentMetadataEqual:true,freshCompilerParsePerAlternative:true,productionDeadlineQualified:false,runtimeParity:false}));
