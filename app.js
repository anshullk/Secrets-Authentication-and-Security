//require the dotenv as early as possible
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// the order should not be messed up as one thing depends on another to work.
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//"passport-local" will be one of the dependencies that will be required by "passport-local-mongoose"
//so, no need to require it explicitly.
const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
//INITIALIZE THE MIDDLEWARE
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
}))
// This is the basic express session({..}) initialization.
app.use(passport.initialize())  // "init passport" on every route call. The method ".initialize()" come already bundled with the passport and this would initialize passport for us to use it.
//passport.initialize assigns _passport object to request object
app.use(passport.session())     // allows "passport" to use "express-session".


const connDB = mongoose.connect("mongodb://127.0.0.1:27017/userDB")
/////////////////////////////////////////////////////////  CODE  //////////////////////////////////////////////////////////////////////
const userSchema = new mongoose.Schema({
    email: String,
    password: String
})
//To use "passport-local-schema" you first need to plugin Passport-Local Mongoose into your User schema
//Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value to the database.
userSchema.plugin(passportLocalMongoose);
//This will enable the plugin to the schema and is ready to be used now.
//Passport-Local Mongoose is a Mongoose plugin that simplifies building username and password login with Passport.

const User = new mongoose.model("User", userSchema)
//Define an authentication strategy
passport.use(User.createStrategy());

//Serialize and De-Serialize (authenticated) users
passport.serializeUser(User.serializeUser()); //persist user data (after successful authentication) into session
/*
-------------------------
WHAT DOES SERIALIZE USER MEAN?
1. "express-session" creates a "req.session" object, when it is invoked via app.use(session({..}))
2. "passport" then adds an additional object "req.session.passport" to this "req.session".
3. All the serializeUser() function does is,
"receives" the "authenticated user" object from the "Strategy" framework, and attach the authenticated user to "req.session.passport.user.{..}"
In above case we receive {id: 123, name: "Kyle"} from the done() in the authUser function in the Strategy framework, 
so this will be attached as 
req.session.passport.user.{id: 123, name: "Kyle"}
3. So in effect during "serializeUser", the PassportJS library adds the authenticated user to end of the "req.session.passport" object.
This is what is meant by serialization.
This allows the authenticated user to be "attached" to a unique session. 
This is why PassportJS library is used, as it abstracts this away and directly maintains authenticated users for each session within the "req.session.passport.user.{..}"
---------------------------- */
passport.deserializeUser(User.deserializeUser());
/*----------------
Now anytime we want the user details for a session, we can simply get the object that is stored in “req.session.passport.user.{..}”.
WHAT DOES DE-SERIALIZE USER MEAN?
1. Passport JS conveniently populates the "userObj" value in the deserializeUser() with the object attached at the end of "req.session.passport.user.{..}"
2. When the done (null, user) function is called in the deserializeUser(), Passport JS takes this last object attached to "req.session.passport.user.{..}", and attaches it to "req.user" i.e "req.user.{..}"
In our case, since after calling the done() in "serializeUser" we had req.session.passport.user.{id: 123, name: "Kyle"}, 
calling the done() in the "deserializeUser" will take that last object that was attached to req.session.passport.user.{..} and attach to req.user.{..} 
i.e. req.user.{id: 123, name: "Kyle"}
3. So "req.user" will contain the authenticated user object for that session, and you can use it in any of the routes in the Node JS app. 
eg. 
app.get("/dashboard", (req, res) => {
res.render("dashboard.ejs", {name: req.user.name})
}) 
*/
app.get("/", function (req, res) {
    res.render("home");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/login", function (req, res) {
    res.render("login");
});
app.get("/secrets", function (req, res) {
    //check if the user is authenticated
    //this is where we will be relying on our passport, expres-session, passport-local,passport-local-mongoose. 
    //"req.isAuthenticated()" function allow us to protect routes that can be accessed only after a user logs in.
    if (req.isAuthenticated()) {    //<--returns “true” in case an authenticated user is present in “req.session.passport.user” and returns “false” in case no authenticated user is present in “req.session.passport.user
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});
//Now, here is when we want to de-authenticate the user and ends the session.
app.get("/logout", function (req, res) {
    req.logout(function (err) {  //<-- provided to us by the passport js
        if (err) {
            console.log(err);
        } else {
            res.redirect("/")
        }
    });

})
//Authenticate the user using ".register()" method provided by the passport-local-mongoose package.
//It's only because of passport-local-mongoose package we don't have to create a user, .save() a user and interact with the mongoose databae directly.
/*const User = mongoose.model('Users', UserSchema);
User.register({username:'username', active: false}, 'password', function(err, user) {
  if (err) { ... } 
  */
app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function () {    //<-- this callback will only be triggered if the authentication was successfull and we managed to set up a cookie and save their current logged in session.
                res.redirect("/secrets");
            })
        }
    })
});
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    //the ".login()" function comes from passport
    //search the user in the database
    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function () {
                
                res.redirect("/secrets");
            })
        }
    })
})
connDB.then(function () {
    console.log("Successfully connected to the mongoDB database")
    app.listen(3000, function () {
        console.log("Server started listening on port 3000")
    });
})
