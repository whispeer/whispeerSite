#!/bin/bash
set -e
set -x

sudo npm install -g yarn

cd ..

rm -rf whispeer-deploy
cp -r whispeer whispeer-deploy
cd whispeer-deploy

if [ -n "$WHISPEER_BUSINESS" ]; then
  echo "Building business version"
  mv b2b/de/index.html staticRaw/de/index.html
  mv b2b/en/index.html staticRaw/en/index.html

  cp b2b/grey.svg assets/img/logo/grey.svg
  cp b2b/white.svg assets/img/logo/white.svg
  cp b2b/white.svg assets/img/logo/white_darker.svg
fi

./build_whispeer.sh

cd /var/www/
sudo cp whispeer/assets/js/build/* whispeer-build/ | true

sudo rm -rf whispeer
sudo mkdir whispeer

sudo ln -s ../whispeer-build whispeer/oldBuild

sudo cp /home/nilos/whispeer-deploy/index.html /var/www/whispeer
sudo cp /home/nilos/whispeer-deploy/sw.js /var/www/whispeer
sudo cp -r /home/nilos/whispeer-deploy/assets /var/www/whispeer
sudo cp -r /home/nilos/whispeer-deploy/static /var/www/whispeer

sudo cp -r /home/nilos/whispeer-deploy/node_modules/bluebird/js/browser /var/www/whispeer/assets/bluebird

if [ -d "/home/nilos/whispeer-app" ]; then
  sudo cp -r /home/nilos/whispeer-app/versions /var/www/whispeer/app
fi
