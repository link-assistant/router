// Structural DATA only. Full original source flow independently checks tags.
export function httpResourceOption(type){
 if(type==='option-text')return {value:'text-owned'};
 return typeof type==='string'&&type.startsWith('optional:')?{value:type.slice(9)}:null;
}
