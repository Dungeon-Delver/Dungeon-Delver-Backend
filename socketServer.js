const axios = require("axios");
const { BACKEND_URL } = require("./constants.js");
const app = require("http").createServer();
const io = require("socket.io")(app, {
  cors: {
    origin: "*",
  },
});

const NEW_CHAT_MESSAGE_EVENT = "newChatMessage";
const NEW_NOTIFICATION_EVENT = "newNotification";

io.on("connect", (socket) => {
  // Join a conversation
  const { roomId } = socket.handshake.query;
  socket.join(roomId);

  // Listen for new messages
  socket.on(NEW_CHAT_MESSAGE_EVENT, async (data) => {
    let date;
    try {
      response = await axios.post(
        `${BACKEND_URL}party/${data.partyId}/chat`,
        data
      );
      date = response.data.date;
    } catch (error) {
      console.error(error);
    }
    data.createdAt = date;
    io.in(roomId).emit(NEW_CHAT_MESSAGE_EVENT, data);
  });

  socket.on(NEW_NOTIFICATION_EVENT, async (data) => {
    io.in(roomId).emit(NEW_NOTIFICATION_EVENT, data);
  });

  // Leave the room if the user closes the socket
  socket.on("disconnect", () => {
    socket.leave(roomId);
  });
});

module.exports = app;
