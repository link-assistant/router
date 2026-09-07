{
  description = "Link.Assistant.Router — Claude MAX OAuth proxy and token gateway for Anthropic APIs";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # The platforms Nix support is claimed for. Everything below is derived
      # per system so a single definition serves all of them.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forEachSystem = f:
        nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      cargoToml = builtins.fromTOML (builtins.readFile ./Cargo.toml);

      # Only the inputs the Rust build actually reads. Keeping the source
      # filtered this way means editing docs or CI configuration does not
      # invalidate the build.
      src = nixpkgs.lib.fileset.toSource {
        root = ./.;
        fileset = nixpkgs.lib.fileset.unions [
          ./Cargo.toml
          ./Cargo.lock
          ./src
          ./tests
          ./README.md
          # RustEmbed compiles the committed admin UI bundle into the binary,
          # so the build fails without it (see src/admin_ui.rs).
          ./ui/dist
        ];
      };

      # `aws-lc-sys` (through rustls) builds C and generates bindings; `ring`,
      # `zstd`, `brotli` and `flate2` need a C compiler. `openssl` is here for
      # the crates that probe for it via pkg-config.
      nativeDeps = pkgs: {
        nativeBuildInputs = [
          pkgs.pkg-config
          pkgs.cmake
          pkgs.perl
          pkgs.rustPlatform.bindgenHook
        ];
        buildInputs = [ pkgs.openssl ];
      };

      routerPackage = pkgs:
        let deps = nativeDeps pkgs;
        in pkgs.rustPlatform.buildRustPackage {
          pname = "link-assistant-router";
          inherit (cargoToml.package) version;
          inherit src;

          cargoLock.lockFile = ./Cargo.lock;

          inherit (deps) nativeBuildInputs buildInputs;

          # The test suite starts servers, binds ports and reaches out to real
          # Anthropic endpoints, none of which work in the Nix sandbox. Tests
          # stay a `cargo test` (and CI) concern; `nix build` is the packaging
          # path. `nix flake check` runs the checks below instead.
          doCheck = false;

          meta = with pkgs.lib; {
            inherit (cargoToml.package) description homepage;
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
        let deps = nativeDeps pkgs;
        in {
          default = pkgs.mkShell {
            nativeBuildInputs = deps.nativeBuildInputs ++ [
              # `cargo build`, `cargo test`, `cargo fmt` and `cargo clippy` all
              # come from this one toolchain, which nixpkgs keeps at or above
              # the project's MSRV (Cargo.toml `rust-version`).
              pkgs.cargo
              pkgs.rustc
              pkgs.rustfmt
              pkgs.clippy
              pkgs.rust-analyzer
              # The admin UI bundle in ui/dist is rebuilt with these.
              pkgs.nodejs
              pkgs.git
            ];
            inherit (deps) buildInputs;

            RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";

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
              nativeBuildInputs = [ pkgs.cargo pkgs.rustfmt ];
            } ''
            cd ${src}
            cargo fmt --all --check
            touch $out
          '';
        });

      formatter = forEachSystem (pkgs: pkgs.nixpkgs-fmt);
    };
}
