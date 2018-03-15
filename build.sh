cd docs
gitbook build --gitbook=2.4.3
find _book -name '*.html' | xargs sed -i -e 's/https:\/\b/https:\/\//' -e 's/http:\/\b/http:\/\//'
cp -rf _book/* ../
cd ../
