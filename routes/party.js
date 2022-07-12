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
    console.log("hi")
    try {
        const partyId = req.params.partyId
        const party = await Party.getParty(partyId)
        res.status(200).json({ party })
    }
    catch(err) {
        next(err)
    }
})

module.exports=router;