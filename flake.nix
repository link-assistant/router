{
  description = "Link.Assistant.Router — Claude MAX OAuth proxy and token gateway for Anthropic APIs";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Nixpkgs stopped supporting Intel macOS after the 26.05 release.
    nixpkgs-darwin-intel.url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-darwin-intel, rust-overlay }:
    let
      # The platforms Nix support is claimed for. Everything below is derived
      # per system so a single definition serves all of them.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      intelMac = "x86_64-darwin";
      isIntelMac = pkgs: pkgs.stdenv.hostPlatform.system == intelMac;

      forEachSystem = f:
        nixpkgs.lib.genAttrs systems (system:
          let
            packages = if system == intelMac then nixpkgs-darwin-intel else nixpkgs;
          in f (import packages {
            inherit system;
            overlays = [ rust-overlay.overlays.default ];
          }));

      cargoToml = builtins.fromTOML (builtins.readFile ./rust/Cargo.toml);
      rustToolchain = pkgs: pkgs.rust-bin.stable.${cargoToml.package.rust-version}.default.override {
        extensions = [ "rust-src" ];
      };

      # Only the inputs the Rust build actually reads. Keeping the source
      # filtered this way means editing docs or CI configuration does not
      # invalidate the build.
      packageFiles = nixpkgs.lib.fileset.unions [
        ./Cargo.toml
        ./Cargo.lock
        # View the crate's copy of the shared assets under ./rust.
        ./rust
        ./README.md
      ];
      src = nixpkgs.lib.fileset.toSource {
        root = ./.;
        fileset = packageFiles;
      };
      formatSrc = nixpkgs.lib.fileset.toSource {
        root = ./.;
        fileset = nixpkgs.lib.fileset.unions [
          packageFiles
          # Cargo fmt follows the test crate's explicit paths to Rust fixtures.
          (nixpkgs.lib.fileset.fileFilter (file: file.hasExt "rs") ./tools/translation)
        ];
      };

      # The current Nixpkgs Cargo hook selects packaged AWS-LC and Zstandard.
      # The Intel macOS channel still carries AWS-LC 1.x, so on that platform
      # aws-lc-sys builds the compatible bundled library with CMake.
      nativeDeps = pkgs: {
        nativeBuildInputs = [
          pkgs.pkg-config
          pkgs.cmake
          pkgs.perl
          pkgs.rustPlatform.bindgenHook
        ];
        buildInputs = [ pkgs.zstd ] ++ pkgs.lib.optional (!isIntelMac pkgs) pkgs.aws-lc;
      };

      routerPackage = pkgs:
        let
          deps = nativeDeps pkgs;
          toolchain = rustToolchain pkgs;
          platform = pkgs.makeRustPlatform { cargo = toolchain; rustc = toolchain; };
        in platform.buildRustPackage {
          pname = "link-assistant-router";
          inherit (cargoToml.package) version;
          inherit src;

          cargoLock.lockFile = ./Cargo.lock;

          inherit (deps) nativeBuildInputs buildInputs;
          env = pkgs.lib.optionalAttrs (isIntelMac pkgs) {
            AWS_LC_SYS_CMAKE_BUILDER = "1";
          };

          # The test suite starts servers, binds ports and reaches out to real
          # Anthropic endpoints, none of which work in the Nix sandbox. Tests
          # stay a `cargo test` (and CI) concern; `nix build` is the packaging
          # path. `nix flake check` runs the checks below instead.
          doCheck = false;

          meta = with pkgs.lib; {
            inherit (cargoToml.package) description;
            homepage = cargoToml.package.repository;
            license = licenses.unlicense;
            mainProgram = "router";
            platforms = systems;
          };
        };
    in
    {
      packages = forEachSystem (pkgs: rec {
        link-assistant-router = routerPackage pkgs;
        default = link-assistant-router;
      });

      apps = forEachSystem (pkgs: rec {
        router = {
          type = "app";
          program = "${nixpkgs.lib.getExe (routerPackage pkgs)}";
          meta.description = "Run the Router CLI";
        };
        with-router = {
          type = "app";
          program = "${routerPackage pkgs}/bin/with-router";
          meta.description = "Run a command with Router in front of it";
        };
        default = router;
      });

      devShells = forEachSystem (pkgs:
        let
          deps = nativeDeps pkgs;
          toolchain = rustToolchain pkgs;
        in {
          default = pkgs.mkShell {
            nativeBuildInputs = deps.nativeBuildInputs ++ [
              toolchain
              pkgs.rust-analyzer
              # The admin UI bundle in ui/dist is rebuilt with these.
              pkgs.nodejs_26
              pkgs.git
            ];
            inherit (deps) buildInputs;

            RUST_SRC_PATH = "${toolchain}/lib/rustlib/src/rust/library";

            shellHook = ''
              echo "Router dev shell — rustc $(rustc --version | cut -d' ' -f2) (MSRV ${cargoToml.package.rust-version})"
            '';
          };
        });

      checks = forEachSystem (pkgs:
        let package = routerPackage pkgs;
        in {
          inherit package;
          default = package;

          # Cheap, sandbox-safe repetition of the project's own formatting
          # gate. The heavier gates (clippy, the test suite) stay in CI so the
          # flake does not fork the CI configuration.
          fmt = pkgs.runCommand "check-cargo-fmt"
            {
              nativeBuildInputs = [ (rustToolchain pkgs) ];
            } ''
            cd ${formatSrc}
            cargo fmt --all --check
            touch $out
          '';
        });

      formatter = forEachSystem (pkgs: pkgs.nixfmt);
    };
}
