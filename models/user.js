const { BadRequestError } = require("../utils/errors")

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
        try {
          let loggedInUser = await userToLogin
          .linkWith('facebook', {
            authData: {id: userId, access_token: userAccessToken},
          });
          // logIn returns the corresponding ParseUser object
          alert(
            `Success! User ${loggedInUser.get('username')} has successfully signed in!`,
          );
          // Update state variable holding current user
          getCurrentUser();
          return true;
        } catch (error) {
          // Error can be caused by wrong parameters or lack of Internet connection
          alert(`Error! ${error.message}`);
          return false;
        }
      } catch (error) {
        console.log("Error gathering Facebook user info, please try again!")
        return false;
      }
    }
  }
}

module.exports = User