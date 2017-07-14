var h = require("whispeerHelper").default;
var baseConfig =require("json-loader!conf/base.config.json");
var config = require("json-loader!conf/" + WHISPEER_ENV + ".config.json");

module.exports = h.extend(h.extend({}, baseConfig), config);
