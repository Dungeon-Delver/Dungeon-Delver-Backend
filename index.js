const app = require("./app");
const server = require('http').createServer(app);
const chatApp = require("./socketServer")(server);

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`🚀 Server listening on port ` + port);
});
