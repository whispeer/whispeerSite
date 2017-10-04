"use strict";

const h = require("helper/helper").default
const baseConfig = require("conf/base.config.json")
const config = require("conf/" + WHISPEER_ENV + ".config.json")

module.exports = h.extend(h.extend({}, baseConfig), config);
