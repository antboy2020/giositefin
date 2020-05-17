const express = require('express');
// const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('./models');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const expressSession = require('express-session');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;

//User object for log-in and sign-up
const User = mongoose.model('User');

const app = express();

// Middleware
// app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession(
  { secret: "sjdhfwlj49283hfsjh4952985yhwfqwnau9w45y" }
));
app.set('view engine', 'ejs');
app.use(passport.initialize());
app.use(passport.session());

// Mongo URI
const mongoURI = 'mongodb://127.0.0.1:27017/gio-site-data';
mongoose.connect(mongoURI, { useUnifiedTopology: true, useNewUrlParser: true });

// Create mongo connection
const conn = mongoose.connection;

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        gfs.files.find().toArray((err, files) => {
          files.forEach((file) => {
            if(file.filename == req.body.name)
              reject("filename exists");
          });
          const fileInfo = {
            filename: req.body.name.toString(),
            bucketName: 'uploads'
            // storename: req.body.name,
            // price: req.body.price,
            // description: req.body.description,
            // xs: req.body.xs,
            // s: req.body.s,
            // m: req.body.m,
            // l: req.body.l,
            // xl: req.body.xl
          };
          resolve(fileInfo);
        });        
      });
    });
  }
});
const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
  let data = {title: "junk1", authenticated: req.session.authenticated};
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('index', { files: false, data: data });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', { files: files, data: data });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect('/');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/');
  });
});

//signup page
app.get('/adminsignup', function (req, res) {
  res.render('admin-signup', { title: "LeGeit Admins Sign Up", badEmail: false })
});

// admin signup
app.post('/adminsignup', function (req, res, next) {
  passport.authenticate('local-signup', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/adminlogin'); }
    if (req.body.email.toString().toLowerCase() == "legeitstudio@gmail.com") {
      req.session.authenticated = true;
      return res.redirect('/');
    } else {
      res.render('admin-signup', { title: "LeGeit Admins Sign Up", badEmail: true })
    }
  })(req, res, next);
});

passport.use('local-signup', new localStrategy({
  usernameField: 'email',
  passwordField: 'password',
  session: true
}, function (email, password, next) {
  User.findOne({ email: email }, (err, user) => {
    if (err) return err
    if (user) return next({ message: "User already exists" })

    if (email.toLowerCase() == "legeitstudio@gmail.com") {
      let newUser = new User({
        email: email,
        passwordHash: bcrypt.hashSync(password, 10)
      });
      newUser.save(function (err) {
        next(err, newUser);
      });
    } else {
      let newUser = new User({
        email: email,
        passwordHash: bcrypt.hashSync(password, 10)
      });
      return next(err, newUser);
    }
  });
}));

// login page
app.get('/adminlogin', function (req, res, next) {
  res.render('admin-login', { title: "LeGeit Admins Login" })
});

// admin login
app.post('/adminlogin', passport.authenticate('local', { failureRedirect: '/adminlogin' }),
  function (req, res, next) {
    req.session.authenticated = true;
    res.redirect('/');
  }
);

passport.use(new localStrategy({
  usernameField: 'email',
  passwordField: 'password',
  session: true
}, function (email, password, next) {
  User.findOne({
    email: email
  }, function (err, user) {
    if (err) return next(err);
    if (!user | (user & !bcrypt.compareSync(password, user.passwordHash))) {
      return next({ message: 'Email or password incorrect' })
    }
    next(null, user);
  });
}));

passport.serializeUser(function (user, next) {
  next(null, user._id);
});

passport.deserializeUser(function (id, next) {
  User.findById(id, function (err, user) {
    next(err, user);
  });
});

//admin logout
app.get('/logout', function (req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));