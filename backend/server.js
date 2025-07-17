import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { nanoid } from "nanoid";
import path from 'path';
import { fileURLToPath } from 'url';
import LocalStrategy from "passport-local"
import MongoStore from "connect-mongo";
import session from "express-session";
import passport from "passport";
import flash from "connect-flash"
import ejsMate from "ejs-mate"


import Url from './models/url.js'
import User from "./models/user.js";


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

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../frontend/views'));
app.use(express.urlencoded({extended: true}));


const store = MongoStore.create({
    mongoUrl: MONGODB_URL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter : 24 * 3600,
});

store.on("error", (err) => {
    console.log("Error in Mongo Session Store", err);
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// Resolve absolute path to frontend
const frontendPath = path.resolve(__dirname, '../frontend/public');

// Serve static files (CSS, JS) from frontend
app.use(express.static(frontendPath));


// Landing Page
app.get('/', (req, res) => {
  // res.sendFile(path.join(frontendPath, 'index.html'));
  res.render("index.ejs");
});

// Redirects to url
app.post('/shorten', async (req, res) => {
  const { full } = req.body;
  const existing = await Url.findOne({ full });
  if (existing) return res.json(existing);

  const short = nanoid(6);
  const newUrl = new Url({ full, short });
  newUrl.owner = req.user._id;
  await newUrl.save();
  res.json(newUrl);
});

//signup
app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});


app.post("/signup", async (req, res, next) => {
  try {
        let {username, email, password} = req.body;
        const newUser = new User({username, email});    
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if(err) {
                return next(err);
            }
            req.flash("success", "Signup complete!");
            res.redirect("/");
        });
    } catch(err) {
        console.log(err.message);
        req.flash("error", err.message);
        res.redirect("/signup");
    }
});

//login
app.get("/login", (req, res) => {
  res.render("login.ejs");
});


app.post("/login", passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), async(req, res) => {
  req.flash("success", "Login Success!");
    res.redirect("/")
} );

//Logout
app.get("/logout", (req, res) => {
  req.logOut((err) => {
        if(err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/");
    })
})

// Short the url here
app.get('/:short', async (req, res) => {
  const shortUrl = await Url.findOne({ short: req.params.short });
  if (!shortUrl) return res.status(404).send('URL not found');
  
  shortUrl.clicks++;
  await shortUrl.save();
  res.redirect(shortUrl.full);
});



app.use((err, req, res, next) => {
    let {statusCode = 500, message = "Something went worng"} = err;
    res.status(statusCode).render("error.ejs", {message});
});


app.listen(SERVER_PORT, () => {
    connectDB();
    console.log(`Server running at ${SERVER_PORT}`);
})