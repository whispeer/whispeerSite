#!/bin/bash
set -e
set -x

npm install
git submodule update --init
bower install
cd ..


rm -rf whispeer-deploy
cp -r whispeer whispeer-deploy
cd whispeer-deploy

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
