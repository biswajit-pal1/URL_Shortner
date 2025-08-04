// 

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
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
const PORT = process.env.PORT || 3500;
const MONGODB_URI = process.env.MONGODB_URI;

// Database connection
const connectDB = async () => {
  try {
    const instance = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB Connected: ${instance.connection.host}`);
  } catch (e) {
    console.log(e);
  }
};

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// View engine setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../frontend/views'));

// Static files
const frontendPath = path.resolve(__dirname, '../frontend/public');
app.use(express.static(frontendPath));

// Session configuration
const store = MongoStore.create({
    mongoUrl: MONGODB_URI,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("Error in Mongo Session Store", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global middleware
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// Helper Functions
const destroyPreviousSession = (sessionStore, sessionId) => {
    return new Promise((resolve) => {
        if (!sessionId) {
            resolve();
            return;
        }
        
        sessionStore.destroy(sessionId, (err) => {
            if (err) {
                console.error("Error destroying previous session:", err);
            }
            resolve();
        });
    });
};

// Middleware
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be signed in");
        return res.redirect("/login");
    }
    next();
};

// Session validation middleware
app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user.activeSessionId && req.user.activeSessionId !== req.sessionID) {
        req.logout((err) => {
            if (err) console.error("Error during forced logout:", err);
            req.flash("error", "Your session has been terminated due to login from another device.");
            return res.redirect("/login");
        });
        return;
    }
    next();
});

// Routes

// Landing Page
app.get('/', (req, res) => {
    res.render("index.ejs", { user: req.user });
});

// Authentication Routes
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

app.post("/signup", async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        
        req.login(registeredUser, async (err) => {
            if (err) return next(err);
            
            try {
                registeredUser.activeSessionId = req.sessionID;
                await registeredUser.save();
            } catch (saveErr) {
                console.error("Error saving session ID for new user:", saveErr);
            }
            
            req.flash("success", "Welcome to URL Shortener!");
            res.redirect("/?success=true");
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", { 
    failureRedirect: "/login", 
    failureFlash: true 
}), async (req, res) => {
    try {
        const previousSessionId = req.user.activeSessionId;
        
        // Destroy previous session if exists and different
        if (previousSessionId && previousSessionId !== req.sessionID) {
            await destroyPreviousSession(req.sessionStore, previousSessionId);
        }
        
        // Update user with new session ID
        req.user.activeSessionId = req.sessionID;
        await req.user.save();
        
        req.flash("success", "Login Success!");
        res.redirect("/?loginSuccess=true");
    } catch (err) {
        console.error("Error updating active session ID:", err);
        req.flash("error", "Failed to log in.");
        res.redirect("/login");
    }
});

app.get("/logout", async (req, res, next) => {
    try {
        // Clear activeSessionId from user
        if (req.user) {
            req.user.activeSessionId = null;
            await req.user.save();
        }
        
        const currentSessionId = req.sessionID;
        
        req.logOut((err) => {
            if (err) return next(err);
            
            // Destroy session from store
            req.sessionStore.destroy(currentSessionId, (destroyErr) => {
                if (destroyErr) {
                    console.error("Error destroying session on logout:", destroyErr);
                }
            });
            
            req.flash("success", "You are logged out!");
            res.redirect("/");
        });
    } catch (err) {
        console.error("Error during logout:", err);
        req.flash("error", "Error during logout");
        res.redirect("/");
    }
});

// Protected Routes
app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs');
});

// API Routes
app.post('/api/shorten', isLoggedIn, async (req, res) => {
    try {
        const { full } = req.body;
        
        const existingUrl = await Url.findOne({
            full: full,
            owner: req.user._id
        });

        if (existingUrl) {
            return res.json(existingUrl);
        }

        let short;
        let exists = true;
        
        while (exists) {
            short = nanoid(6);
            exists = await Url.findOne({ short });
        }

        const newUrl = new Url({
            full,
            short,
            owner: req.user._id,
            clicks: 0
        });

        await newUrl.save();
        res.json(newUrl);
    } catch (err) {
        console.error('Error creating short URL:', err);
        res.status(500).json({ error: 'Failed to create short URL' });
    }
});

app.get('/api/urls/user', isLoggedIn, async (req, res) => {
    try {
        const urls = await Url.find({ owner: req.user._id }).sort({ _id: -1 });
        res.json(urls);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch URLs' });
    }
});

app.delete('/api/urls/:short', isLoggedIn, async (req, res) => {
    try {
        const url = await Url.findOneAndDelete({ 
            short: req.params.short, 
            owner: req.user._id 
        });
        
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }
        
        res.json({ message: 'URL deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete URL' });
    }
});

// URL redirect route (must be last)
app.get('/:short', async (req, res) => {
    try {
        const shortUrl = await Url.findOne({ short: req.params.short });
        if (!shortUrl) {
            return res.status(404).render('404');
        }
        
        shortUrl.clicks++;
        await shortUrl.save();
        res.redirect(shortUrl.full);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Error handling
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

// Start server
app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running at http://localhost:${PORT}`);
});

