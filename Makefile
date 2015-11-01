BIN=./node_modules/.bin/
SRC=$(shell find src -name "*.ts")

build: lib

lib: clean
	@$(BIN)tsc \
		--target es5 \
		--module commonjs \
		--declaration \
		--outDir lib\
		$(SRC)

clean:
	@rm -fr lib