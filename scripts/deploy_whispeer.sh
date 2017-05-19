#!/bin/bash
set -e
set -x

cd ..


rm -rf whispeer-deploy
cp -r whispeer whispeer-deploy
cd whispeer-deploy

if [ -n "$WHISPEER_BUSINESS" ]; then
  echo "Building business version"
  mv staticRaw/de/business.html staticRaw/de/index.html
  mv staticRaw/en/business.html staticRaw/en/index.html
else
  rm staticRaw/de/business.html
  rm staticRaw/en/business.html
fi

npm install
git submodule update --init
bower install

grunt copy

bundle install
jekyll build
grunt build:production

cd /var/www/
sudo cp whispeer/assets/js/build/* whispeer-build/ | true

sudo rm -rf whispeer
sudo mkdir whispeer

sudo ln -s ../whispeer-build whispeer/oldBuild

sudo cp /home/nilos/whispeer-deploy/index.html /var/www/whispeer
sudo cp /home/nilos/whispeer-deploy/sw.js /var/www/whispeer
sudo cp -r /home/nilos/whispeer-deploy/assets /var/www/whispeer
sudo cp -r /home/nilos/whispeer-deploy/static /var/www/whispeer
sudo cp -r /home/nilos/whispeer-app/versions /var/www/whispeer/app
