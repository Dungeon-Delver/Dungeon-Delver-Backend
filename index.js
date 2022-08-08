const app = require("./app");
const chatApp = require("./socketServer");

const appPort = process.env.PORT || 3001;
const chatPort = 3002;

app.listen(appPort, () => {
  console.log(`🚀 Server listening on port ` + appPort);
});

chatApp.listen(chatPort, () => {
  console.log(`🚀 Chat server listening on port ` + chatPort);
});
