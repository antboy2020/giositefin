const passport = require("passport");
const mongooseJS = require("./setMongoose");
const bcrypt = require("bcrypt");
const localStrategy = require("passport-local").Strategy;

passport.use(
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: true,
    },
    function (email, password, next) {
      mongooseJS.User.findOne(
        {
          email: email,
        },
        function (err, user) {
          if (err) return next(err);
          if (
            !user |
            (user & !bcrypt.compareSync(password, user.passwordHash))
          ) {
            return next({ message: "Email or password incorrect" });
          }
          next(null, user);
        }
      );
    }
  )
);

passport.serializeUser(function (user, next) {
  next(null, user._id);
});

passport.deserializeUser(function (id, next) {
  mongooseJS.User.findById(id, function (err, user) {
    next(err, user);
  });
});

passport.use(
  "local-signup",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: true,
    },
    function (email, password, next) {
      mongooseJS.User.findOne({ email: email }, (err, user) => {
        if (err) return err;
        if (user) return next({ message: "User already exists" });

        if (email.toLowerCase() == "legeitstudio@gmail.com") {
          let newUser = new mongooseJS.User({
            email: email,
            passwordHash: bcrypt.hashSync(password, 10),
          });
          newUser.save(function (err) {
            next(err, newUser);
          });
        } else {
          let newUser = new mongooseJS.User({
            email: email,
            passwordHash: bcrypt.hashSync(password, 10),
          });
          return next(err, newUser);
        }
      });
    }
  )
);

exports.passport = passport;
