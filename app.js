//require the dotenv as early as possible
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const sha512=require("js-sha512");  //require the js-sha512 module

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
    console.log(req.body.username);
    console.log(req.body.password);
    const newUser = new User({
        email: req.body.username,
//<-- we are hashing the data using SHA512 hashing algorithm/function and storing the "hashed" data in the database whenever a user registers, instead of saving their password 
//as plain text, or instead of using an encryption key.
        password: sha512(req.body.password) 
                                           
    })
    
    newUser.save().then(function () {
        console.log("Successfully created a new user!");
        res.render("secrets");
    }).catch(function (err) {
        console.log(err);
    });
});
app.post("/login", function (req, res) {
    const username = req.body.username;
    //for a /particular string/input/piece of data, "hash" of that data always remains same, given we are using the same hash function/algorithm(SHA512)
    const password = sha512(req.body.password); 
    
    User.findOne({ email: username }).then(function (result) {
        if (result) {
            if (result.password === password) {                 //<--Comparing hashes.
                res.render("secrets")
            }
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
