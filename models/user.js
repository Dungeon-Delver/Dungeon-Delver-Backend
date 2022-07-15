const { BadRequestError } = require("../utils/errors")

const Parse = require("../utils/initializeParse")

class User {
  static async listParties(userId) {
    const Parties = Parse.Object.extend("Party");
    const dmQuery = new Parse.Query(Parties);
    const dmParties = await dmQuery.equalTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId }).find();
    
    const playerQuery = new Parse.Query(Parties);
    const userQuery = new Parse.Query("User")
    const user = await userQuery.get(userId)

    const playerParties = await playerQuery.equalTo("players", user).find()
    
    return {dmParties: dmParties, playerParties: playerParties};
  }

  static async requestPartyJoin(userId, partyId) {
    const Parties = Parse.Object.extend("Party")
    const partyQuery = new Parse.Query(Parties)
    const party = await partyQuery.get(partyId)

    const playerQuery = new Parse.Query("User")
    const player = await playerQuery.get(userId)

    const notification = new Parse.Object("Notification");
    const dm = party.get("dm")
    notification.set("user", dm)
    notification.set("type", "joinRequest")
    notification.set("sourceUser", player)
    notification.save();

    let playersRequestedRelation = party.relation('playersRequested')
    playersRequestedRelation.add(player)
    party.save()

  }
}

module.exports = User