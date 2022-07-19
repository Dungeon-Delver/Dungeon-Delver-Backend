const { BadRequestError } = require("../utils/errors")

const Parse = require("../utils/initializeParse")

class Party {
  static async handleCreateParty(body) {
    const bodyProps = ["name", "dm", "searchParameters", "mode"]
    bodyProps.forEach((item) => {
      if(!body.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Properties")
      }
    })
    const searchProps = ["experience", "type", "genre", "level"]
    searchProps.forEach((item) => {
      if(!body.searchParameters.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Search Parameters")
      }
    })
    const newParty = new Parse.Object("Party");
    newParty.set("name", body.name)
    const query = new Parse.Query("User");
    const dm = await query.get(body.dm.objectId);
    if(!dm.get("enabled")) {
      console.log("disabled user")
      throw new BadRequestError("Attempting to create party for disabled user")
    }
    if(dm.get("numParties") >= 100) {
      throw new BadRequestError("You have reached the maximum limit for parties")
    }
    dm.increment("numParties", 1);
    await dm.save({}, {useMasterKey: true});
    newParty.set("dm", dm)
    newParty.set("searchParameters", body.searchParameters)
    newParty.set("status", body.mode)
    let result = await newParty.save()
    return result.id;
  }

  static async getParty(partyId) {
      const query = new Parse.Query("Party")
      const party = await query.get(partyId)

      const requestedUsers = await this.getRequestedUsers(partyId)
      const members = await this.getMembers(partyId)

      return {party: party, requestedUsers: requestedUsers, members: members};
  }

  static async getRequestedUsers(partyId) {
    const query = new Parse.Query("Party")
    const party = await query.get(partyId)
    const users = await party.get("playersRequested").query().find()
    return users;
  }

  static async getMembers(partyId) {
    const query = new Parse.Query("Party")
    const party = await query.get(partyId)
    const dmObj = await party.get("dm")
    const dmId = dmObj.id
    const dmQuery = new Parse.Query("User")
    const dm = await dmQuery.get(dmId)
    const players = await party.get("players").query().find()
    return {dm: dm, players: players};
  }

  static async acceptUser(partyId, userId, dm) {
    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)
    const partyDm = party.get("dm")
    if(partyDm.id!=dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can accept users")
    }

    const playerQuery = new Parse.Query("User")
    const player = await playerQuery.get(userId)

    const requestedUsers = party.get("playersRequested");
    requestedUsers.remove(player)

    if(player.get("numParties") >= 100) {
      throw new BadRequestError("This player has reached the maximum limit for parties")
    }

    player.increment("numParties", 1);
    await player.save({}, {useMasterKey: true});
    
    const players = party.get("players")
    players.add(player);

    const partyPlayers = await party.save();
    return partyPlayers;
  }

  static async rejectUser(partyId, userId, dm) {
    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)
    const partyDm = party.get("dm")
    if(partyDm.id!=dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can accept users")
    }

    const playerQuery = new Parse.Query("User")
    const player = await playerQuery.get(userId)

    const requestedUsers = party.get("playersRequested");
    requestedUsers.remove(player)

    const partyPlayers = await party.save();
    return partyPlayers;    
  }

  static async deleteParty(partyId, dm) {
    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)
    const partyDm = party.get("dm")
    if(partyDm.id!=dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can delete parties")
    }

    party.destroy();
  }

}

module.exports = Party