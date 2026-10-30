// Per-invocation source proposals only. Callers must check every whole body.
export function orderHttpResourceLocalFunctions(ts,functions){
 const declared=new Map(functions.map(item=>[item.name.text,item])),edges=new Map();let cells=0;
 for(const item of functions){const calls=new Set();const visit=(node,depth=0)=>{if(++cells>200000||depth>256)throw new TypeError('Complete local caller source census bound');if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&declared.has(node.expression.text))calls.add(node.expression.text);ts.forEachChild(node,child=>visit(child,depth+1));};visit(item.body);edges.set(item.name.text,[...calls]);}
 const active=new Set(),done=new Set(),ordered=[];
 function visit(name,depth=0){if(depth>64)throw new TypeError('Complete local call graph depth bound');if(done.has(name))return;if(active.has(name))throw new TypeError('Recursive resource helpers require a separate signature/effect rule');active.add(name);for(const child of edges.get(name))visit(child,depth+1);active.delete(name);done.add(name);ordered.push(declared.get(name));}
 for(const item of functions)visit(item.name.text);return ordered;
}
export function httpResourceLocalContracts(rows){
 const contracts=new Map();let cells=0;
 for(const row of rows){
  const parameters=new Set(row.parameters.map(parameter=>parameter.name));let releasesInput=false;
  const visit=(value,depth=0)=>{if(++cells>200000||depth>256)throw new TypeError('Complete local helper effect source bound');if(!value||typeof value!=='object')return;if(value.kind==='http-resource-call'&&value.release&&parameters.has(value.args[0]?.name))releasesInput=true;for(const child of Object.values(value))if(child&&typeof child==='object'){if(Array.isArray(child))for(const part of child)visit(part,depth+1);else visit(child,depth+1);}};visit(row.flow);
  const roots=row.flow.returnRoots,rootArgument=roots.length===1?row.parameters.findIndex(parameter=>parameter.name===roots[0]):null;
  contracts.set(row.name,{javascriptName:row.name,rustPath:row.name,args:row.parameters.map(parameter=>parameter.type),ret:row.returns,async:row.lazy,local:true,borrowedResult:roots.length===1,rootArgument,release:null,localRefusal:releasesInput?'local helper releases an input; complete interprocedural release states remain required':roots.length>1?'multiple borrowed helper roots require a complete interprocedural loan join':null,sourceAuthority:false,semanticAuthority:false});
 }
 return contracts;
}
