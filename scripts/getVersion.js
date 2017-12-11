#!/usr/bin/env node

const info = require("../package.json")
process.stdout.write(info.version)
