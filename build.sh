cd docs
# First time: npm install -g gitbook-cli
gitbook build --gitbook=2.6.9
find _book -name '*.html' | xargs sed -i -e 's/https:\/\b/https:\/\//' -e 's/http:\/\b/http:\/\//'
cp -rf _book/* ../
cd ../
