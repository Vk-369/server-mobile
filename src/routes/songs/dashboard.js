const express = require("express");
const Joi = require("joi");

const DashboardRoutes = express.Router();

const songsDetails = require("../../models/songs"); 

const { encrypt, decrypt } = require("../../library/encryption");
const { jwtAuth } = require('../../library/Auth')

DashboardRoutes.get(
    "/get/recommendations/previouslyPlayed/song",
    jwtAuth,
    async function (req, res, next) {
        console.log("API is -/get/recommendations/previouslyPlayed/song", req.body);
        const result = {};
        try {
            const songData = await songsDetails.find({}).limit(10);
            console.log(songData, "this is the song data for recommendations");
            result.success = true;
            result.error = false;
            result.message = "Successfully fetched";
            result.data = songData;
            return res.send(encrypt(result));
            // res.send(result)
        } catch (error) {
            console.error(error);
            // return res.status(500).json({ error: "Internal server error" });
            result.error = true;
            result.success = false;
            result.message =
                "unable to fetch the recommendations/previously played list";
            return res.status(500).send(encrypt(result));
        }
    }
);

module.exports = DashboardRoutes