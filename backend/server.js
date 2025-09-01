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
import nodemailer from "nodemailer"

import Url from './models/url.js'
import User from "./models/user.js";
import OTP from './models/otp.js'

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
// app.use((req, res, next) => {
//     if (req.isAuthenticated() && req.user.activeSessionId && req.user.activeSessionId !== req.sessionID) {
//         req.logout((err) => {
//             if (err) console.error("Error during forced logout:", err);
//             req.flash("error", "Your session has been terminated due to login from another device.");
//             // return res.redirect("/login");
//         });
//         return;
//     }
//     next();
// });

// Routes

// Landing Page
app.get('/', (req, res) => {
    res.render("index.ejs", { user: req.user });
});

// Authentication Routes
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

// app.post("/signup", async (req, res, next) => {
//     try {
//         let { username, email, password } = req.body;
//         const newUser = new User({ username, email });
//         const registeredUser = await User.register(newUser, password);
        
//         req.login(registeredUser, async (err) => {
//             if (err) return next(err);
            
//             try {
//                 registeredUser.activeSessionId = req.sessionID;
//                 await registeredUser.save();
//             } catch (saveErr) {
//                 console.error("Error saving session ID for new user:", saveErr);
//             }
            
//             req.flash("success", "Welcome to URL Shortener!");
//             res.redirect("/?success=true");
//         });
//     } catch (err) {
//         req.flash("error", err.message);
//         res.redirect("/signup");
//     }
// });


app.post("/signup", async (req, res, next) => {
    console.log("=== SIGNUP ROUTE START ===");
    console.log("Request headers:", req.headers['content-type']);
    console.log("Session ID:", req.sessionID);
    
    try {
        let { username, email, password } = req.body;
        console.log("Creating user with:", { username, email });
        
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        console.log("User registered successfully:", registeredUser._id);
        
        req.login(registeredUser, (err) => {
            if (err) {
                console.error("Login error after registration:", err);
                return next(err);
            }
            
            console.log("User logged in successfully");
            console.log("req.user after login:", req.user ? req.user._id : 'No user');
            console.log("req.isAuthenticated():", req.isAuthenticated());
            
            // Save session explicitly
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error("Session save error:", saveErr);
                }
                
                // Update user with session ID
                registeredUser.activeSessionId = req.sessionID;
                registeredUser.save().then(() => {
                    console.log("Session ID saved to user");
                    
                    // Check if this is a JSON request
                    if (req.headers['content-type'] === 'application/json') {
                        console.log("Sending JSON response");
                        res.json({ 
                            success: true, 
                            message: "Account created successfully!",
                            redirectUrl: "/"
                        });
                    } else {
                        console.log("Doing redirect response");
                        req.flash("success", "Welcome to URL Shortener!");
                        res.redirect("/?success=true");
                    }
                }).catch((userSaveErr) => {
                    console.error("Error saving session ID to user:", userSaveErr);
                    // Still proceed with response even if this fails
                    if (req.headers['content-type'] === 'application/json') {
                        res.json({ 
                            success: true, 
                            message: "Account created successfully!",
                            redirectUrl: "/"
                        });
                    } else {
                        req.flash("success", "Welcome to URL Shortener!");
                        res.redirect("/?success=true");
                    }
                });
            });
        });
    } catch (err) {
        console.error("Signup error:", err);
        if (req.headers['content-type'] === 'application/json') {
            res.status(400).json({ 
                success: false, 
                message: err.message 
            });
        } else {
            req.flash("error", err.message);
            res.redirect("/signup");
        }
    }
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: "smtp.gmail.com", // SMTP server host
  port: 465, // Port for SSL/TLS
  secure: true, // Use SSL/TLS (for port 465, secure should be true)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Route
app.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email });

    // Generate new OTP
    const otp = generateOTP();

    // Create OTP document
    const otpDoc = new OTP({
      email,
      otp,
      expiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0
    });

    const savedOTP = await otpDoc.save();

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification - URL Shortener',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d6efd;">Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 2em; letter-spacing: 5px; color: #0d6efd;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otpId: savedOTP._id.toString()
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP Route
app.post('/verify-otp', async (req, res) => {
  try {
    const { otpId, otp } = req.body;

    // Validate input
    if (!otpId || !otp) {
      return res.status(400).json({ message: 'OTP ID and OTP are required' });
    }

    // Find OTP document
    const otpDoc = await OTP.findById(otpId);

    if (!otpDoc) {
      return res.status(404).json({ message: 'Invalid OTP ID' });
    }

    // Check if expired
    if (new Date() > otpDoc.expiry) {
      await OTP.findByIdAndDelete(otpId);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Check attempts (rate limiting)
    if (otpDoc.attempts >= 3) {
      await OTP.findByIdAndDelete(otpId);
      return res.status(400).json({ message: 'Too many attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpDoc.otp !== otp) {
      // Increment attempts
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // OTP is correct - mark as verified
    otpDoc.verified = true;
    await otpDoc.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      otpId: otpId
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
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

