// Quote replacement data for the original exact String-substitution contract.
import {exactSubstitutionRule} from './rule-pipeline.mjs';
export function exactLiteralSubstitutionRule(id,before,after,message){
 const original=exactSubstitutionRule(id,before,after,message);
 return after.includes('$')?exactSubstitutionRule(id,before,after.split('$').join('$$'),message):original;
}
