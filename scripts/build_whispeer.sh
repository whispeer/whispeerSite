#!/bin/bash
set -e
set -x

yarn
git submodule update --init

grunt copy

bundle install
jekyll build
grunt build:production
