//require the dotenv as early as possible
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");  //Require bcrypt
const saltRounds = 10;             //define the number of salt rounds you want to perform on the password.
const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
const connDB = mongoose.connect("mongodb://127.0.0.1:27017/userDB")
/////////////////////////////////////////////////////////  CODE  //////////////////////////////////////////////////////////////////////
const userSchema = new mongoose.Schema({
    email: String,
    password: String   //<--we are going to encrypt this field
})
const User = new mongoose.model("User", userSchema)
app.get("/", function (req, res) {
    res.render("home");
});
app.get("/register", function (req, res) {
    res.render("register");
});
app.get("/login", function (req, res) {
    res.render("login");
});
// No GET request to the /secrets route as we only want to "render" the "secrets" page only if a user is registered or logged in
// app.get("/secrets",function(req,res){
//     res.render("secrets")
// });
app.post("/register", function (req, res) {
    // Performing "salting + hashing" instead of simple hashing to overcome the vulnerability of hashing.
    // bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    // });
    //Calling the hash function when storing the data
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        })
        newUser.save().then(function () {
            console.log("Successfully created a new user!");
            res.render("secrets");
        }).catch(function (err) {
            console.log(err);
        });
    })
});
app.post("/login", function (req, res) {
    //To check a password:
    // Load hash from your password DB.
    // bcrypt.compare(myPlaintextPassword, hash(of which we want to compare it with), function(err, result) {
    // if(result == true){//DO SOMETHING}
    //}
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({ email: username }).then(function (result) {
        if (result) {
            bcrypt.compare(password, result.password, function (err, comparedresult) {
                if (comparedresult === true){     //<-- means that the user input had a hash which is matching the hash value stored in the database.
                    res.render("secrets");
                }
            })
        }
    }).catch(function (err) {
        console.log(err);
    })
})
connDB.then(function () {
    console.log("Successfully connected to the mongoDB database")
    app.listen(3000, function () {
        console.log("Server started listening on port 3000")
    });
})
