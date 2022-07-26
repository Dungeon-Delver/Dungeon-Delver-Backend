const express = require("express")
const router = express.Router()
const Party = require("../models/party")
const { NotFoundError, BadRequestError } = require("../utils/errors")

router.post("/create-party", async (req, res, next) => {
    try {
        const body = req.body;
        const newParty = await Party.handleCreateParty(body)
        if(newParty == null) {
            throw new Error("Internal Server Error")
        }
        res.status(201).json({ newParty })
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.get("/:partyId", async (req, res, next) => {
    try {
        const partyId = req.params.partyId
        const party = await Party.getParty(partyId)
        res.status(200).json({ party })
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/search", async (req, res, next) => {
    try {
        const searchParameters = req.body.searchParameters;
        const userId = req.body.user
        const parties = await Party.handleSearchParty(searchParameters, userId)
        res.status(201).json({ parties })
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.get("/:partyId/requested", async (req, res, next) => {
    try {
        const partyId = req.params.partyId;
        const users = await Party.getRequestedUsers(partyId);
        res.status(200).json({users})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.get("/:partyId/members", async (req, res, next) => {
    try {
        const partyId = req.params.partyId;
        const result = await Party.getMembers(partyId);
        res.status(200).json({result})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/:partyId/accept/:userId", async (req, res, next) => {
    try {
        const partyId = req.params.partyId;
        const userId = req.params.userId
        const dm = req.body.dm
        const users = await Party.acceptUser(partyId, userId, dm);
        res.status(201).json({users})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/:partyId/reject/:userId", async (req, res, next) => {
    try {
        const partyId = req.params.partyId;
        const userId = req.params.userId
        const dm = req.body.dm
        const users = await Party.rejectUser(partyId, userId, dm);
        res.status(201).json({users})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/:partyId/remove/:userId", async (req, res, next) => {
  try {
    const dmId = req.body.dm.objectId
    const userId = req.params.userId
    const partyId = req.params.partyId;
    await Party.partyRemove(dmId, userId, partyId)
    res.status(201).json({})
  }
  catch(err) {
    console.log(err)
    next(err)
  }
})

router.post("/:partyId/modify", async (req, res, next) => {
    try {
        const body = req.body;
        const partyId = req.params.partyId
        const party = await Party.handleModifyParty(partyId, body)
        if(party == null) {
            throw new Error("Internal Server Error")
        }
        res.status(201).json({})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/:partyId/delete", async (req, res, next) => {
    try {
        const partyId = req.params.partyId;
        const dm = req.body.dm
        await Party.deleteParty(partyId, dm)
        res.status(201).json({})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/:partyId/chat", async (req, res, next) => {
    try {
        const body = req.body;
        const partyId = req.params.partyId
        await Party.addChat(partyId, body)
        res.status(201).json({})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

router.post("/:partyId/messages", async (req, res, next) => {
    try {
        const body = req.body;
        const partyId = req.params.partyId
        const messages = await Party.getMessages(partyId, body)
        res.status(201).json({messages})
    }
    catch(err) {
        console.log(err)
        next(err)
    }
})

module.exports=router;