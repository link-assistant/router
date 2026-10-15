// Shared ownership of ordered declarations and their actual qualified names.
export function checkProgramDeclarationOwners(program,visit){
 let visits=0;
 visit??=()=>{if(++visits>100_000)throw new TypeError('the linked program exceeds its semantic resource limit');};
 const declarations=new Map(program.declarations),orderedDeclarations=new Set();
 const containsOwnedLoop=item=>item?.k==='module'?item.items?.some(containsOwnedLoop):item?.sourceLoop!==undefined;
 function orderedItems(items,path=[]){
  if(!Array.isArray(items))throw new TypeError('a linked module has no ordered items');
  for(const item of items){
   visit();
   if(!item||typeof item.name!=='string'||item.fullName!==[...path,item.name].join('.'))throw new TypeError('the linked ordered item has inconsistent qualified spelling');
   if(item.k==='module'){
    if(containsOwnedLoop(item)&&Object.keys(item).some(field=>!['k','name','fullName','items','span'].includes(field)))throw new TypeError('an owned scalar loop module has an unrecognized namespace field');
    orderedItems(item.items,[...path,item.name]);
   }else{
    if(declarations.get(item.fullName)!==item||orderedDeclarations.has(item))throw new TypeError('the linked ordered items contain a duplicate or unowned declaration');
    if(!Array.isArray(item.modulePath)||item.modulePath.length!==path.length||item.modulePath.some((name,index)=>name!==path[index]))throw new TypeError('the linked declaration has inconsistent module ownership');
    orderedDeclarations.add(item);
   }
  }
 }
 orderedItems(program.items);
 if(orderedDeclarations.size!==declarations.size)throw new TypeError('the linked declaration mapping and ordered items disagree');
 for(const[name,entry]of program.declarations){
  if(!entry||entry.fullName!==name||typeof entry.name!=='string'||!Array.isArray(entry.modulePath))throw new TypeError('the linked declaration mapping is inconsistent');
 }
 return declarations;
}
