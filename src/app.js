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

const date = Date.now();
const time = dayjs().format("HH:mm:ss");

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
    lastStatus: date,
  };

  const messageInsert = {
    from: participant.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time,
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
    to: message.to,
    text: message.text,
    type: message.type,
    time
  }

  try {
    const userExists = await db
      .collection("participants")
      .findOne({ name: user });
    if (!userExists) {
      res.sendStatus(422)
      return;
    }
    await db.collection("messages").insertOne(messageInsert);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(400);
  }
});

//Status Routes

app.post("/status", async (req, res) => {});

app.listen(5000);
