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
    const partyDmQuery = new Parse.Query("User")
    const partyDmObject = await partyDmQuery.get(dm.id)
    notification.set("user", dm)
    notification.set("type", "joinRequest")
    notification.set("sourceUser", player)
    notification.set("party", party)
    await notification.save();
    const notificationJSON = notification.toJSON();
    notificationJSON.sourceUser = player.toJSON();
    notificationJSON.party = party.toJSON()
    notificationJSON.user = partyDmObject.toJSON()

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

    const partyDmQuery = new Parse.Query("User")
    const partyDmObject = await partyDmQuery.get(dm.id)

    notification.set("user", dm)
    notification.set("type", "leave")
    notification.set("sourceUser", player)
    notification.set("party", party)
    await notification.save();
    const notificationJSON = notification.toJSON()
    notificationJSON.sourceUser = player.toJSON();
    notificationJSON.party = party.toJSON()
    notificationJSON.user = partyDmObject.toJSON()

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

    const notificationQuery = new Parse.Query("Notification");
    const dm = party.get("dm")
    notificationQuery.equalTo("user", dm)
    notificationQuery.equalTo("type", "joinRequest")
    notificationQuery.equalTo("sourceUser", player)
    notificationQuery.descending("createdAt")
    const notification = await notificationQuery.first()
    const notificationJSON = notification.toJSON()
    if(notification !== undefined) {
      notification.destroy();
    }

    let playersRequestedRelation = party.relation('playersRequested')
    playersRequestedRelation.remove(player)
    party.save()
    return notificationJSON
  }

  static async getNotifications(userId) {

    const notificationQuery = new Parse.Query("Notification")
    notificationQuery.equalTo("user", { '__type': 'Pointer', 'className': '_User', 'objectId': userId })
    notificationQuery.descending("createdAt")
    notificationQuery.limit(5)
    const notifications = await notificationQuery.find()
    const unreadNotifications = []
    const readNotifications = []
    await Promise.all(notifications.map(async item => {
      const object = item.toJSON()
      if (object.hasOwnProperty("sourceUser")) {
        try {
          const userQuery = new Parse.Query("User")
          const sourceUser = await userQuery.get(object.sourceUser.objectId)
          object.sourceUser = sourceUser.toJSON()
        }
        catch {
          object.sourceUser = {user: "/Deleted User/", picture: "https://www.personality-insights.com/wp-content/uploads/2017/12/default-profile-pic-e1513291410505.jpg"}
        }
        
      }
      if(object.hasOwnProperty("party")) {
        try {
          const partyQuery = new Parse.Query("Party")
          const party = await partyQuery.get(object.party.objectId)
          object.party = party.toJSON();
        }
        catch {
          object.party = {name: "/Deleted Party/"}
        }
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