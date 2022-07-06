const express = require("express")
const router = express.Router()
const User = require("../models/user")
const { NotFoundError } = require("../utils/errors")

router.post("/", async (req, res, next) => {
  try {
    const userData = req.body.userData
    console.log('userData: ', userData);
    const newUser = await User.handleFacebookLogin(userData)
    res.status(201).json({ newUser: newUser })
  } catch (err) {
    next(err)
  }
})

router.get("/users/:userId/party", async (req, res, next) => {
    try {
        const userId = req.params.userId
        //const parties = await Party.listParties(userId)
        res.status(200).json({ parties })
    }
    catch(err) {
        next(err)
    }
})

router.delete("/user/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId
    //await Party.listParties(userId);
    res.status(204);
  }
  catch(err) {
    next(err)
  }
})

router.post("/", async (req, res, next) => {
  try {
    const userData = req.body
    const newUser = await User.recordOrder(userData)
    res.status(201).json({ newUser: newUser })
  } catch (err) {
    next(err)
  }
})

module.exports = router;