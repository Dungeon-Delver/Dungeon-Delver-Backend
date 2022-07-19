const { BadRequestError } = require("../utils/errors")

const Parse = require("../utils/initializeParse")

class User {
  static async listParties(userId) {

    const getMembers = async (parties) => {
        const newParties = await Promise.all(parties.map( async item => {
        const dmObj = await item.get("dm")
        const dmId = dmObj.id
        const dmQuery = new Parse.Query("User")
        const dm = await dmQuery.get(dmId)
        const players = await item.get("players").query().find()
        return {party: item, dm: dm, players: players};
      }))
      return newParties
    }

    const Parties = Parse.Object.extend("Party");
    const dmQuery = new Parse.Query(Parties);
    const dmParties = await dmQuery.equalTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId }).find();
    const dmPartiesRet =  await getMembers(dmParties)

    const playerQuery = new Parse.Query(Parties);
    const userQuery = new Parse.Query("User")
    const user = await userQuery.get(userId)

    const playerParties = await playerQuery.equalTo("players", user).find()
    const playerPartiesRet = await getMembers(playerParties)

    return {dmParties: dmPartiesRet, playerParties: playerPartiesRet};
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

  static async partyLeave(userId, partyId) {
    const Parties = Parse.Object.extend("Party")
    const partyQuery = new Parse.Query(Parties)
    const party = await partyQuery.get(partyId)

    const playerQuery = new Parse.Query("User")
    const player = await playerQuery.get(userId)

    const notification = new Parse.Object("Notification");
    const dm = party.get("dm")
    notification.set("user", dm)
    notification.set("type", "leave")
    notification.set("sourceUser", player)
    notification.save();

    let playersRelation = party.relation('players')
    playersRelation.remove(player)
    party.save()
  }

  static async cancelJoin(userId, partyId) {
    const Parties = Parse.Object.extend("Party")
    const partyQuery = new Parse.Query(Parties)
    const party = await partyQuery.get(partyId)

    const playerQuery = new Parse.Query("User")
    const player = await playerQuery.get(userId)

    /*Will want to delete notification
    const notification = new Parse.Object("Notification");
    const dm = party.get("dm")
    notification.set("user", dm)
    notification.set("type", "joinRequest")
    notification.set("sourceUser", player)
    notification.save();*/

    let playersRequestedRelation = party.relation('playersRequested')
    playersRequestedRelation.remove(player)
    party.save()
  }
}

module.exports = User