const _ = require("underscore");

const Default = require("./default");
const production = require("./production");
const test = require("./test");
const development = require("./development");

let config;

if (Default.env === "production") {
  config = production;
} else if (Default.env === "test") {
  config = test;
} else {
  config = development;
}

module.exports = _.extend({}, Default, config);
