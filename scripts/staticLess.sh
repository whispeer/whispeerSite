#!/bin/bash
set -e
set -x

if [ -z "${WHISPEER_BUSINESS}" ]; then
  LESS_FILE="static.less";
else
  LESS_FILE="static_business.less";
fi

./node_modules/.bin/lessc --include-path=node_modules assets/less/${LESS_FILE} staticRaw/assets/css/static.css
