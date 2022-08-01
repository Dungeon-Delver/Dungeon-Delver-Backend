const { BadRequestError, NotFoundError } = require("../utils/errors")

const Parse = require("../utils/initializeParse")
const User = require("./user")

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

  static async handleSearchParty(searchParameters, userId, first, last) {
    
    const pageLimit = 2;

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
    if(searchParameters.hasOwnProperty("type")) {
      typeQuery.equalTo("searchParameters.type", searchParameters.type)
    }
    if(searchParameters.hasOwnProperty("genre")) {
      genreQuery.equalTo("searchParameters.genre", searchParameters.genre)
    }
    if(searchParameters.hasOwnProperty("level")) {
      levelQuery.equalTo("searchParameters.level", searchParameters.level)
    }
    statusQuery.notEqualTo("status", "Closed")
    dmQuery.notEqualTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId })
    findPlayerParties.equalTo("players", user)
    playerQuery.doesNotMatchKeyInQuery("objectId", "objectId", findPlayerParties)

    const reverseTypeQuery = new Parse.Query("Party")
    reverseTypeQuery.doesNotMatchKeyInQuery("objectId", "objectId", typeQuery)
    const reverseGenreQuery = new Parse.Query("Party")
    reverseGenreQuery.doesNotMatchKeyInQuery("objectId", "objectId", genreQuery)
    const reverseLevelQuery = new Parse.Query("Party")
    reverseLevelQuery.doesNotMatchKeyInQuery("objectId", "objectId", levelQuery)

    const firstRequest = async () => {

      const query = Parse.Query.and(experienceQuery, typeQuery, genreQuery, levelQuery, statusQuery, dmQuery, playerQuery)
      query.descending("createdAt")
      query.limit(pageLimit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 100
      })
      if(partiesObjects.length<=pageLimit) {
        const restOfParties = await last75(null, pageLimit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(pageLimit)
      }

      if(first!==null) {
        partiesObjects.reverse();
      }

      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last100 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      } 

      const query = Parse.Query.and(experienceQuery, typeQuery, genreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 100
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last75(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last75 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, typeQuery, genreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 75
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last65(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last65 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, typeQuery, reverseGenreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 65
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last60(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last60 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, genreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 60
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last40(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last40 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, typeQuery, reverseGenreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 40
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last35(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last35 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, genreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 35
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last25(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last25 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, reverseGenreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 25
      })
      if(partiesObjects.length<=limit) {
        const restOfParties = await last0(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...partiesObjects, ...restOfParties.parties], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const last0 = async (lastObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(lastObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(lastObjectId)
        pointerQuery.lessThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, reverseGenreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.descending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 0
      })
      if(partiesObjects.length<=limit) {
        reachedEnd = true;
        return {parties: partiesObjects, reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first100 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      } 

      const query = Parse.Query.and(experienceQuery, typeQuery, genreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 100
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        reachedEnd = true;
        return {parties: partiesObjects, reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first75 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, typeQuery, genreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 75
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first100(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first65 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, typeQuery, reverseGenreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 65
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first75(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first60 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, genreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 60
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first65(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first40 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, typeQuery, reverseGenreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 40
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first60(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first35 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, genreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 35
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first40(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first25 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, reverseGenreQuery, levelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 25
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first35(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    const first0 = async (firstObjectId, limit) => {
      const pointerQuery = new Parse.Query("Party");

      if(firstObjectId!==null) {
        const getLastQuery = new Parse.Query("Party")
        const lastParty = await getLastQuery.get(firstObjectId)
        pointerQuery.greaterThan("createdAt", lastParty.get("createdAt"))
      }

      const query = Parse.Query.and(experienceQuery, reverseTypeQuery, reverseGenreQuery, reverseLevelQuery, statusQuery, dmQuery, playerQuery, pointerQuery)
      query.ascending("createdAt")
      query.limit(limit+1);
      const parties = await query.find();

      const partiesObjects = parties.map(item => {
        return item.toJSON();
      })

      var reachedEnd = false;
      partiesObjects.forEach((item) => {
        item.relevance = 0
      })
      partiesObjects.reverse();
      if(partiesObjects.length<=limit) {
        const restOfParties = await first25(null, limit - partiesObjects.length)
        reachedEnd = restOfParties.reachedEnd;
        return {parties: [...restOfParties.parties, ...partiesObjects], reachedEnd: reachedEnd};
      }
      else {
        partiesObjects.splice(limit)
      }
      return {parties: partiesObjects, reachedEnd: reachedEnd};
    }

    if(last!==null) {
      if(last.relevance === 100)
        return await last100(last.objectId, pageLimit);
      if(last.relevance === 75)
        return await last75(last.objectId, pageLimit);
      if(last.relevance === 65)
        return await last65(last.objectId, pageLimit);
      if(last.relevance === 60)
        return await last60(last.objectId, pageLimit);
      if(last.relevance === 40)
        return await last40(last.objectId, pageLimit);
      if(last.relevance === 35)
        return await last35(last.objectId, pageLimit);
      if(last.relevance === 25)
        return await last25(last.objectId, pageLimit)
      if(last.relevance === 0) 
        return await last0(last.objectId, pageLimit);
      
    }
    if(first!==null) {
      if(first.relevance === 100)
        return await first100(first.objectId, pageLimit);
      if(first.relevance === 75)
        return await first75(first.objectId, pageLimit);
      if(first.relevance === 65)
        return await first65(first.objectId, pageLimit);
      if(first.relevance === 60)
        return await first60(first.objectId, pageLimit);
      if(first.relevance === 45)
        return await first40(first.objectId, pageLimit);
      if(first.relevance === 35)
        return await first35(first.objectId, pageLimit);
      if(first.relevance === 25)
        return await first25(first.objectId, pageLimit)
      if(first.relevance === 0) {
        return await first0(first.objectId, pageLimit);
      }
    }
    return await firstRequest()
  }

  static async handleSearchPartyByName (partyName, userId, first, last) {
    const pageLimit = 2;

    const userQuery = new Parse.Query("User")
    const user = await userQuery.get(userId)
    const ascending = first === null

    
    const nameQuery = new Parse.Query("Party")
    const statusQuery = new Parse.Query("Party")
    const dmQuery = new Parse.Query("Party");
    const findPlayerParties = new Parse.Query("Party")
    const playerQuery = new Parse.Query("Party")
    const firstQuery = new Parse.Query("Party")
    const lastQuery = new Parse.Query("Party")

    statusQuery.notEqualTo("status", "Closed")
    dmQuery.notEqualTo("dm", { '__type': 'Pointer', 'className': '_User', 'objectId': userId })
    findPlayerParties.equalTo("players", user)
    playerQuery.doesNotMatchKeyInQuery("objectId", "objectId", findPlayerParties)
    nameQuery.startsWith("name", partyName)
    
    if(first!==null) {
      firstQuery.lessThan("name", first.name)
    }
    if(last!==null) {
      lastQuery.greaterThan("name", last.name)
    }

    const query = Parse.Query.and(nameQuery, statusQuery, dmQuery, playerQuery, firstQuery, lastQuery)
    query.limit(pageLimit+1);
    if(ascending) {
      query.ascending("name")
    }
    else {
      query.descending("name")
    }
    const parties = await query.find();

    const partiesObjects = parties.map(item => {
      return item.toJSON();
    })

    var reachedEnd = false;
    if(partiesObjects.length<=pageLimit) {
      reachedEnd = true;
    }
    else {
      partiesObjects.splice(pageLimit)
    }

    if(first!==null) {
      partiesObjects.reverse();
    }

    return {parties: partiesObjects, reachedEnd: reachedEnd};
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

  static async addChat(partyId, body) {
    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)

    const sender = await User.getUser(body.senderId)

    const message = new Parse.Object("Message")
    message.set("user", sender)
    message.set("message", body.body)
    await message.save();

    const messages = party.get("messages")
    messages.add(message);
    await party.save();

    return;
  }

  static async getMessages(partyId, body) {

    const getMessageUsers = async (messages) => {
      const newMessages = await Promise.all(messages.map( async item => {
        const user =  item.get("user")
        const userId = user.id
        const userQuery = new Parse.Query("User")
        const messageUser = await userQuery.get(userId)
        const message =  item.get("message")
        const name = messageUser.get("username")
        const picture = messageUser.get("picture")
        return {senderId: userId, user: {username: name, picture: picture}, body: message, ownedByCurrentUser: body.userId === userId}
    }))
    return newMessages
  }

    const partyQuery = new Parse.Query("Party")
    const party = await partyQuery.get(partyId)

    const messagesLimit = 50;

    const messages = party.get("messages")

    const messagesQuery = messages.query();
    messagesQuery.limit(messagesLimit + 1)
    messagesQuery.descending("createdAt")
    const messagesObjects = await messagesQuery.find();

    const returnMessages = await getMessageUsers(messagesObjects)

    //if(Object.keys(body).length !== 0)

    var reachedEnd
    if(messages.length<=messagesLimit) {
      reachedEnd = true;
    }
    returnMessages.reverse();

    return {messages: returnMessages, reachedEnd: reachedEnd}
  }

}

module.exports = Party