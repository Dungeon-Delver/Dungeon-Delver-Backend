const { BadRequestError } = require("../utils/errors")
const Keys = require("../keys.json")

const Parse = require("parse/node");
Parse.initialize(Keys.parse.appId, Keys.parse.javascriptKey)
Parse.serverURL = 'https://parseapi.back4app.com';

class User {
  static async handleFacebookLogin(response) {
    // Check if response has an error
    if(!response.hasOwnProperty("userData")) {
      throw new BadRequestError("No UserData");
    }
    response = response.userData;
    if (response.error !== undefined) {
      console.log(`Error: ${response.error}`);
      throw new BadRequestError();
    } else {
      try {
        // Gather Facebook user info
        const userId = response.id;
        const userEmail = response.email;
        const userAccessToken = response.accessToken;
        // Try to login on Parse using linkWith and these credentials
        // Create a new Parse.User object
        const userToLogin = new Parse.User();
        // Set username and email to match facebook profile email
        userToLogin.set('username', response.name);
        userToLogin.set('email', userEmail);
        userToLogin.set('picture', response.picture.data.url);        
        try {
          let loggedInUser = await userToLogin
          .linkWith('facebook', {
            authData: {id: userId, access_token: userAccessToken},
          });
          // logIn returns the corresponding ParseUser object
          console.log(
            `Success! User ${loggedInUser.get('username')} has successfully signed in!`,
          );
          return loggedInUser.id;
        } catch (error) {
          // Error can be caused by wrong parameters or lack of Internet connection
          console.error(`Error! ${error.message}`);
          return false;
        }
      } catch (error) {
        console.error("Error gathering Facebook user info, please try again!", error)
        throw new BadRequestError();
      }
    }
  }
}

module.exports = User