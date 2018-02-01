#!/bin/bash
set -e
set -x

yarn
git submodule update --init

npm run build
