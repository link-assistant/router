// Worked-example concepts shared with Rust's `concept_ontology.rs`.
import { LinkType } from './primitives.js';
export { createConceptViews, readConceptOntology, readConceptTaxonomy } from './concept-views.js';

export const STATEHOOD_PROPOSITION_SYNTAX = Object.freeze([
  ['English', 'Hawaii is a state.'],
  ['en', 'Hawaii is a state.'],
  ['Russian', 'Гавайи это штат.'],
  ['ru', 'Гавайи это штат.'],
]);

export const HAWAII_ENTITY_SYNTAX = Object.freeze([
  ['English', 'Hawaii'],
  ['en', 'Hawaii'],
  ['Russian', 'Гавайи'],
  ['ru', 'Гавайи'],
]);

export const UNITED_STATES_STATE_SYNTAX = Object.freeze([
  ['English', 'state'],
  ['en', 'state'],
  ['Russian', 'штат'],
  ['ru', 'штат'],
]);

/**
 * Seeds the statehood proposition connecting Hawaii (Q782) to U.S. state
 * (Q35657) and returns the three concept link ids.
 */
export function seedStatehoodWorkedExample(network) {
  const proposition = network.insertTypedPoint(
    LinkType.Concept,
    'statehood',
    'Statehood proposition connecting Hawaii (Q782) to U.S. state (Q35657).',
  );
  const subject = network.insertTypedPoint(
    LinkType.Concept,
    'Q782',
    'Wikidata Q782; Hawaii; state of the United States.',
  );
  const object = network.insertTypedPoint(
    LinkType.Concept,
    'Q35657',
    'Wikidata Q35657; state of the United States.',
  );

  for (const [language, syntax] of STATEHOOD_PROPOSITION_SYNTAX) {
    network._insertConceptSyntaxMapping(proposition, 'statehood', language, syntax, true);
  }
  for (const [language, syntax] of HAWAII_ENTITY_SYNTAX) {
    network._insertConceptSyntaxMapping(subject, 'Q782', language, syntax, true);
  }
  for (const [language, syntax] of UNITED_STATES_STATE_SYNTAX) {
    network._insertConceptSyntaxMapping(object, 'Q35657', language, syntax, true);
  }

  return { proposition, subject, object };
}
