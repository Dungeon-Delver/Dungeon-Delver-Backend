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
    dmQuery.descending('createdAt')
    const dmParties = await dmQuery.equalTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId }).find();
    const dmPartiesRet =  await getMembers(dmParties)

    const userQuery = new Parse.Query("User")
    const user = await userQuery.get(userId)

    const playerQuery = new Parse.Query(Parties);
    playerQuery.descending('createdAt')
    const playerParties = await playerQuery.equalTo("players", user).find()
    const playerPartiesRet = await getMembers(playerParties)

    return {dmParties: dmPartiesRet, playerParties: playerPartiesRet};
  }

  static async getUser(userId) {
    try {
      const UserQuery = new Parse.Query("User")
      const user = await UserQuery.get(userId)
      return user
    }
    catch (err) {
      throw new BadRequestError("Invalid user id")
    }
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
    notification.set("party", party)
    notification.save();
    const notificationJSON = notification.toJSON();

    let playersRequestedRelation = party.relation('playersRequested')
    playersRequestedRelation.add(player)
    party.save()
    return notificationJSON
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
    notification.set("party", party)
    await notification.save();
    const notificationJSON = notification.toJSON()

    player.decrement("numParties", 1);
    await player.save({}, {useMasterKey: true});

    let playersRelation = party.relation('players')
    playersRelation.remove(player)
    party.save()
    return notificationJSON
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

  static async getNotifications(userId) {

    const notificationQuery = new Parse.Query("Notification")
    notificationQuery.equalTo("user", { '__type': 'Pointer', 'className': '_User', 'objectId': userId })
    notificationQuery.descending("createdAt")
    const notifications = await notificationQuery.find()
    const unreadNotifications = []
    const readNotifications = []
    await Promise.all(notifications.map(async item => {
      const object = item.toJSON()
      if (object.hasOwnProperty("sourceUser")) {
        const userQuery = new Parse.Query("User")
        const sourceUser = await userQuery.get(object.sourceUser.objectId)
        object.sourceUser = sourceUser.toJSON()
      }
      if(object.hasOwnProperty("party")) {
        const partyQuery = new Parse.Query("Party")
        const party = await partyQuery.get(object.party.objectId)
        object.party = party.toJSON();
      }
      if(object.viewed) {
        readNotifications.push(object)
      }
      else {
        unreadNotifications.push(object)
      }
    }))
    return {unreadNotifications: unreadNotifications, readNotifications: readNotifications};
  }

  static async readNotifications(notifications) {
    notifications.forEach(async item => {
      const notificationQuery = new Parse.Query("Notification")
      const notification = await notificationQuery.get(item.objectId)
      notification.set("viewed", true)
      notification.save();
    })
    return;
  }

}

module.exports = User