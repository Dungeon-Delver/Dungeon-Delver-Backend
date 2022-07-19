const Parse = require("parse/node");
const Keys = require("../keys.json")

Parse.initialize(Keys.parse.appId, Keys.parse.javascriptKey, Keys.parse.masterKey)
Parse.serverURL = 'https://parseapi.back4app.com';

module.exports = Parse