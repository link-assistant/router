// Emission consumes only a freshly reissued complete checked source program.
export function emitOwnedCountedFor(statement,{rust,expr,body,indent,rustName}){
 const pad=' '.repeat(indent),name=rust?rustName(statement.name):statement.name;
 const head=statement.reverse?(rust?'for '+name+' in ('+expr(statement.start)+'..='+expr(statement.end)+').rev()':'for (let '+name+' = '+expr(statement.end)+'; '+name+' >= '+expr(statement.start)+'; '+name+' -= 1n)'):(rust?'for '+name+' in '+expr(statement.start)+'..'+expr(statement.end):'for (let '+name+' = '+expr(statement.start)+'; '+name+' < '+expr(statement.end)+'; '+name+' += 1n)');
 return pad+head+' {\n'+body(statement.body,indent+4)+'\n'+pad+'}';
}
