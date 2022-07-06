const Parse = require("parse/node");

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const morgan = require('morgan')
const cors = require("cors")

const userRouter = require("./routes/user.js")
const partyRouter = require("./routes/party.js")

app.use(cors())
app.use(bodyParser.json()) //allows us to send objects
app.use(morgan('tiny')) //used for logging

app.use("/user", userRouter)
app.use("/party", partyRouter)

Parse.initialize("IvTGkq3kv3I80nw5fzWt27UAKejyHrsvaECfTnDl", "jiBr1kosmfAh19kpj6pDOSvJBz6G8WCqFy5KmNrk")
Parse.serverURL = 'https://parseapi.back4app.com';

app.get('/', (req, res) => {
  res.send({"ping": "pong"})
})


app.use((req, res, next) => {
  return next(new errors.NotFoundError())
})

app.use((error, req, res, next) => {
const status = error.status || 500
const message = error.message

return res.status(status).json({
  error: { message, status },
})
})

module.exports = app;