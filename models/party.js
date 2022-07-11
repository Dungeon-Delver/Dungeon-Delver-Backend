const { BadRequestError } = require("../utils/errors")
const Keys = require("../keys.json")

const Parse = require("parse/node");
Parse.initialize(Keys.parse.appId, Keys.parse.javascriptKey)
Parse.serverURL = 'https://parseapi.back4app.com';

class Party {
  static async handleCreateParty(body) {
    console.log('body: ', body);
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
    try {
      const query = new Parse.Query("User");
      const dm = await query.get(body.dm.objectId);
      newParty.set("dm", dm)
    }
    catch (error) {
      console.log(error);
    }
    newParty.set("searchParameters", body.searchParameters)
    newParty.set("status", body.mode)
    try{
      let result = await newParty.save()
      return result.id;
    }
    catch (error) {
      console.log(error)
      return null; 
    }
  }

}

module.exports = Party