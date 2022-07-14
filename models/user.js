const { BadRequestError } = require("../utils/errors")

const Parse = require("../utils/initializeParse")

class User {
  static async listParties(userId) {
    const Parties = Parse.Object.extend("Party");
    const query = new Parse.Query(Parties);
    const parties = await query.equalTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId }).find();
    return parties;
    //Also check for parties we are a player in
  }

  static async requestPartyJoin(userId, party) {
    console.log('party: ', party);
    console.log('userId: ', userId);
  }
}

module.exports = User