import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { nanoid } from "nanoid";
import path from 'path';
import { fileURLToPath } from 'url';

import Url from './models.js'


const app = express();


const SERVER_PORT = process.env.SERVER_PORT || 3500;
const MONGODB_URL = process.env.MONGODB_URL;


const connectDB = async () => {
  try {
    const instance = await mongoose.connect(MONGODB_URL);
    console.log(`MongoDB Connected: ${instance.connection.host}`);
  } catch (e) {
    console.log(e);
  }
};




app.use(express.json());
app.use(cors());


// __dirname workaround for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve absolute path to frontend
const frontendPath = path.resolve(__dirname, '../frontend');

// Serve static files (CSS, JS) from frontend
app.use(express.static(frontendPath));


// Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Redirects to url
app.post('/shorten', async (req, res) => {
  const { full } = req.body;
  const existing = await Url.findOne({ full });
  if (existing) return res.json(existing);

  const short = nanoid(6);
  const newUrl = new Url({ full, short });
  await newUrl.save();
  res.json(newUrl);
});

// Short the url here
app.get('/:short', async (req, res) => {
  const shortUrl = await Url.findOne({ short: req.params.short });
  if (!shortUrl) return res.status(404).send('URL not found');
  
  shortUrl.clicks++;
  await shortUrl.save();
  res.redirect(shortUrl.full);
});




app.listen(SERVER_PORT, () => {
    connectDB();
    console.log(`Server running at ${SERVER_PORT}`);
})