const express = require("express");
const router = express.Router();
const Party = require("../models/party");

router.post("/create-party", async (req, res, next) => {
  try {
    const body = req.body;
    const newParty = await Party.handleCreateParty(body);
    if (newParty == null) {
      throw new Error("Internal Server Error");
    }
    res.status(201).json({ newParty });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/:partyId", async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const party = await Party.getParty(partyId);
    res.status(200).json({ party });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/search", async (req, res, next) => {
  try {
    const searchParameters = req.body.searchParameters;
    const partyName = req.body.name;
    var first = null;
    var last = null;
    if (req.body.hasOwnProperty("first")) {
      first = req.body.first;
    } else if (req.body.hasOwnProperty("last")) {
      last = req.body.last;
    }
    const userId = req.body.user;
    let response;
    if (searchParameters)
      response = await Party.handleSearchParty(
        searchParameters,
        userId,
        first,
        last
      );
    else {
      response = await Party.handleSearchPartyByName(
        partyName,
        userId,
        first,
        last
      );
    }
    res.status(201).json({ response });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/:partyId/requested", async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const users = await Party.getRequestedUsers(partyId);
    res.status(200).json({ users });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/:partyId/members", async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const result = await Party.getMembers(partyId);
    res.status(200).json({ result });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/accept/:userId", async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const userId = req.params.userId;
    const dm = req.body.dm;
    const notification = await Party.acceptUser(partyId, userId, dm);
    res.status(201).json({ notification });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/reject/:userId", async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const userId = req.params.userId;
    const dm = req.body.dm;
    const notification = await Party.rejectUser(partyId, userId, dm);
    res.status(201).json({ notification });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/remove/:userId", async (req, res, next) => {
  try {
    const dmId = req.body.dm.objectId;
    const userId = req.params.userId;
    const partyId = req.params.partyId;
    const notification = await Party.partyRemove(dmId, userId, partyId);
    res.status(201).json({ notification });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/modify", async (req, res, next) => {
  try {
    const body = req.body;
    const partyId = req.params.partyId;
    const party = await Party.handleModifyParty(partyId, body);
    if (party == null) {
      throw new Error("Internal Server Error");
    }
    res.status(201).json({});
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/delete", async (req, res, next) => {
  try {
    const partyId = req.params.partyId;
    const dm = req.body.dm;
    const notifications = await Party.deleteParty(partyId, dm);
    res.status(201).json({ notifications });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/chat", async (req, res, next) => {
  try {
    const body = req.body;
    const partyId = req.params.partyId;
    const date = await Party.addChat(partyId, body);
    res.status(201).json({ date });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/:partyId/messages", async (req, res, next) => {
  try {
    const body = req.body;
    const partyId = req.params.partyId;
    const messages = await Party.getMessages(partyId, body);
    res.status(201).json({ messages });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
