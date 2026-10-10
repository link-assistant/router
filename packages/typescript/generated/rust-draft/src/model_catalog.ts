// Generated draft from src/model_catalog.rs; sha256=2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5
// Carried constructs are data, never runtime parity evidence.
function MAX_CATALOG_PAGES() {
  return 100n;
}

function PERSISTED_CATALOG_VERSION() {
  return 1n;
}

function PERSISTED_CATALOG_FILE() {
  return "model-catalogs.json";
}

function CATALOG_INVALIDATION_DIR() {
  return "model-catalog-invalidations";
}

export const translated: { "MAX_CATALOG_PAGES": bigint; "PERSISTED_CATALOG_VERSION": bigint; "PERSISTED_CATALOG_FILE": string; "CATALOG_INVALIDATION_DIR": string } = { "MAX_CATALOG_PAGES": MAX_CATALOG_PAGES(), "PERSISTED_CATALOG_VERSION": PERSISTED_CATALOG_VERSION(), "PERSISTED_CATALOG_FILE": PERSISTED_CATALOG_FILE(), "CATALOG_INVALIDATION_DIR": CATALOG_INVALIDATION_DIR() };
export const provenance = {"sourcePath":"src/model_catalog.rs","sourceSha256":"2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5","executable":4,"carried":40,"preserved":45,"runtimeParity":false};
