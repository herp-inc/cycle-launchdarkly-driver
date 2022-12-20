{ pkgs ? import <nixpkgs> {} }:

let
  packageJSON = pkgs.lib.importJSON ./package.json;
in

pkgs.stdenv.mkDerivation rec {
  name = "herp-inc-cycle-launchdarkly-driver";
  version = packageJSON.version;

  src = pkgs.nix-gitignore.gitignoreSource [] ./.;

  buildInputs = [
    pkgs.nodejs-slim
    pkgs.yarn
  ];

  buildPhase=''
    HOME=$TMP yarn install --frozen-lockfile
    yarn rollup --config ./rollup.config.mjs
    cp ./package.json ./README.md ./dist
    cd ./dist
    yarn pack
    cd ..
    mv ./dist/*.tgz ./
  '';

  dontInstall = true;

  doDist = true;
  tarballs = "herp-inc-cycle-launchdarkly-driver-v${version}.tgz";
}
