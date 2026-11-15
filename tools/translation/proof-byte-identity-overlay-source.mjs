// Native-selected SOURCE DATA edits. Complete closure members may be unchanged.
// Callers retain their serialized/reparsed CST phases and independent inverses.
import {resolve} from 'node:path';

const fail=message=>{throw TypeError('Proof byte identity overlay source: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one actual '+label+' required');return rows[0];};
const nodes=(ts,root,predicate)=>{const rows=[];function visit(node){if(predicate(node))rows.push(node);ts.forEachChild(node,visit);}visit(root);return rows;};
const namedFunction=(ts,file,name)=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name+' function');
const property=(ts,node,name)=>ts.isPropertyAccessExpression(node)&&node.name.text===name;
const edit=(file,node,replacement)=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
function checkerFor(ts,file){
 const path=resolve(file.fileName),host={getSourceFile:name=>name===path?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===path,readFile:name=>name===path?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 return ts.createProgram([path],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
}
function local(ts,checker,node,declaration){return ts.isIdentifier(node)&&!!checker.getSymbolAtLocation(declaration)&&checker.getSymbolAtLocation(node)===checker.getSymbolAtLocation(declaration);}

export function proofByteIdentityOverlaySupportEdits(ts,file){
 const checker=checkerFor(ts,file),selected=namedFunction(ts,file,'selected'),packet=namedFunction(ts,file,'wholeOwnerProofByteTrialFilePacket');
 const overlays=one(selected.parameters.filter(node=>ts.isIdentifier(node.name)&&node.name.text==='overlays'),'selected overlays parameter').name;
 const codec=one(file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>ts.isIdentifier(node.name)&&node.name.text==='CODEC'),'codec constant');
 if(!ts.isStringLiteral(codec.initializer)||codec.initializer.text!=='tools/translation/builtin-source-meta.mjs')fail('original codec source boundary differs');
 const some=one(nodes(ts,selected,node=>ts.isCallExpression(node)&&property(ts,node.expression,'some')&&local(ts,checker,node.expression.expression,overlays)),'complete overlay predicate');
 const arrow=one([...some.arguments].filter(ts.isArrowFunction),'overlay arrow predicate'),row=one([...arrow.parameters],'overlay row parameter').name;
 if(!ts.isIdentifier(row)||row.text!=='row')fail('original overlay row binding required');
 const equality=one(nodes(ts,arrow.body,node=>ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&property(ts,node.left,'original')&&property(ts,node.right,'candidate')&&local(ts,checker,node.left.expression,row)&&local(ts,checker,node.right.expression,row)),'complete overlay identity comparison');
 // The new CODEC reference must resolve to the existing top-level binding.
 if(checker.getSymbolsInScope(equality,ts.SymbolFlags.Value).find(symbol=>symbol.name==='CODEC')!==checker.getSymbolAtLocation(codec.name))fail('codec reference would be captured');
 const original=one(packet.parameters.filter(node=>ts.isIdentifier(node.name)&&node.name.text==='original'),'original source parameter').name,trial=one(packet.parameters.filter(node=>ts.isIdentifier(node.name)&&node.name.text==='trial'),'trial source parameter').name;
 const conditional=one(nodes(ts,packet,node=>ts.isConditionalExpression(node)&&ts.isIdentifier(node.condition)&&node.condition.text==='row'&&ts.isBinaryExpression(node.whenTrue)),'selected physical overlay condition');
 const equals=one(nodes(ts,conditional.whenTrue,node=>ts.isCallExpression(node)&&property(ts,node.expression,'equals')&&local(ts,checker,node.expression.expression,original)&&node.arguments.length===1&&local(ts,checker,node.arguments[0],trial)),'redundant physical identity refusal');
 const binary=equals.parent;
 if(!ts.isBinaryExpression(binary)||binary.operatorToken.kind!==ts.SyntaxKind.BarBarToken||binary.right!==equals||binary.left.getText(file)!=='!original.equals(Buffer.from(row.original))')fail('exact original and proposed source checks required');
 return {changes:[edit(file,equality,'(row.path===CODEC&&'+equality.getText(file)+')'),edit(file,binary,binary.left.getText(file))],selection:{completeClosureRequired:true,codecMustChange:true,unchangedMembersAllowed:true,originalAndCandidateByteJoinsRetained:true,nativeLexicalSymbolsChecked:true,sourceAuthority:false,runtimeAuthority:false}};
}

export function proofByteIdentityOverlayHarnessEdits(ts,file){
 const checker=checkerFor(ts,file),entry=namedFunction(ts,file,'verifyCanonicalDeriveTrial');
 const declarations=entry.body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]);
 const declaration=name=>one(declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name),name+' local');
 const proposal=declaration('proposal').name,substitutions=declaration('substitutions').name;
 const comparison=one(nodes(ts,entry,node=>ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken&&local(ts,checker,node.left,substitutions)&&property(ts,node.right,'length')&&property(ts,node.right.expression,'overlays')&&local(ts,checker,node.right.expression.expression,proposal)),'complete physical substitution count');
 return {changes:[edit(file,comparison.right,'proposal.overlays.filter(overlay=>overlay.original!==overlay.candidate).length')],selection:{completeClosureRequired:true,countChangedPhysicalMembers:true,allPhysicalByteChecksRetained:true,nativeLexicalSymbolsChecked:true,sourceAuthority:false,runtimeAuthority:false}};
}
