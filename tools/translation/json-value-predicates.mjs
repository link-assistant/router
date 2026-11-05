// Finite shared ABI DATA only. No source, type, owner or runtime authority.
export const JSON_VALUE_PREDICATES=Object.freeze(['is_null','is_boolean','is_number','is_string','is_array','is_object','is_u64','is_i64','is_f64']);
export const canonicalJsonPredicateMember=name=>typeof name==='string'&&JSON_VALUE_PREDICATES.includes(name);
