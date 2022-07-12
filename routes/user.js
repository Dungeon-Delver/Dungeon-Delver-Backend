const express = require("express")
const Party = require("../models/party")
const router = express.Router()
const User = require("../models/user")
const { NotFoundError } = require("../utils/errors")

router.post("/", async (req, res, next) => {
  try {
    const body = req.body;
    const newUser = await User.handleFacebookLogin(body)
    res.status(201).json({ newUser: newUser })
  } catch (err) {
    next(err)
  }
})

router.get("/:userId/party", async (req, res, next) => {
    try {
      const userId = req.params.userId
      const parties = await Party.listParties(userId)
      res.status(200).json({ parties })
    }
    catch(err) {
      next(err)
    }
})

router.post("/:userId/disable", async (req, res, next) => {
  try {
    const userId = req.params.userId
    //await Party.listParties(userId);
    res.status(204);
  }
  catch(err) {
    next(err)
  }
})

module.exports = router;