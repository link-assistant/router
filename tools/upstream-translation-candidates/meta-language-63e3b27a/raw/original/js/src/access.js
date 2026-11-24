import { ParseConfiguration } from './primitives.js';
import { LinkNetwork } from './network.js';

const READ_ONLY_DIAGNOSTIC =
  'engine is configured read-only; mutation is rejected. ' +
  'Re-parse with AccessMode.Mutable or fork an editable copy via ' +
  'ReadOnlyNetwork.toMutable before mutating.';

// Mutating methods on LinkNetwork that must be rejected by a read-only view.
const MUTATION_METHODS = Object.freeze([
  'insertLink',
  'insertLinkWithOptionalId',
  'insertDynamicLink',
  'insertTypedPoint',
  'insertPoint',
  'insertObject',
  'insertField',
  'insertRelation',
  'insertSourceToken',
  'insertSyntaxNode',
  'insertConceptExpression',
  'deleteLink',
  'setSpan',
  'setFlags',
  'setTerm',
  'replace',
  'applySubstitution',
  'applyLinkCliSubstitutionText',
]);

// Non-mutating methods on LinkNetwork delegated by a read-only view.
const READ_METHODS = Object.freeze([
  'link',
  'links',
  'len',
  'findTerm',
  'queryLinks',
  'find',
  'toLino',
  'snapshot',
  'verifyFullMatch',
  'reconstructText',
  'renderSource',
  'reconstructTextAsWithRules',
  'capturedText',
]);

/**
 * Access mode mirroring the Rust `configuration::AccessMode` enum.
 *
 * Values match the existing `ParseConfiguration.accessMode` convention
 * (`'mutable'`) and the Rust `AccessMode::label()` strings.
 */
export const AccessMode = Object.freeze({
  Mutable: 'mutable',
  ReadOnly: 'read-only',
});

/**
 * Whether the access mode permits mutation.
 */
export function accessModeIsMutable(mode) {
  return mode === AccessMode.Mutable;
}

/**
 * Whether the access mode forbids mutation.
 */
export function accessModeIsReadOnly(mode) {
  return mode === AccessMode.ReadOnly;
}

/**
 * Human-readable access-mode name, mirroring Rust `AccessMode::label`.
 */
export function accessModeLabel(mode) {
  return mode;
}

/**
 * Error raised when a mutation is attempted through a read-only engine handle.
 *
 * Mirrors Rust's `ReadOnlyViolation`.
 */
export class ReadOnlyViolation extends Error {
  constructor(message = READ_ONLY_DIAGNOSTIC) {
    super(message);
    this.name = 'ReadOnlyViolation';
  }

  toString() {
    return this.message;
  }
}

/**
 * Read-only view over a links network.
 *
 * In Rust this is a compile-time guarantee backed by `Arc<LinkNetwork>` with no
 * `DerefMut`. JavaScript has no borrow checker or `Arc`, so the read-only
 * contract is enforced at runtime: read methods are delegated to the wrapped
 * network and every mutator throws {@link ReadOnlyViolation}.
 */
export class ReadOnlyNetwork {
  /**
   * Freezes a network into a read-only view.
   */
  constructor(network) {
    if (!(network instanceof LinkNetwork)) {
      throw new TypeError('ReadOnlyNetwork requires a LinkNetwork');
    }
    this._network = network;
  }

  static new(network) {
    return new ReadOnlyNetwork(network);
  }

  /**
   * Wraps an already shared network as a read-only view. JS has no `Arc`, so
   * this simply references the same network instance.
   */
  static fromShared(network) {
    return new ReadOnlyNetwork(network);
  }

  static from_shared(network) {
    return ReadOnlyNetwork.fromShared(network);
  }

  static from(network) {
    return new ReadOnlyNetwork(network);
  }

  /**
   * Borrows the underlying immutable network.
   */
  network() {
    return this._network;
  }

  /**
   * Borrows the shared network handle. JS has no `Arc`; this returns the same
   * network instance the view references.
   */
  shared() {
    return this._network;
  }

  /**
   * Returns the shared network handle. JS has no `Arc`; this returns the same
   * network instance the view references.
   */
  intoShared() {
    return this._network;
  }

  into_shared() {
    return this.intoShared();
  }

  /**
   * Number of handles sharing the frozen network. JS lacks reference counting,
   * so this is always 1 for a live view.
   */
  sharedCount() {
    return 1;
  }

  shared_count() {
    return this.sharedCount();
  }

  /**
   * Forks an editable clone so callers can return to a mutable engine.
   */
  toMutable() {
    return this._network.clone();
  }

  to_mutable() {
    return this.toMutable();
  }

