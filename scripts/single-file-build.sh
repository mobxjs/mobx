#!/usr/bin/env bash

# to be invoked from the root of mobx, by using `npm run` to be able to resolve binaries

# This script takes all typescript files, concatenates it to one big file and removes import and export statements.
# This makes the library a factor 2 - 3 small, both minified and unminified, because
# 1) when having many source files, there are a lot of webpack require calls lingering around
# 2) when export functions from typescript files, they cannot be minified anymore because they are exported 
#    (or added as prop to a namespace if using typescript namespaces),
#    while actually they can be minified as long as they are internal to the module 

# prelude
set -e
rm -rf lib .build
mkdir -p .build

echo '/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */' > .build/mobx.ts

# generate exports config
cat src/mobx.ts | grep -v '^import' | sed -e 's/from.*$//g' >> .build/mobx.ts

# find all ts files, concat them (with newlines), remove all import statements, remove export keyword
ls  src/{core,types,api,utils}/*.ts | xargs awk 'BEGINFILE {print "/* file:", FILENAME, "*/"} {print $0}' | grep -v '^import ' | sed -e 's/^export //g' >> .build/mobx.ts

# compile to commonjs, generate declaration, no comments
tsc -m commonjs -t es5 -d --removeComments --outDir lib .build/mobx.ts 

# make an umd build as well
browserify -s mobx -e lib/mobx.js -o lib/mobx.umd.js 

# idea: strip invariants from compiled result. However, difference is not really significant in speed and size, disabled for now. 
# cat lib/mobx.js | grep -v -P '^\s+invariant' > .build/mobx-prod.js 

# minify, mangle, compress, wrap in function, use build without invariant
# N.B: don't worry about the dead code warnings, see https://github.com/Microsoft/TypeScript/issues/7017#issuecomment-182789529
uglifyjs -m sort,toplevel -c --screw-ie8 --preamble '/** MobX - (c) Michel Weststrate 2015, 2016 - MIT Licensed */' --source-map lib/mobx.min.js.map -o lib/mobx.min.js lib/mobx.js 
  # -- OR -- (see above)
  # .build/mobx-prod.js
