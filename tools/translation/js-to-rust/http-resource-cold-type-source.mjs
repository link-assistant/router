// Fresh original generic declaration DATA. No declaration or written type grants
// permission to poll an eager operation or bypass complete resource flow.
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
const DECLARATION=new URL('../extensions/filesystem-effects-runtime.d.mts',import.meta.url),ORIGINAL=new URL('../source-profiles/http-resource-cold-return-types/originals/filesystem-effects-runtime.d.mts.txt',import.meta.url);
const fail=message=>{throw new TypeError('Resource original cold-flow type: '+message);};
export function requireHttpResourceColdTypeSource({source,path}={}){
 const original=readFileSync(ORIGINAL,'utf8');if(typeof path!=='string'||typeof source!=='string'||source!==original||readFileSync(DECLARATION,'utf8')!==original)fail('complete actual and original declaration sources must agree');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),functions=file.statements.filter(item=>ts.isFunctionDeclaration(item)&&item.name?.text==='deferFilesystemFlow');
 if(file.parseDiagnostics.length||functions.length!==1)fail('unique complete original native deferred-flow declaration required');const fn=functions[0],slot=fn.typeParameters?.[0],parameter=fn.parameters[0],factory=parameter?.type;
 const named=(node,id)=>ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&node.typeName.text===id&&!node.typeArguments?.length,settled=node=>ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&node.typeName.text==='PromiseLike'&&node.typeArguments?.length===1&&named(node.typeArguments[0],slot.name.text);
 if(fn.typeParameters.length!==1||slot.constraint||slot.default||slot.modifiers?.length||fn.parameters.length!==1||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||!ts.isFunctionTypeNode(factory)||factory.typeParameters?.length||factory.parameters.length||!ts.isUnionTypeNode(factory.type)||factory.type.types.length!==2||!named(factory.type.types[0],slot.name.text)||!settled(factory.type.types[1])||!settled(fn.type))fail('the original generic factory and settled type equations must remain complete');
 if(file.statements.some(item=>item.name?.text==='PromiseLike')||readFileSync(ORIGINAL,'utf8')!==original||readFileSync(DECLARATION,'utf8')!==source)fail('the complete original type boundary changed');
 return {path,source,kind:'original-cold-flow-type-declaration',sourceAuthority:false,semanticAuthority:false,nativeRustGrammarChecked:false,rustExecuted:false};
}
