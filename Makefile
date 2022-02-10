all: sdist

format: install
	yarn prettier --write .

install:
	yarn install

lint: install
	yarn eslint ./src

sdist:
	nix-build

typecheck: install
	yarn tsc --noEmit --watch
