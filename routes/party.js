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

router.post("/:partyId/delete", async (req, res, next) => {
    try {
        const partyId = req.params.partyId;
        const dm = req.body.dm
        await Party.deleteParty(partyId, dm)
        res.status(201).json({})
    }
    catch(err) {
        next(err)
    }
})

module.exports=router;