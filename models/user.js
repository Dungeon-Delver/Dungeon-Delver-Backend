const { BadRequestError } = require("../utils/errors")

const Parse = require("parse/node");
Parse.initialize("IvTGkq3kv3I80nw5fzWt27UAKejyHrsvaECfTnDl", "jiBr1kosmfAh19kpj6pDOSvJBz6G8WCqFy5KmNrk")
Parse.serverURL = 'https://parseapi.back4app.com';

class User {
  static async handleFacebookLogin(response) {
    // Check if response has an error
    if (response.error !== undefined) {
      console.log(`Error: ${response.error}`);
      return false;
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
        userToLogin.set('username', userEmail);
        userToLogin.set('email', userEmail);
        userToLogin.set('name', response.name);
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
          return true;
        } catch (error) {
          // Error can be caused by wrong parameters or lack of Internet connection
          console.error(`Error! ${error.message}`);
          return false;
        }
      } catch (error) {
        console.error("Error gathering Facebook user info, please try again!", error)
        return false;
      }
    }
  }
}

module.exports = User