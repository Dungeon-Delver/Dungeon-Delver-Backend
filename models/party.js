const { BadRequestError, NotFoundError } = require("../utils/errors")

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
      try {
        const party = await query.get(partyId)
        const requestedUsers = await this.getRequestedUsers(partyId)
        const members = await this.getMembers(partyId)
  
        return {party: party, requestedUsers: requestedUsers, members: members};
      }
      catch {
        throw new NotFoundError("This Party Does Not Exist")
      }
  }

  static async getRequestedUsers(partyId) {
    const query = new Parse.Query("Party")
    const party = await query.get(partyId)
    const users = await party.get("playersRequested").query().find()
    return users;
  }

  static async handleSearchParty(searchParameters, userId) {
    const searchProps = ["experience", "type", "genre", "level"]
    searchProps.forEach((item) => {
      if(!searchParameters.hasOwnProperty(item)) {
        throw new BadRequestError("Missing Search Parameters")
      }
    })

    const userQuery = new Parse.Query("User")
    const user = await userQuery.get(userId)

    const experienceQuery = new Parse.Query("Party");
    const typeQuery = new Parse.Query("Party")
    const genreQuery = new Parse.Query("Party")
    const levelQuery = new Parse.Query("Party")
    const statusQuery = new Parse.Query("Party")
    const dmQuery = new Parse.Query("Party");
    const findPlayerParties = new Parse.Query("Party")
    const playerQuery = new Parse.Query("Party")


    experienceQuery.equalTo("searchParameters.experience", searchParameters.experience)
    typeQuery.equalTo("searchParameters.type", searchParameters.type)
    genreQuery.equalTo("searchParameters.genre", searchParameters.genre)
    levelQuery.equalTo("searchParameters.level", searchParameters.level)
    statusQuery.notEqualTo("status", "Closed")
    dmQuery.notEqualTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId })
    findPlayerParties.equalTo("players", user)
    playerQuery.doesNotMatchKeyInQuery("objectId", "objectId", findPlayerParties)

    const query =  Parse.Query.and(experienceQuery, typeQuery, genreQuery, levelQuery, statusQuery, dmQuery, playerQuery)

    const parties = await query.find();

    if(parties.length==0) {
      return null;
    }

    return parties;
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

  static async handleModifyParty(partyId, body) {
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
    
    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)

    party.set("name", body.name)
    const userQuery = new Parse.Query("User");
    const dm = await userQuery.get(body.dm);
    if(!dm.get("enabled")) {
      console.log("disabled user")
      throw new BadRequestError("Attempting to modify party for disabled user")
    }
    if(dm.objectId !== party.dm) {
      throw new BadRequestError("Only the DM can modify party settings")
    }
    party.set("searchParameters", body.searchParameters)
    party.set("status", body.mode)
    let result = await party.save()
    return result.id;
  }

  static async deleteParty(partyId, dm) {
    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)
    const partyDm = party.get("dm")
    if(partyDm.id!=dm.objectId) {
      throw new BadRequestError("Only the Dungeon Master can delete parties")
    }

    partyDm.decrement("numParties", 1)

    const players = await party.get("players").query().find()
    players.forEach((item) => {
        item.decrement("numParties", 1)
        item.save({}, {useMasterKey: true});
    })
    await partyDm.save({}, {useMasterKey: true});
    party.destroy();
  }

  static async partyRemove(dmId, userId, partyId) {
    const Parties = Parse.Object.extend("Party")
    const partyQuery = new Parse.Query(Parties)
    const party = await partyQuery.get(partyId)

    const playerQuery = new Parse.Query("User")
    const player = await playerQuery.get(userId)
    const dmQuery = new Parse.Query("User")
    const dm = await dmQuery.get(dmId)
    const partyDm = await party.get("dm")

    if(dm.objectId !== partyDm.objectId) {
      throw new BadRequestError("Only the DM can remove users from a party")
    }

    const notification = new Parse.Object("Notification");
    notification.set("user", player)
    notification.set("type", "remove")
    notification.set("sourceUser", dm)
    notification.save();

    player.decrement("numParties", 1);
    await player.save({}, {useMasterKey: true});

    let playersRelation = party.relation('players')
    playersRelation.remove(player)
    party.save()
  }

}

module.exports = Party