import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import joi from "joi";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const participantScheme = joi.object({
  name: joi.string().required().min(2),
});

const messagesScheme = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
await mongoClient.connect();
db = mongoClient.db("batepapouol");

// Removing Expired Participants

setInterval(async () => {
  const EXPIRINGINTERVAL = 10000;
  try {
    const participants = await db.collection("participants").find().toArray();
    let expiredParticipants = participants.filter((obj) => {
      return obj.lastStatus < Date.now() - EXPIRINGINTERVAL;
    });
    expiredParticipants.forEach(async (obj) => {
      await db.collection("participants").deleteOne({ _id: obj._id });
      const messageInsert = {
        from: obj.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      };
      await db.collection("messages").insertOne(messageInsert);
    });
  } catch (error) {
    console.log(error);
  }
}, 15000);

//Participants Routes

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (error) {
    res.sendStatus(400);
  }
});

app.post("/participants", async (req, res) => {
  const participant = req.body;
  const validation = participantScheme.validate(participant, {
    abortEarly: false,
  });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }
  const participantInsert = {
    name: participant.name,
    lastStatus: Date.now(),
  };

  const messageInsert = {
    from: participant.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };
  try {
    const userExists = await db
      .collection("participants")
      .findOne({ name: participant.name });
    if (userExists) {
      res.status(409).send("name already in use");
      return;
    }
    await db.collection("participants").insertOne(participantInsert);

    await db.collection("messages").insertOne(messageInsert);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(400);
  }
});

//Messages Routes

app.get("/messages", async (req, res) => {
  try {
    const messages = await db.collection("messages").find().toArray();
    res.send(messages);
  } catch (error) {
    res.sendStatus(400);
  }
});

app.post("/messages", async (req, res) => {
  const message = req.body;
  const user = req.headers.user;
  const validation = messagesScheme.validate(message, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  const messageInsert = {
    from: user,
    to: message.to,
    text: message.text,
    type: message.type,
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    const userExists = await db
      .collection("participants")
      .findOne({ name: user });
    if (!userExists) {
      res.sendStatus(422);
      return;
    }
    await db.collection("messages").insertOne(messageInsert);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(400);
  }
});

app.delete("/messages/:id", async (req, res) => {
  const id = req.params.id;
  const user = req.headers.user;

  try {
    const message = await db
      .collection("messages")
      .findOne({ _id: ObjectId(id) });
    if (!message || (message.from !== user)) {
      res.sendStatus(404);
      return;
    }
    await db.collection("messages").deleteOne({ _id: message._id });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

app.put("/messages/:id", async (req, res) => {
  const id = req.params.id;
  const user = req.headers.user;
  const body = req.body;

  const validation = messagesScheme.validate(body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  const messageInsert = {
    from: user,
    to: body.to,
    text: body.text,
    type: body.type,
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    const message = await db
      .collection("messages")
      .findOne({ _id: ObjectId(id) });
    if (!message || (message.from !== user)) {
      res.sendStatus(404);
      return;
    }
    await db.collection("messages").updateOne(
      { _id: message._id },
      {
        $set: messageInsert
      }
    );
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

//Status Routes

app.post("/status", async (req, res) => {
  const user = req.headers.user;

  try {
    const userExists = await db
      .collection("participants")
      .findOne({ name: user });
    if (!userExists) {
      res.sendStatus(404);
      return;
    }
    await db.collection("participants").updateOne(
      { _id: userExists._id },
      {
        $set: {
          name: userExists.name,
          lastStatus: Date.now(),
        },
      }
    );
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

app.listen(5000);
