const express = require("express")
const router = express.Router()
const Party = require("../models/party")
const { NotFoundError } = require("../utils/errors")



router.get("/:page", async (req, res, next) => {
    try {
        const pageNumber = req.params.page
        //const orders = await Store.listProductsByPage(pageNumber-1)
        res.status(200).json({ orders })
    }
    catch(err) {
        next(err)
    }
})

router.post("/create-party", async (req, res, next) => {
    try {
        const body = req.body;
        const newParty = await Party.handleCreateParty(body)
        res.status(201).json({ newParty })
    }
    catch(err) {
        next(err)
    }
})

module.exports=router;