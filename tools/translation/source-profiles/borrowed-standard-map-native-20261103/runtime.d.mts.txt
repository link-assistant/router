/** Static literal predicate over the standard map abstraction. */
export declare const BORROWED_MAP_LITERAL_LIMIT: 64;
/** Translation requires genuine standard library type/source ownership.
 * No whole-container validation, loan, entry cap or value-byte cap is supplied.
 */
export declare function router_borrowed_text_map_matches_literals(
  map: ReadonlyMap<string, string>, key: string, literals: readonly string[],
): boolean;
