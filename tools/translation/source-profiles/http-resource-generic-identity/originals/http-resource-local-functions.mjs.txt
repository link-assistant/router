// Per-invocation source proposals only. Callers must check every whole body.
export function orderHttpResourceLocalFunctions(ts,functions,{groups=false}={}){
 const declared=new Map(functions.map(item=>[item.name.text,item])),positions=new Map(functions.map((item,index)=>[item.name.text,index])),edges=new Map();let cells=0;
 for(const item of functions){const calls=new Set();const visit=(node,depth=0)=>{if(++cells>200000||depth>256)throw new TypeError('Complete local caller source census bound');if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&declared.has(node.expression.text))calls.add(node.expression.text);if(ts.isCallExpression(node))for(const argument of node.arguments){let callback=argument,groups=0;while(ts.isParenthesizedExpression(callback)){if(++groups>16)throw new TypeError('Complete callback reference grouping bound');callback=callback.expression;}if(ts.isIdentifier(callback)&&declared.has(callback.text))calls.add(callback.text);}ts.forEachChild(node,child=>visit(child,depth+1));};visit(item.body);edges.set(item.name.text,[...calls]);}
 const indices=new Map(),low=new Map(),stack=[],active=new Set(),ordered=[];let sequence=0;
 function visit(name,depth=0){
  if(depth>64)throw new TypeError('Complete local call graph depth bound');indices.set(name,sequence);low.set(name,sequence++);stack.push(name);active.add(name);
  for(const child of edges.get(name)){if(!indices.has(child)){visit(child,depth+1);low.set(name,Math.min(low.get(name),low.get(child)));}else if(active.has(child))low.set(name,Math.min(low.get(name),indices.get(child)));}
  if(low.get(name)===indices.get(name)){const names=[];let child;do{child=stack.pop();active.delete(child);names.push(child);}while(child!==name);names.sort((left,right)=>positions.get(left)-positions.get(right));ordered.push({items:names.map(name=>declared.get(name)),recursive:names.length>1||edges.get(name).includes(name)});}
 }
 for(const item of functions)if(!indices.has(item.name.text))visit(item.name.text);
 if(groups)return ordered;if(ordered.some(group=>group.recursive))throw new TypeError('Recursive resource helpers require a separate signature/effect rule');return ordered.flatMap(group=>group.items);
}
export function httpResourceLocalContracts(rows){
 const contracts=new Map();let cells=0;
 for(const row of rows){
  const exits=row.flow.resourceExits;if(!Array.isArray(exits)||!exits.length)throw new TypeError('Complete original helper resource exits required');
  const releasedArguments=[];let partial=false;
  for(let index=0;index<row.parameters.length;index++){
   const parameter=row.parameters[index];if(!['receiver-mut','http-client-mut','http-stream-mut'].includes(parameter.type))continue;const states=exits.map(exit=>{if(++cells>200000)throw new TypeError('Complete helper resource exit bound');const actual=exit.filter(state=>state.name===parameter.name);if(actual.length!==1||typeof actual[0].disposed!=='boolean')throw new TypeError('Every original helper resource exit must be complete');return actual[0].disposed;});
   if(states.every(Boolean))releasedArguments.push(index);else if(states.some(Boolean))partial=true;
  }
  const roots=row.flow.returnRoots,rootArguments=roots.map(root=>{const index=row.parameters.findIndex(parameter=>parameter.name===root);if(index<0)throw new TypeError('Every helper returned root must retain its actual input');return index;}),rootArgument=rootArguments.length===1?rootArguments[0]:null;
  contracts.set(row.name,{javascriptName:row.name,rustPath:row.name,args:row.parameters.map(parameter=>parameter.type),ret:row.returns,async:row.lazy,local:true,borrowedResult:roots.length>0,rootArgument,rootArguments,release:null,releasedArguments,localRefusal:partial?'partial helper input release requires an outcome-sensitive source state join':null,sourceAuthority:false,semanticAuthority:false});
 }
 return contracts;
}
