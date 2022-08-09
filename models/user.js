const { NotFoundError } = require("../utils/errors");
const Parse = require("../utils/initializeParse");
const { deleteParty, partyRemove } = require("./party");

class User {
  static async listParties(userId) {
    const getMembers = async (parties) => {
      const newParties = await Promise.all(
        parties.map(async (item) => {
          const dmObj = await item.get("dm");
          const dmId = dmObj.id;
          const dmQuery = new Parse.Query("User");
          const dm = await dmQuery.get(dmId);
          const players = await item.get("players").query().find();
          return { party: item, dm: dm, players: players };
        })
      );
      return newParties;
    };

    const Parties = Parse.Object.extend("Party");
    const dmQuery = new Parse.Query(Parties);
    dmQuery.descending("createdAt");
    const dmParties = await dmQuery
      .equalTo("dm", {
        __type: "Pointer",
        className: "_User",
        objectId: userId,
      })
      .find();
    const dmPartiesRet = await getMembers(dmParties);
    let user;
    try {
      const userQuery = new Parse.Query("User");
      user = await userQuery.get(userId);
    } catch {
      throw new NotFoundError(`Invalid userId ${userId}`);
    }

    const playerQuery = new Parse.Query(Parties);
    playerQuery.descending("createdAt");
    const playerParties = await playerQuery.equalTo("players", user).find();
    const playerPartiesRet = await getMembers(playerParties);

    return { dmParties: dmPartiesRet, playerParties: playerPartiesRet };
  }

  static async getUser(userId) {
    try {
      const UserQuery = new Parse.Query("User");
      const user = await UserQuery.get(userId);
      return user;
    } catch (err) {
      throw new NotFoundError(`Invalid userId ${userId}`);
    }
  }

  static async requestPartyJoin(userId, partyId) {
    const Parties = Parse.Object.extend("Party");
    const partyQuery = new Parse.Query(Parties);
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }

    let player;
    try {
      const userQuery = new Parse.Query("User");
      player = await userQuery.get(userId);
    } catch {
      throw new NotFoundError(`Invalid userId ${userId}`);
    }

    const notification = new Parse.Object("Notification");
    const dm = party.get("dm");
    const partyDmQuery = new Parse.Query("User");
    const partyDmObject = await partyDmQuery.get(dm.id);
    notification.set("user", dm);
    notification.set("type", "joinRequest");
    notification.set("sourceUser", player);
    notification.set("party", party);
    await notification.save();
    const notificationJSON = notification.toJSON();
    notificationJSON.sourceUser = player.toJSON();
    notificationJSON.party = party.toJSON();
    notificationJSON.user = partyDmObject.toJSON();

