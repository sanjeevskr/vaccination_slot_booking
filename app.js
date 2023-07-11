//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
var session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const _=require("lodash");
const cron = require('node-cron');

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
  Location: String,
  vaccinationCenterName:String,
  Start_WorkingHour:String,
  End_workingHour:String
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
  email: String,
  password: String
});
const Admin = mongoose.model("Admin", adminSchema);

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema)


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


app.get("/", function(req, res) {
  res.render("home");
});
app.get("/login", function(req, res) {
  res.render("login");
});
app.get("/register", function(req, res) {
  res.render("register");
});

cron.schedule('0 0 * * *', async () => {
  const currentDate = new Date();
  const currentDay = currentDate.toISOString().split('T')[0];

  try {
    const existingDocument = await AdminUpdation.findOne({ 'countPerDay.day': currentDay });
    if (existingDocument == null) {
      await AdminUpdation.updateMany({}, { $set: { 'countPerDay.day': currentDay, 'countPerDay.count': 0 } });
      console.log('Day field updated for all documents.');
    } else {
      console.log('Day field is already up to date.');
    }
  } catch (error) {
    console.error('Error updating day field:', error);
  }
});

app.get("/secrets", function(req, res) {
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
            AdminUpdation.find({}, function(err, adminUpdatedItems) {
              if (!err) {
                res.render("secrets", {adminUpdatedItemList: adminUpdatedItems})
              } else {
                console.log(err);
              }
            });
        }
      }
    });
  });




app.get("/submit", function(req, res) {
  if (req.session.adminId) {
    res.render("submit");
  } else {
    res.redirect("/Adminlog");
  }
});

app.get("/ADMIN", function(req, res) {
  if (req.session.adminId) {
    clientlist.find({}, function(err, list) {
      if (!err) {
        res.render("ADMIN", {
          list: list
        });
      } else {
        console.log(err);
        res.redirect("/login");
      }
    });
  } else {
    res.redirect("/Adminlog");
  }
});


app.post("/submit", function(req, res) {
  let vc = _.capitalize(req.body.vaccinationCenterName);
  let sw = _.capitalize(req.body.Start_WorkingHour);
  let ew = _.capitalize(req.body.End_workingHour);
  const countPerDayData = {
    count: 0
  };
  const submitBtn = req.body.submitBtn;

  if (submitBtn === "add") {
    var AdminUpdation_new = new AdminUpdation({
      vaccinationCenterName: vc,
      Start_WorkingHour: sw,
      End_workingHour: ew,
      countPerDay: countPerDayData
    });

    if (req.session.adminId) {
      AdminUpdation_new.save();
      res.redirect("/submit");
    } else {
      res.redirect("/Adminlog");
    }
  } else {
    if (req.session.adminId) {
      AdminUpdation.deleteOne({ vaccinationCenterName: vc }, function(err) {
        if (err) {
          console.error(err);
        } else {
          console.log('Element deleted successfully');
        }
      });
      res.redirect("/submit");
    } else {
      res.redirect("/Adminlog");
    }
  }
});


app.post("/Adminlog", function(req, res) {
  const email = req.body.username;
  const password = req.body.password;


  Admin.findOne({ email: email }, function(err, foundAdmin) {
    if (err) {
      console.log(err);
      res.redirect("/Adminlog");
    } else {
      if (foundAdmin) {

        if (foundAdmin.password === password) {
          req.session.adminId = foundAdmin._id;
          res.redirect("/submit");
        } else {
          res.redirect("/Adminlog");
        }
      } else {
        res.redirect("/Adminlog");
      }
    }
  });
});


app.get("/Adminlog",function(req,res){
    res.render("Adminlog");
});

app.post("/Adminreg", function(req, res) {
  const email = req.body.username;
  const password = req.body.password;
  console.log(email);
  console.log(password);

  Admin.findOne({ email: email }, function(err, foundAdmin) {
    if (err) {
      console.log(err);
      res.redirect("/Adminlog");
    } else {
      if (foundAdmin) {
        res.redirect("/Adminlog");
      } else {
        const newAdmin = new Admin({
          email: email,
          password: password
        });

        newAdmin.save(function(err) {
          if (err) {
            console.log(err);
            res.redirect("/Adminlog");
          } else {
            req.session.adminId = newAdmin._id;
            res.redirect("/submit");
          }
        });
      }
    }
  });
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
  if (req.isAuthenticated()) {
  const { param1, param2, param3} = req.session.clientDetails;
  let cn=_.capitalize(req.body.Name);
  let ca=_.capitalize(req.body.Age);
  let cd=_.capitalize(req.body.Dosage);
  let cl=_.capitalize(req.body.Location);
  if(cn!=''&&ca!=''&&cd!=''&&cl!=''){
  const new_clientlist = new clientlist({
    Name: cn,
    Age: ca,
    Dosage: cd,
    Location: cl,
    vaccinationCenterName:param1,
    Start_WorkingHour:param2,
    End_workingHour:param3
  });
    new_clientlist.save();
  }

}

  res.redirect("/booked");
});

app.post('/secrets/:paramName/:param2/:param3',async (req, res) => {
  if (req.isAuthenticated()) {
  try {
    const currentDate = new Date();
    const currentDay = currentDate.toISOString().split('T')[0];

    customParamName=_.capitalize(req.params.paramName);
    console.log(req.params.paramName);
    console.log(customParamName);

    const existingDocument = await AdminUpdation.findOne({ 'countPerDay.day': currentDay });
    if (existingDocument==null) {
    await AdminUpdation.updateMany({}, { $set: { 'countPerDay.day': currentDay, 'countPerDay.count': 0 } });
      console.log(existingDocument);
    }
    else{
      const update = { $inc: { 'countPerDay.count': 1 } };
      const updatedDocument = await AdminUpdation.findOneAndUpdate( { vaccinationCenterName: customParamName }, update, { new: true });
    }


    const param1=customParamName;
    const param2=_.capitalize(req.params.param2);
    const param3=_.capitalize(req.params.param3);

    req.session.clientDetails = { param1, param2, param3 };

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
  if(req.session.adminId!=null){
    req.session.adminId = null;
  }
  res.redirect("/");
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
