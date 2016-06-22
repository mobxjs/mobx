cd docs
gitbook install --gitbook=2.4.3
gitbook build --gitbook=2.4.3
cp -rf _book/* ../
cd ../
