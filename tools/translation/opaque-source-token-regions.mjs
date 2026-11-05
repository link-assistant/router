// Source-coordinate projection only; excluded scopes remain in original source.
// This DATA helper supplies no parser, namespace, type or execution permission.
export function opaqueSourceTokenEnds(rows,regions=[]){
 if(!Array.isArray(rows)||rows.length>200000||!Array.isArray(regions)||regions.length>4096)throw new TypeError('Complete bounded opaque source token partition required');if(!regions.length)return new Map();const indices=new Map(rows.map((row,at)=>[row.start,at])),ends=new Map();let previous=-1;
 for(const region of regions){const start=region?.start,end=region?.end,at=indices.get(start);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<previous||end<=start||at===undefined)throw new TypeError('Original ordered disjoint opaque source coordinates required');let next=at;for(;next<rows.length&&rows[next].end<end;next++);if(next===rows.length||rows[next].end!==end)throw new TypeError('Original complete opaque source token boundary required');ends.set(at,next+1);previous=end;}
 return ends;
}
export function outsideOpaqueSourceTokens(rows,regions=[]){const ends=opaqueSourceTokenEnds(rows,regions);if(!ends.size)return rows;const output=[];for(let at=0;at<rows.length;at++){const end=ends.get(at);if(end!==undefined){at=end-1;continue;}output.push(rows[at]);}return output;}