  /**
   * Returns an editable network. JS has no `Arc::try_unwrap`, so this always
   * clones to avoid aliasing the frozen view's network.
   */
  intoMutable() {
    return this._network.clone();
  }

  into_mutable() {
    return this.intoMutable();
  }

  /**
   * Structural equality with another read-only view.
   */
  equals(other) {
    if (!(other instanceof ReadOnlyNetwork)) {
      return false;
    }
    return this._network.toLino() === other._network.toLino();
  }
}

// Delegate read-only operations to the wrapped network.
for (const method of READ_METHODS) {
  ReadOnlyNetwork.prototype[method] = function delegate(...args) {
    return this._network[method](...args);
  };
}

// Reject mutators with a ReadOnlyViolation.
for (const method of MUTATION_METHODS) {
  ReadOnlyNetwork.prototype[method] = function reject() {
    throw new ReadOnlyViolation();
  };
}

/**
 * Access-mode-aware engine handle returned by configured parsing.
 *
 * Mirrors Rust's `EngineNetwork` enum (`Mutable | ReadOnly`). The variant is
 * tracked by the access mode of the wrapped value.
 */
export class EngineNetwork {
  constructor(mode, value) {
    this._mode = mode;
    this._value = value;
  }

  /**
   * Wraps a network according to the supplied access mode.
   */
  static withAccessMode(network, accessMode = AccessMode.Mutable) {
    if (accessModeIsReadOnly(accessMode)) {
      return new EngineNetwork(AccessMode.ReadOnly, freeze(network));
    }
    return new EngineNetwork(AccessMode.Mutable, network);
  }

  static with_access_mode(network, accessMode) {
    return EngineNetwork.withAccessMode(network, accessMode);
  }

  /**
   * Constructs a mutable engine handle.
   */
  static mutable(network) {
    return new EngineNetwork(AccessMode.Mutable, network);
  }

  /**
   * Constructs a read-only engine handle, freezing the value if needed.
   */
  static readOnly(view) {
    const frozen = view instanceof ReadOnlyNetwork ? view : freeze(view);
    return new EngineNetwork(AccessMode.ReadOnly, frozen);
  }

  static read_only(view) {
    return EngineNetwork.readOnly(view);
  }

  /**
   * The access mode this handle was created with.
   */
  accessMode() {
    return this._mode;
  }

  access_mode() {
    return this.accessMode();
  }

  /**
   * Whether this handle permits mutation.
   */
  isMutable() {
    return this._mode === AccessMode.Mutable;
  }

  is_mutable() {
    return this.isMutable();
  }

  /**
   * Whether this handle is read-only.
   */
  isReadOnly() {
    return this._mode === AccessMode.ReadOnly;
  }

  is_read_only() {
    return this.isReadOnly();
  }

  /**
   * Borrows the underlying network for read-only operations regardless of the
   * access mode.
   */
  network() {
    return this.isReadOnly() ? this._value.network() : this._value;
  }

  /**
   * Returns the mutable network, or throws {@link ReadOnlyViolation} when the
   * engine is read-only. This mirrors Rust's `as_mutable` returning a `Result`.
   */
  asMutable() {
    if (this.isReadOnly()) {
      throw new ReadOnlyViolation();
    }
    return this._value;
  }

  as_mutable() {
    return this.asMutable();
  }

  /**
   * Converts this handle into a read-only view, freezing a mutable network.
   */
  intoReadOnly() {
    return this.isReadOnly() ? this._value : freeze(this._value);
  }

  into_read_only() {
    return this.intoReadOnly();
  }

  /**
   * Converts this handle into an editable network, forking a read-only view.
   */
  intoMutable() {
    return this.isReadOnly() ? this._value.intoMutable() : this._value;
  }

  into_mutable() {
    return this.intoMutable();
  }
}

/**
 * Freezes a network into a read-only view, mirroring `LinkNetwork::freeze`.
 */
export function freeze(network) {
  return new ReadOnlyNetwork(network);
}

/**
 * Returns a read-only view sharing a clone of the network, mirroring
 * `LinkNetwork::as_read_only`.
 */
export function asReadOnly(network) {
  return new ReadOnlyNetwork(network.clone());
}

export function as_read_only(network) {
  return asReadOnly(network);
}

/**
 * Parses source text honouring the configured engine access mode, mirroring
 * `LinkNetwork::parse_engine`.
 */
export function parseEngine(text, language, configuration = ParseConfiguration.default()) {
  const network = LinkNetwork.parse(text, language, configuration);
  return EngineNetwork.withAccessMode(network, configuration.accessMode);
}

export function parse_engine(text, language, configuration) {
  return parseEngine(text, language, configuration);
}
