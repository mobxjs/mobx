cd docs
# First time: npm install -g gitbook-cli
# Note: this version of gitbook is known to work under node 6.10.0, but breaks under node 10. Use nvm to switch node version if needed
gitbook build --gitbook=2.6.9
find _book -name '*.html' | xargs sed -i -e 's/https:\/\b/https:\/\//' -e 's/http:\/\b/http:\/\//'
cp -rf _book/* ../
cd ../
