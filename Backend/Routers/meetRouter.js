const express = require("express");
const userAuth = require("../middlewares/userAuth");
const Meeting = require("../models/meeting");
const Transcripts = require("../models/transcripts");
const req = require("express/lib/request");
const meetRouter = express.Router();

meetRouter.get("/allmeetings", userAuth, async (req, res) => {
  const { _id } = req.user;
  try {
    const data = await Meeting.find({ userId: _id });
    res.json({
      data: data,
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

meetRouter.get("/:meetingId", userAuth, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { _id } = req.user;
    const data = await Meeting.findById(meetingId);
    if (!data) {
      throw new Error("No meeting Found");
    }
    const transcripts = await Transcripts.findOne({
      meetingId: meetingId,
    });
    res.json({
      data: transcripts,
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = meetRouter;
