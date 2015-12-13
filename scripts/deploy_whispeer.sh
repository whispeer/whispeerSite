#!/bin/bash
cd whispeer
npm install
git submodule update --init
bower install
cd ..


rm -rf whispeer-deploy
cp -r whispeer whispeer-deploy
cp config.js ./whispeer-deploy/assets/js/
cd whispeer-deploy
grunt build:production


cd /var/www/
sudo rm -rf whispeer
sudo mkdir whispeer
sudo cp /home/nilos/whispeer-deploy/index.html /var/www/whispeer
sudo cp -r /home/nilos/whispeer-deploy/assets /var/www/whispeer
sudo cp -r /home/nilos/whispeer-deploy/static /var/www/whispeer
#sudo cp /home/nilos/whispeer-deploy/manifest.mf /var/www/whispeer

