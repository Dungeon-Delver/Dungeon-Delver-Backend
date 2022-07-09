const { BadRequestError } = require("../utils/errors")
const Keys = require("../keys.json")

const Parse = require("parse/node");
Parse.initialize(Keys.parse.appId, Keys.parse.javascriptKey)
Parse.serverURL = 'https://parseapi.back4app.com';

class Party {
  static async handleCreateParty(body) {
    console.log(body);
    try{
      const Users = Parse.Object.extend("User");
      const users = new Parse.Query(Users);

      try {
        const dm = await users.get(body.dm);
        console.log(dm)
      }
      catch(error) {
        console.error(error)
      }
    }
    catch (error) {
      console.log(error);
    }
    return true;
  }

}

module.exports = Party