    let playersRequestedRelation = party.relation("playersRequested");
    playersRequestedRelation.add(player);
    party.save();
    return notificationJSON;
  }

  static async partyLeave(userId, partyId) {
    const Parties = Parse.Object.extend("Party");
    const partyQuery = new Parse.Query(Parties);
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }

    let player;
    try {
      const playerQuery = new Parse.Query("User");
      player = await playerQuery.get(userId);
    } catch {
      throw new NotFoundError(`Invalid userId ${userId}`);
    }

    const notification = new Parse.Object("Notification");
    const dm = party.get("dm");

    const partyDmQuery = new Parse.Query("User");
    const partyDmObject = await partyDmQuery.get(dm.id);

    notification.set("user", dm);
    notification.set("type", "leave");
    notification.set("sourceUser", player);
    notification.set("party", party);
    await notification.save();
    const notificationJSON = notification.toJSON();
    notificationJSON.sourceUser = player.toJSON();
    notificationJSON.party = party.toJSON();
    notificationJSON.user = partyDmObject.toJSON();

    player.decrement("numParties", 1);
    await player.save({}, { useMasterKey: true });

    let playersRelation = party.relation("players");
    playersRelation.remove(player);
    party.save();
    return notificationJSON;
  }

  static async cancelJoin(userId, partyId) {
    const Parties = Parse.Object.extend("Party");
    const partyQuery = new Parse.Query(Parties);
    let party;
    try {
      party = await partyQuery.get(partyId);
    } catch {
      throw new NotFoundError(`Invalid partyId ${partyId}`);
    }

    let player;
    try {
      const playerQuery = new Parse.Query("User");
      player = await playerQuery.get(userId);
    } catch {
      throw new NotFoundError(`Invalid userId ${userId}`);
    }

    const notificationQuery = new Parse.Query("Notification");
    const dm = party.get("dm");
    notificationQuery.equalTo("user", dm);
    notificationQuery.equalTo("type", "joinRequest");
    notificationQuery.equalTo("sourceUser", player);
    notificationQuery.descending("createdAt");
    const notification = await notificationQuery.first();
    const notificationJSON = notification.toJSON();
    notificationJSON.cancel = true;
    if (notification !== undefined) {
      notification.destroy();
    }

    let playersRequestedRelation = party.relation("playersRequested");
    playersRequestedRelation.remove(player);
    party.save();
    return notificationJSON;
  }

  static async getNotifications(userId, first, last) {
    const pageLimit = 5;

    const notificationQuery = new Parse.Query("Notification");
    notificationQuery.equalTo("user", {
      __type: "Pointer",
      className: "_User",
      objectId: userId,
    });
    const ascending = first !== undefined;
    if (ascending) {
      notificationQuery.ascending("createdAt");
    } else {
      notificationQuery.descending("createdAt");
    }

    if (first !== undefined) {
      const firstQuery = new Parse.Query("Notification");
      const firstNotif = await firstQuery.get(first.objectId);
      notificationQuery.greaterThan("createdAt", firstNotif.get("createdAt"));
    }
    if (last !== undefined) {
      const firstQuery = new Parse.Query("Notification");
      const lastNotif = await firstQuery.get(last.objectId);
      notificationQuery.lessThan("createdAt", lastNotif.get("createdAt"));
    }
    notificationQuery.limit(pageLimit + 1);
    const notifications = await notificationQuery.find();
    let reachedEnd = false;
    if (notifications.length <= pageLimit) {
      reachedEnd = true;
    } else {
      notifications.splice(pageLimit);
    }
    const unreadNotifications = [];
    const readNotifications = [];

    if (ascending) {
      notifications.reverse();
    }
    for (let i = 0; i < notifications.length; i++) {
      const item = notifications[i];
      const object = item.toJSON();

      if (object.hasOwnProperty("sourceUser")) {
        try {
          const userQuery = new Parse.Query("User");
          const sourceUser = await userQuery.get(object.sourceUser.objectId);
          object.sourceUser = sourceUser.toJSON();
        } catch {
          object.sourceUser = {
            username: "/Deleted User/",
            picture:
              "https://static.thenounproject.com/png/994628-200.png",
          };
        }
      }
      if (object.hasOwnProperty("party")) {
        try {
          const partyQuery = new Parse.Query("Party");
          const party = await partyQuery.get(object.party.objectId);
          object.party = party.toJSON();
        } catch {
          object.party = { name: "/Deleted Party/" };
        }
      }
      if (object.viewed) {
        readNotifications.push(object);
      } else {
        unreadNotifications.push(object);
      }
    }
    return {
      unreadNotifications: unreadNotifications,
      readNotifications: readNotifications,
      reachedEnd: reachedEnd,
    };
  }

  static async inParty(userId, partyId) {
    const query = new Parse.Query("Party");
    const party = await query.get(partyId);
    const dmObj = await party.get("dm");
    const dmId = dmObj.id;
    let found = false;
    if (dmId === userId) {
      found = true;
      return true;
    }

    const players = await party.get("players").query().find();
    players.forEach((item) => {
      if (item.id === userId) {
        found = true;
      }
    });
    return found;
  }

  static async readNotifications(notifications) {
    notifications.forEach(async (item) => {
      const notificationQuery = new Parse.Query("Notification");
      const notification = await notificationQuery.get(item.objectId);
      notification.set("viewed", true);
      notification.save();
    });
    return;
  }

  static async getProfileData(userId) {
    const getMembers = async (parties) => {
      const newParties = await Promise.all(
        parties.map(async (item) => {
          const dmObj = await item.get("dm");
          const dmId = dmObj.id;
          const dmQuery = new Parse.Query("User");
          const dm = await dmQuery.get(dmId);
          const players = await item.get("players").query().find();
          return { party: item, dm: dm, players: players };
        })
      );
      return newParties;
    };

    const userQuery = new Parse.Query("User");
    let user;
    try {
      user = await userQuery.get(userId);
    } catch {
      throw new NotFoundError("This user does not exist");
    }
    const userJSON = user.toJSON();

    const dmQuery = new Parse.Query("Party");
    const statusQuery = new Parse.Query("Party");

    statusQuery.equalTo("status", "Public");
    dmQuery.equalTo("dm", {
      __type: "Pointer",
      className: "_User",
      objectId: userId,
    });

    const finalDmQuery = Parse.Query.and(dmQuery, statusQuery);
    finalDmQuery.descending("createdAt");

    const dmParties = await finalDmQuery.find();

    const dmPartiesRet = await getMembers(dmParties);

    const playerQuery = new Parse.Query("Party");
    playerQuery.equalTo("players", user);
    const translationPlayerQuery = new Parse.Query("Party");
    translationPlayerQuery.matchesKeyInQuery(
      "objectId",
      "objectId",
      playerQuery
    );
    const finalPlayerQuery = Parse.Query.and(
      translationPlayerQuery,
      statusQuery
    );
    finalPlayerQuery.descending("createdAt");

    const playerParties = await finalPlayerQuery.find();
    const playerPartiesRet = await getMembers(playerParties);

    return {
      user: userJSON,
      parties: { dmParties: dmPartiesRet, playerParties: playerPartiesRet },
    };
  }
  static async deleteUser(userId) {
    const userQuery = new Parse.Query("User");
    let user;
    try {
      user = await userQuery.get(userId);
    } catch {
      throw new NotFoundError(`Invalid userId ${userId}`);
    }
    const dmQuery = new Parse.Query("Party");
    const findPlayerParties = new Parse.Query("Party");
    dmQuery.equalTo("dm", {
      __type: "Pointer",
      className: "_User",
      objectId: userId,
    });
    findPlayerParties.equalTo("players", user);
    const dmParties = await dmQuery.find();
    console.log('dmParties: ', dmParties);
    const playerParties = await findPlayerParties.find();
   for(let i = 0; i < dmParties.length; i++) {
      await deleteParty(dmParties[i].id, user.toJSON());
    }
    for(let j = 0; j < playerParties.length; j++) {
      let playersRelation = playerParties[j].relation("players");
      playersRelation.remove(user);
      await playerParties[j].save();
    }
    const result = await user.destroy({ useMasterKey: true });
    return result;
  }
}

module.exports = User;
