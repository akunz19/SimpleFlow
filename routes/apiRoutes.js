var util = require("util");
var db = require("../models");
var bcrypt = require("bcryptjs");
// eslint-disable-next-line no-unused-vars
var nodemailer = require("nodemailer");
// eslint-disable-next-line no-unused-vars
var mailGun = require("nodemailer-mailgun-transport");
var jwt = require("jsonwebtoken");
var mailgun = require("mailgun-js");
var saltRounds = 10;
var async = require("async");
var crypto = require("crypto");
require("dotenv").config();

module.exports = function(app) {
  // Get all examples
  app.get("/examples", function(req, res) {
    db.Users.findAll({}).then(function(dbExamples) {
      res.json(dbExamples);
    });
  });
  app.post("/profile", parseToken, function(req, res) {
    console.log("This is your req in /profile" + req);
    jwt.verify(req.token, process.env.SECRET_KEY, function(err, authData) {
      if (err) {
        console.log(
          "This is your token in JWT Verify " + JSON.stringify(req.token)
        );
        console.log("This is your error JWT Verify logic " + err);
        res.sendStatus(403); //forbidden error
        res.redirect("/");
      } else {
        db.Users.findOne({
          where: {
            user_id: authData.user
          }
        }).then(function(response) {
          console.log("JWT has Verified your token");
          res.json(response);
        });
      }
    });
  });
  app.post("/login", function(req, res) {
    console.log(req.body);
    db.Users.findOne({
      where: {
        email: req.body.email
      }
      // eslint-disable-next-line no-unused-vars
    }).then(function(dbUsers) {
      if (dbUsers) {
        //if account exists
        bcrypt.compare(req.body.password, dbUsers.password, function(
          //compare hashed password
          err,
          response
        ) {
          if (err) {
            res.status(403);
          }
          if (response) {
            //if passwords match
            // res.json(dbUsers);
            var user = dbUsers.dataValues.user_id;
            jwt.sign(
              { user: user },
              process.env.SECRET_KEY,
              { expiresIn: "10 days" } /*sets token to expire in 30 seconds*/,
              function(err, token) {
                console.log(
                  "This is your user in jwt sign --------------" + user
                );
                console.log(
                  "This is your token in jwt sign ---------------- " + token
                );
                db.Users.update(
                  { token: token },
                  {
                    where: { email: req.body.email },
                    returning: true,
                    plain: true
                  }
                )
                  .then(function(dbresponse) {
                    if (dbresponse[1] === 1) {
                      console.log("Successfully updated token in database");
                    } else {
                      console.log("Unsuccessfully updated token in database");
                    }
                    res.json({ token });
                  })
                  .catch(function(err) {
                    console.log(err);
                  });
              }
            );

            // res.render("userprofile", { msg: "Email has been sent" });
          } else {
            // response is OutgoingMessage object that server response http request
            var DOMAIN = process.env.DOMAIN;
            var mg = mailgun({ apiKey: process.env.API_KEY, domain: DOMAIN });
            var data = {
              from: "SimpleFlow <simpleflow2020@gmail.com>",
              to: req.body.email,
              subject: "Login Attempt",
              template: "login"
            };
            mg.messages().send(data, function(error, body) {
              console.log(body);
            });

            return res.json({
              success: false,
              message: "passwords do not match"
            });
          }
        });
      } else {
        //if account does not exist
        return res.json({ success: false, message: "no account found" });
      }
    });
    // eslint-disable-next-line no-undef
  });

  app.post("/signup", function(req, res) {
    var DOMAIN = process.env.DOMAIN;
    var mg = mailgun({ apiKey: process.env.API_KEY, domain: DOMAIN });
    var data = {
      from: "SimpleFlow <simpleflow2020@gmail.com>",
      to: req.body.email,
      subject: "Welcome",
      template: "signuptemplate"
    };
    mg.messages().send(data, function(error, body) {
      console.log(body);
    });
    var myPlaintextPassword = req.body.password;
    bcrypt.genSalt(saltRounds, function(err, salt) {
      bcrypt.hash(myPlaintextPassword, salt, function(err, hash) {
        if (err) {
          throw err;
        }
        db.Users.create({
          name: req.body.name,
          email: req.body.email,
          password: hash
        }).then(function(dbUsers) {
          res.json({ status: "success" });
          // eslint-disable-next-line no-console
          console.log(dbUsers);
        });
      });
    });
  });
  // Create a new example
  app.post("/examples", function(req, res) {
    db.Users.create(req.body).then(function(dbExample) {
      res.json(dbExample);
    });
  });
  app.post("/forgot", function(req, res, next) {
    var resetExpiration = Date.now() + 3600000;
    var resetToken = crypto.randomBytes(20).toString("hex");
    db.Users.findOne({
      where: {
        email: req.body.email
      }
    }).then(function(dbUsers) {
      console.log(dbUsers);
      if (dbUsers) {
        db.Users.update(
          {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpiration
          },
          {
            where: { email: req.body.email },
            returning: true,
            plain: true
          }
        )
          .then(function(dbresponse) {
            console.log(dbresponse);
            if (dbresponse[1] === 1) {
              console.log("This is req headers" + req.headers.host);
              console.log("Successfully updated token in database");
              var DOMAIN = process.env.DOMAIN;
              var mg = mailgun({ apiKey: process.env.API_KEY, domain: DOMAIN });
              var data = {
                from: "SimpleFlow <simpleflow2020@gmail.com>",
                to: req.body.email,
                subject: "Reset Password",
                text:
                  "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
                  "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
                  "http://" +
                  req.headers.host +
                  "/reset/" +
                  resetToken +
                  "/" +
                  resetExpiration +
                  "\n\n" +
                  "If you did not request this, please ignore this email and your password will remain unchanged.\n"
              };
              mg.messages().send(data, function(error, body) {
                console.log(body);
              });
              res.json({
                success: true,
                message: "password token successfully sent",
                token: resetToken,
                expiration: resetExpiration
              });
            } else {
              console.log("Unsuccessfully updated token in database");

              return res.json({
                success: false,
                message: "no user found in database"
              });
            }
          })
          .catch(function(err) {
            console.log(err);
          });
      } else {
      }
    });
  });
  app.get("/reset/:token/:date", function(req, res) {
    db.Users.findOne({
      where: {
        resetPasswordToken: req.params.token,
        resetPasswordExpires: req.params.date
      }
    }).then(function(dbUsers) {
      if (!dbUsers) {
        res.json({
          success: false,
          message: "password token is invalid or has expired"
        });
      } else {
        res.render("reset", { token: req.params.token, date: req.params.date });
      }
    });
  });
  app.post("/reset/:token/:date", function(req, res) {
    db.Users.findOne({
      where: {
        resetPasswordToken: req.params.token,
        resetPasswordExpires: req.params.date
      }
    }).then(function(dbUsers) {
      if (!dbUsers) {
        res.json({
          success: false,
          message: "couldn't find the user email"
        });
      }
      if (req.body.password === req.body.confirm) {
        var myPlaintextPassword = req.body.password;
        bcrypt.genSalt(saltRounds, function(err, salt) {
          bcrypt.hash(myPlaintextPassword, salt, function(err, hash) {
            if (err) {
              throw err;
            }

            db.Users.update(
              { password: hash },
              {
                where: {
                  resetPasswordToken: req.params.token,
                  resetPasswordExpires: req.params.date
                },
                returning: true,
                plain: true
              }
            ).then(function(dbUsers) {
              console.log(dbUsers);
              if (dbUsers[1] === 1) {
                res.json({
                  success: true,
                  message: "Users password has been updated"
                });
              }
            });
          });
        });
      }
    });
  });
  // Delete an example by id
  app.delete("/examples/:id", function(req, res) {
    db.Users.destroy({ where: { id: req.params.id } }).then(function(
      dbExample
    ) {
      res.json(dbExample);
    });
  });
};
// JWT token logic
function parseToken(request, response, next) {
  //get auth header value
  var bearerHeader = request.headers["authorization"];
  console.log(bearerHeader + " This is your bearer header");
  // console.log(util.inspect(response));
  console.log("This is your request object " + util.inspect(request.body));
  //check if bearer is undefined
  if (typeof bearerHeader !== "undefined") {
    //!COMES OUT AS UNDEFINED
    //split at the space
    var bearer = bearerHeader.split(" ");
    //get token from array
    var bearerToken = bearer[1];
    //set the token
    request.token = bearerToken;
    //Next middleware
    next();
  } else {
    //forbidden
    response.sendStatus(403);
  }
}
