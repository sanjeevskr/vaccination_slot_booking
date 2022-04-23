//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt= require("mongoose-encryption");
// const md5 =require("md5");
var session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "out little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://localhost:27017/userDB");
mongoose.connect("mongodb+srv://sanjeev-admin:test123@cluster0.uo8dv.mongodb.net/attendance?retryWrites=true&w=majority");





const stdSchema = {
  name: String,
  time: String,
  date: String
};
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


const list = mongoose.model("list", stdSchema);

var date = new Date().toLocaleDateString("en-US", {
  "day": "numeric",
  "month": "long",
  "year": "numeric"
}).replace(/,/, ' ');
const d_t = new Date();
let day = d_t.getDate().toString();
let year = d_t.getFullYear().toString().slice(-2);
let month = monthNames[d_t.getMonth()]

let result = day.concat(" ", month, " ", year);




const aStudent = {
  name: String,
  registerNumber: Number,
  rollNumber: Number
};

const Student = mongoose.model("Student", aStudent);








const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);


const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res) {
  res.render("home");
});
app.get("/login", function(req, res) {
  res.render("login");
});
app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  if (req.isAuthenticated()) {
    list.find({},function(err,currentItems){
    if(err){
      console.log(err);
    }
    console.log(currentItems[0].name.toLowerCase());
    Student.find({
        // "date": result
      }, function(err, foundItems) {
        if (!err) {
          res.render("secrets", {
            listItem: foundItems,
            date: date,
            currentItems:currentItems
          })
        } else {
          console.log(err);
        }
      });
    });
  } else {
    res.redirect("/login");
  }



});
app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
app.post("/submit", function(req, res) {

const Student1=new Student({
  name:req.body.sname,
  registerNumber: req.body.rnumber,
  rollNumber: req.body.rollno
});


Student1.save();
res.redirect("/submit");


});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/")
});

app.get("/deletelist",function(req,res){
    if (req.isAuthenticated()) {
      list.deleteMany({},function(err){
        if(!err){
          res.send("success");
        }
        else{
          res.send(err);
        }
      })
}
});
app.get("/deleteStudent",function(req,res){
    if (req.isAuthenticated()) {
      Student.deleteMany({},function(err){
        if(!err){
          res.send("success");
        }
        else{
          res.send(err);
        }
      })
}
});

app.post("/register", function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  })

});
app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    }
  });



});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});
