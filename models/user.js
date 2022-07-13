const { BadRequestError } = require("../utils/errors")
const Keys = require("../keys.json")

const Parse = require("parse/node");
Parse.initialize(Keys.parse.appId, Keys.parse.javascriptKey)

Parse.serverURL = 'https://parseapi.back4app.com';

class User {
  static async listParties(userId) {
    const Parties = Parse.Object.extend("Party");
    const query = new Parse.Query(Parties);
    const parties = await query.equalTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId }).find();
    return parties;
    //Also check for parties we are a player in
  }
}

module.exports = User