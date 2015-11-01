BIN=./node_modules/.bin/
SRC=$(shell find src -name "*.ts")

build: lib dist

lib: clean
	@$(BIN)tsc \
		--target es5 \
		--module commonjs \
		--declaration \
		--outDir lib\
		$(SRC)

dist: cleandist
	@mkdir -p dist
	@$(BIN)browserify src/index.ts \
		-p tsify \
		--debug \
		--standalone mobservable \
		|$(BIN)exorcist dist/mobservable.js.map > dist/mobservable.js
	@$(BIN)browserify src/index.ts \
		-t uglifyify \
		-p tsify \
		--debug \
		--standalone mobservable \
		|$(BIN)exorcist dist/mobservable.min.js.map > dist/mobservable.min.js

clean: cleandist
	@rm -fr lib

cleandist:
	@rm -fr dist