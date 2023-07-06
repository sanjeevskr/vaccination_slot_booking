//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
var session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const _=require("lodash");
const LocalStrategy = require('passport-local').Strategy;


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

mongoose.connect("mongodb+srv://admin-sanjeev:test123@cluster0.uo8dv.mongodb.net/vaccinationBooking?retryWrites=true&w=majority");



const clientdetails = {
  Name: String,
  Age: String,
  Dosage: String,
  Location: String
};




const clientlist = mongoose.model("clientlist",clientdetails);


const countPerDaySchema = {
  day: String,
  count: Number,
};

const vaccination_Center = {
  vaccinationCenterName: String,
  Start_WorkingHour: String,
  End_workingHour: String,
  countPerDay: countPerDaySchema,
};
var number=0;
const countPerDay = mongoose.model("countPerDay", countPerDaySchema);
const AdminUpdation = mongoose.model("AdminUpdation", vaccination_Center);

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const adminSchema = new mongoose.Schema({
  email:String,
  Password: String
});
userSchema.plugin(passportLocalMongoose);
adminSchema.plugin(passportLocalMongoose);
const Admin = mongoose.model("Admin", adminSchema)
const User = mongoose.model("User", userSchema)
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(Admin.createStrategy());

passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

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

      AdminUpdation.find({

      }, function(err, adminUpdatedItems) {
        if (!err) {

          res.render("secrets", {
            adminUpdatedItemList: adminUpdatedItems
          })
        } else {
          console.log(err);
        }
      });

  } else {
    res.redirect("/login");
  }
});




app.get("/submit", function(req, res) {
    res.render("submit");
});
app.get("/ADMIN", function(req, res) {

    clientlist.find({

    }, function(err, list) {
      if (!err) {
        res.render("ADMIN", {
          list: list,
        })
      } else {
        console.log(err);
      }
    });
});

app.post("/submit", function(req, res) {

  let vc=_.capitalize(req.body.vaccinationCenterName);
  let sw=_.capitalize(req.body.Start_WorkingHour);
  let ew=_.capitalize(req.body.End_workingHour);
  if(vc!=''&&sw!=''&&ew!=''){
    var countPerDayData = {
      count: 0
    };
  var AdminUpdation_new = new AdminUpdation({
    vaccinationCenterName: vc,
    Start_WorkingHour: sw,
    End_workingHour: ew,
    countPerDay:countPerDayData
  });
  AdminUpdation_new.save();
  res.redirect("/submit");
}

});



app.post("/Adminlog", passport.authenticate("local", { failureRedirect: "/Adminlog" }), function(req, res) {
  res.redirect("/submit");
});



app.get("/Adminlog",function(req,res){
    res.render("Adminlog");
});


app.post("/Adminreg",function(req,res){
  Admin.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/Adminlog");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/submit");
      });
    }
  })
});

app.get("/Adminreg",function(req,res){
  res.render("Adminreg");
});

app.get("/clientDetails", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("clientDetails");
  } else {
    res.redirect("/login");
  }
});
app.post("/clientDetails", function(req, res) {

  let cn=_.capitalize(req.body.Name);
  let ca=_.capitalize(req.body.Age);
  let cd=_.capitalize(req.body.Dosage);
  let cl=_.capitalize(req.body.Location);
  if(cn!=''&&ca!=''&&cd!=''&&cl!=''){
  const new_clientlist = new clientlist({
    Name: cn,
    Age: ca,
    Dosage: cd,
    Location: cl
  });

  new_clientlist.save();
}

  res.redirect("/booked");
});


app.post('/secrets/:paramName',async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const currentDate = new Date();
    const currentDay = currentDate.toISOString().split('T')[0];

    customParamName=_.capitalize(req.params.paramName);
    console.log(req.params.paramName);
    console.log(customParamName);

    const existingDocument = await AdminUpdation.findOne({ 'countPerDay.day': currentDay });
    if (existingDocument!=null) {
    await AdminUpdation.updateMany({}, { 'countPerDay.count': 0 });
      console.log(existingDocument);
    }
    else{
      const update = { $inc: { 'countPerDay.count': 1 } };
      const updatedDocument = await AdminUpdation.findOneAndUpdate( { vaccinationCenterName: customParamName }, update, { new: true });
    }


      res.redirect('/clientdetails');
  } catch (error) {
    console.error('Error updating count:', error);
    res.status(500).send('An error occurred');
  }
} else {
  res.redirect("/login");
}


});

app.get('/booked',async (req, res) => {
  if (req.isAuthenticated()) {
  res.render('booked');
}
});


app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/")
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