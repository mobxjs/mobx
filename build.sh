cd docs
gitbook build --gitbook=2.4.3
# gitbook exports external links in summary as 'http:/github.com', let's add that missing '/'
find _book -name '*.html' | xargs sed -i -e 's/https:\/\b/https:\/\//' -e 's/http:\/\b/http:\/\//'
cp -rf _book/* ../
cd ../
