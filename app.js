//require the dotenv as early as possible
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
}))
app.use(passport.initialize())  
app.use(passport.session())     


const connDB = mongoose.connect("mongodb://127.0.0.1:27017/userDB")
/////////////////////////////////////////////////////////  CODE  //////////////////////////////////////////////////////////////////////
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String               //<--Ammend the schema to store users secrets
})

userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser()); 

passport.deserializeUser(User.deserializeUser());

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
    //find all the users in the database where "secret" field is "not equal" to "none"
    User.find({"secret":{$ne:null}}).then(function(result){    

        res.render("secrets",{usersWithSecrets:result})

    }).catch(function(err){
        console.log(err);
    })
 });

app.get("/logout", function (req, res) {
    req.logout(function (err) {  
        if (err) {
            console.log(err);
        } else {
            res.redirect("/")
        }
    });

})

app.get("/submit",function(req,res){
    if (req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
})

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

app.post("/submit",function(req,res){
    const submittedSecret=req.body.secret;
    //Find the user in the database and save the secret into their file
    console.log(req.user.id) //<-- As the "passport" helps us to save the user details into the "req" variable whenever a new "login session" is initiated.
    User.findById(req.user.id).then(function(result){
        result.secret=submittedSecret;
        result.save().then(function(){
            res.redirect("/secrets")
        }).catch(function(err){
            console.log(err);
        })
        
    }).catch(function(err){
        console.log(err);
    })

})
connDB.then(function () {
    console.log("Successfully connected to the mongoDB database")
    app.listen(3000, function () {
        console.log("Server started listening on port 3000")
    });
})
