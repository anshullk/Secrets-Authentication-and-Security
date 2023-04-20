//require the dotenv as early as possible
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const encrypt = require("mongoose-encryption");
//relies on node native module "crypto"
//Encryption is performed using AES-256-CBC

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

// your SOME_LONG_UNGUESSABLE_STRING is going to be used as part of the cipher method, applying your string as both encryption key and decryption key
// Simply put, the "secret" variable is pretty much what makes your encryption safe, and that's also why it should be unguessable
// if you change this string nothing that was encrypted before will be decryptable anymore unless you use the same exact secret.
// console.log(process.env.API_KEY); //<-- To check whether its (dotenv) working or not
const secret = process.env.SECRET;
// *****include the "encrypt" package as a "plugin" to the mongoose schema to which we want to apply the encryption for and pass the secret as a javascript object.
// schemas are pluggabel i.e to extendend the functionality of a schema.
// userSchema.plugin(encrypt, { secret:secret, encryptedFields: ["field_to_which_u_want_to_apply_encryption_to","another_field_to_which_u_want_to_apply_encryption_to"] });
// By default, all fields are encrypted except for _id, __v, and fields with indexes
// and "encrypt" (the first parameter), is the name of the constant we used to require("mongoose-encryption") when we, --> const encrypt=require("mongoose-encryption")
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
// This adds _ct and _ac fields to the schema replacing the 
// fields to which we applied encryption to.

const User = new mongoose.model("User", userSchema)
// As we are using the userchema inside the Model, be sure to apply the encrypt package as a plugin to the same schema before defining the model.
// so that later, any document created inside the Model's field shall be encrypted. 

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
        password: req.body.password   //<--will be replaced by _ac and _ct i.e. it will be encrypted
    })
    //During save(), documents are encrypted using the secret key behind the scenes.
    //and this will add a _ac and _ct field replacing the field to which we are applying encryption to.
    newUser.save().then(function () {
        console.log("Successfully created a new user!");
        res.render("secrets");
    }).catch(function (err) {
        console.log(err);
    });
});
app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    //During find(), documents are decrypted behind the scenes.
    //the _ct field is deciphered,  the JSON is parsed, and the individual fields are inserted back into the document as their original data types.
    User.findOne({ email: username }).then(function (result) {
        if (result) {
            if (result.password === password) {
                // console.log(result.password); <--this will be deciphered and pretended to be a lain tet when matching.
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
