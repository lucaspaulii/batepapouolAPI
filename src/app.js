import express from "express";
import cors from "cors";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient('mongodb://localhost:27017');
let db;
mongoClient.connect(() => {
  db = mongoClient.db("batepapouol");
});

//Participants

app.get('/participants', async (req, res) => {

});

app.post('/participants', async (req, res) => {

});

//Messages

app.get('/messages', async (req, res) => {

});

app.post('/messages', async (req, res) => {

});

//status

app.post('/status', async (req, res) => {
    
})

app.listen(5000);
