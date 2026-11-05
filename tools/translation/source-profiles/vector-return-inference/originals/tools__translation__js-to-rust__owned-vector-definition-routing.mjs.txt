// Complete existing native source reader copied as array-result eligibility.
// The full independent insertion checker still owns source/types/ABI/ownership;
// an array spelling, public selector result or preserved CST grants no authority.
import {ownedPlainData} from './owned-vector-candidate-source.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './vendor/module-syntax.mjs';
import {ownedParenthesizedType} from './owned-type-parentheses.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Primitive vector definition routing: '+message);};
export function receivingPrimitiveVectorDefinitionsRequested(request){
 const input=ownedPlainData(request),authority=Object.hasOwn(input,"javascript")?"javascript":"typescript",source=input[authority],path=authority==="javascript"?input.sourcePath:input.typescriptPath;
 if(typeof source!=="string"||Buffer.byteLength(source)>8388608||typeof path!=="string")fail("actual bounded requested receiving source/path required");
 const language=authority==="javascript"?"JavaScript":"TypeScript";
 const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete actual receiving spelling CST differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,authority==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('actual receiving spelling syntax required');if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original installed compiler source changed');let result=false;
 function vector(type){type=ownedParenthesizedType(ts,type);if(type&&ts.isTypeOperatorNode(type)&&type.operator===ts.SyntaxKind.ReadonlyKeyword)type=ownedParenthesizedType(ts,type.type);return !!type&&ts.isArrayTypeNode(type);}
 for(const node of file.statements)if(ts.isFunctionDeclaration(node)&&node.name&&vector(node.type??ts.getJSDocReturnType(node)))result=true;
 if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('actual compiler source changed during eligibility read');

 return result;
}
