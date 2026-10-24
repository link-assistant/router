// Graph/source DATA only. Only the original complete source checker issues IR.
import {isDeepStrictEqual} from 'node:util';
const fail=message=>{throw new TypeError('Owned local function calls: '+message);};
export function checkOwnedLocalFunctions(analysis,functions,check){
 const {ts,checker,file}=analysis,bySymbol=new Map(),byDeclaration=new Map(),dependencies=new Map(),state=new Map(),checked=new Map(),errors=new Map();
 if(functions.length>4096)fail('complete original module function bound exceeded');
 for(const declaration of functions){const symbol=declaration.name&&checker.getSymbolAtLocation(declaration.name);if(!symbol||bySymbol.has(symbol))fail('unique actual native function bindings required');bySymbol.set(symbol,declaration);byDeclaration.set(declaration,symbol);}
 let total=0;for(const declaration of functions){const edges=new Set();let cells=0;const visit=(node,depth=0)=>{if(++cells>100000||++total>2000000||depth>160)fail('complete native call-graph source bound exceeded');if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){const target=bySymbol.get(checker.getSymbolAtLocation(node.expression));if(target)edges.add(target);}ts.forEachChild(node,child=>visit(child,depth+1));};visit(declaration);dependencies.set(declaration,edges);}
 function visit(declaration,depth=0){
  if(depth>160)fail('original local call depth bound exceeded');if(state.get(declaration)==='checked')return checked.get(byDeclaration.get(declaration));if(state.get(declaration)==='active')fail('recursive native call component needs a separate declared recursive profile');state.set(declaration,'active');
  try{for(const dependency of dependencies.get(declaration)){visit(dependency,depth+1);if(errors.has(dependency))fail('called original function remains unsupported: '+dependency.name.text);}analysis.localFunctions=checked;const item=check(declaration);checked.set(byDeclaration.get(declaration),item);return item;}
  catch(error){if(!(error instanceof TypeError))throw error;errors.set(declaration,error);return null;}
  finally{state.set(declaration,'checked');}
 }
 for(const declaration of functions)visit(declaration);
 return functions.map(declaration=>({declaration,item:checked.get(byDeclaration.get(declaration))??null,error:errors.get(declaration)??null,span:[declaration.getStart(file),declaration.end]}));
}
/** This checks closure membership after fresh original per-item checking. */
export function requireOwnedLocalCallClosure(program){
 const byName=new Map();for(const item of program){if(byName.has(item.name))fail('duplicate checked function');byName.set(item.name,item);}const edges=new Map();
 for(const item of program){const calls=new Set();let cells=0;const visit=(value,depth=0)=>{
  if(++cells>100000||depth>160)fail('complete checked call-closure bound exceeded');if(!value||typeof value!=='object')return;
  if(value.kind==='local-call'){const target=byName.get(value.name);if(!target||target.javascript!==value.javascript||target.source.path!==value.sourcePath||target.source.path!==item.source.path||target.source.source!==item.source.source||!isDeepStrictEqual(target.source.span,value.calleeSpan)||!isDeepStrictEqual(target.params.map(row=>row.type),value.parameters)||target.returns!==value.type)fail('complete actual checked callee is missing or differs');calls.add(target.name);}
  for(const [key,child]of Object.entries(value))if(!['source','pairedSource','hostCalls','localCalls','span','calleeSpan'].includes(key))visit(child,depth+1);
 };visit(item.body);edges.set(item.name,calls);}
 const state=new Map();function visit(name,depth=0){if(depth>160)fail('checked call depth bound exceeded');if(state.get(name)==='active')fail('recursive checked local component is outside this profile');if(state.get(name)==='checked')return;state.set(name,'active');for(const target of edges.get(name))visit(target,depth+1);state.set(name,'checked');}for(const name of edges.keys())visit(name);return program;
}
export function emitOwnedLocalCall(value,{rust,expr,rustName}){
 const arguments_=value.args.map((argument,index)=>{
  if(!rust)return expr(argument);const parameter=value.parameters[index],borrow=parameter==='json-ref'&&argument.type==='json'||parameter==='json-list-ref'&&argument.type==='json-list-owned'||parameter==='str'&&argument.type==='text-owned';return borrow?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument);
 });return (rust?rustName(value.name):value.javascript)+'('+arguments_.join(', ')+')';
}
