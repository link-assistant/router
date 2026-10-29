// Eligibility DATA only; a selected family never substitutes for complete private source/callee checks.
// Complete existing native source reader copied as array-result eligibility.
// The full independent insertion checker still owns source/types/ABI/ownership;
// an array spelling, public selector result or preserved CST grants no authority.
import {ownedPlainData} from './owned-vector-candidate-source.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './vendor/module-syntax.mjs';
import {ownedParenthesizedType} from './owned-type-parentheses.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Primitive vector definition routing: '+message);};
export function receivingPrimitiveValueDefinitionFamily(request){
 const input=ownedPlainData(request),authority=Object.hasOwn(input,"javascript")?"javascript":"typescript",source=input[authority],path=authority==="javascript"?input.sourcePath:input.typescriptPath;
 if(typeof source!=="string"||Buffer.byteLength(source)>8388608||typeof path!=="string")fail("actual bounded requested receiving source/path required");
 const language=authority==="javascript"?"JavaScript":"TypeScript";
 const concrete=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete actual receiving spelling CST differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,authority==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('actual receiving spelling syntax required');if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original installed compiler source changed');let result=false;
 function vector(type){type=ownedParenthesizedType(ts,type);if(type&&ts.isTypeOperatorNode(type)&&type.operator===ts.SyntaxKind.ReadonlyKeyword)type=ownedParenthesizedType(ts,type.type);return !!type&&ts.isArrayTypeNode(type);}
 function arrayBody(body){let work=0,found=false;function visit(node,depth=0){if(++work>100000||depth>160)fail('bounded actual vector eligibility body');if(node!==body&&(ts.isFunctionLike(node)||ts.isClassLike(node)))return;if(ts.isArrayLiteralExpression(node))found=true;ts.forEachChild(node,child=>visit(child,depth+1));}visit(body);return found;}
 for(const node of file.statements)if(ts.isFunctionDeclaration(node)&&node.name&&(vector(node.type??ts.getJSDocReturnType(node))||node.body&&arrayBody(node.body)))result=true;
 if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('actual compiler source changed during eligibility read');

 if(result)return 'vector';
 const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name&&node.body),units=new Set();let cells=0,called=false;
 if(functions.length>4096)fail('bounded complete source function census required');
 for(const node of functions){const result=ownedParenthesizedType(ts,node.type??ts.getJSDocReturnType(node));if(result?.kind===ts.SyntaxKind.VoidKeyword||result==null&&primitiveUnitReturnSyntax(ts,node.body))units.add(node.name.text);}
 function calls(node,body,depth=0){if(++cells>100000||depth>160)fail('bounded complete source unit-call census required');if(node!==body&&(ts.isFunctionLike(node)||ts.isClassLike(node)))return;if(ts.isCallExpression(node)&&!node.questionDotToken&&ts.isIdentifier(node.expression)&&units.has(node.expression.text))called=true;ts.forEachChild(node,child=>calls(child,body,depth+1));}
 try{for(const node of functions)calls(node.body,node.body);if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('actual compiler changed during unit-call routing');return called?'unit-call':'scalar';}finally{units.clear();}
}

import {primitiveUnitReturnSyntax} from './owned-unit-return-syntax.mjs';
