const Parse = require("parse/node");

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const morgan = require('morgan')
const cors = require("cors")

app.use(cors())
app.use(bodyParser.json()) //allows us to send objects
app.use(morgan('tiny')) //used for logging

Parse.initialize("IvTGkq3kv3I80nw5fzWt27UAKejyHrsvaECfTnDl", "jiBr1kosmfAh19kpj6pDOSvJBz6G8WCqFy5KmNrk")
Parse.serverURL = 'https://parseapi.back4app.com';

//app.post('/login')

module.exports = app;