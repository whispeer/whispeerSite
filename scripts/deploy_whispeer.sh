#!/bin/bash
set -e
set -x

if [[ -z "${SENTRY_KEY_PROD}" ]]; then
	echo "SENTRY_KEY_PROD not set. Exiting build"
	exit 1
fi

if [[ -z "${SENTRY_KEY_BUSINESS}" ]]; then
	echo "SENTRY_KEY_BUSINESS not set. Exiting build"
	exit 1
fi

sudo npm install -g yarn

cd ..

rm -rf whispeer-build
mkdir whispeer-build

cd whispeer-build

mkdir b2b
mkdir b2c

cp -r ../whispeer deploy
cd deploy

./scripts/build_whispeer.sh

cp ./index.html ../b2c
cp ./sw.js ../b2c
cp -r ./assets ../b2c
cp -r ./static ../b2c
cp -r ./node_modules/bluebird/js/browser ../b2c/assets/bluebird

echo "Building business version"
cp b2b/de/index.html staticRaw/de/index.html
cp b2b/en/index.html staticRaw/en/index.html

cp b2b/grey.svg assets/img/logo/grey.svg
cp b2b/white.svg assets/img/logo/white.svg
cp b2b/white.svg assets/img/logo/white_darker.svg

WHISPEER_BUSINESS=true ./scripts/build_whispeer.sh

cp ./index.html ../b2b
cp ./sw.js ../b2b
cp -r ./assets ../b2b
cp -r ./static ../b2b
cp -r ./node_modules/bluebird/js/browser ../b2b/assets/bluebird

cd /var/www/
sudo cp whispeer/assets/js/build/* whispeer-build/ | true

sudo rm -rf whispeer
sudo mkdir whispeer

sudo ln -s ../whispeer-build whispeer/oldBuild

sudo cp -r /home/nilos/whispeer-build/b2b /var/www/whispeer
# Sleep for different last-modified times
sleep 5
sudo cp -r /home/nilos/whispeer-build/b2c /var/www/whispeer

if [ -d "/home/nilos/whispeer-app" ]; then
  sudo cp -r /home/nilos/whispeer-app/versions /var/www/whispeer/app
fi
