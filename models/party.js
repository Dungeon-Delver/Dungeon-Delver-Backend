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
    if(!dm.get("enabled")&&dm.get("numParties") < 100) {
      console.log("disabled user")
      throw new BadRequestError("Attempting to create party for disabled user")
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
      return party;
  }

}

module.exports = Party