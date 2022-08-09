const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/:userId/", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.getUser(userId);
    res.status(200).json({ user });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/:userId/parties", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const parties = await User.listParties(userId);
    res.status(200).json({ parties });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/join", async (req, res, next) => {
  try {
    const userId = req.body.userId.objectId;
    const partyId = req.params.partyId;
    const notification = await User.requestPartyJoin(userId, partyId);
    res.status(201).json({ notification });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/leave", async (req, res, next) => {
  try {
    const userId = req.body.userId.objectId;
    const partyId = req.params.partyId;
    const notification = await User.partyLeave(userId, partyId);
    res.status(201).json({ notification });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/read-notifications", async (req, res, next) => {
  try {
    const notifications = req.body.notifications;
    await User.readNotifications(notifications);
    res.status(201).json({});
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/cancel-join", async (req, res, next) => {
  try {
    const userId = req.body.userId.objectId;
    const partyId = req.params.partyId;
    const notification = await User.cancelJoin(userId, partyId);
    res.status(201).json({ notification });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/:userId/in/party/:partyId", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const partyId = req.params.partyId;
    const inParty = await User.inParty(userId, partyId);
    res.status(200).json({ inParty });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:userId/notifications", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const first = req.body.first;
    const last = req.body.last;
    const notifications = await User.getNotifications(userId, first, last);
    res.status(200).json({ notifications });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/:userId/profile", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const data = await User.getProfileData(userId);
    res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
