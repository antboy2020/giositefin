const express = require('express');
// const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
require('./models');
const mongooseJS = require('./script/setMongoose');
const manageFiles = require('./script/manageFiles');
const setPassport = require('./script/setPassport');
const methodOverride = require('method-override');
const expressSession = require('express-session');

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
app.use(setPassport.passport.initialize());
app.use(setPassport.passport.session());

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
  let data = { title: "junk1", authenticated: req.session.authenticated };
  mongooseJS.StoreItem.find({}, function (err, fileInfo) {
    if (err) {
      res.render('index', { files: false, data: data });
    } else {
      mongooseJS.gfs.files.find().toArray((err, files) => {
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
              let thisFileInfo = fileInfo.find((info) => info.filename == file.filename);
              file.price = thisFileInfo.price;
              file.description = thisFileInfo.description;
              file.xs = thisFileInfo.xs;
              file.s = thisFileInfo.s;
              file.m = thisFileInfo.m;
              file.l = thisFileInfo.l;
              file.xl = thisFileInfo.xl;
              file.type = thisFileInfo.type;
            } else {
              file.isImage = false;
            }
          });
          res.render('index', { files: files, data: data });
        }
      });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', manageFiles.upload.single('file'), (req, res) => {
  res.redirect('/');
});

// @route POST /cart
// @desc add items to cart
app.post('/cart/:filename/:sizing', (req, res) => {
  mongooseJS.StoreItem.find({ filename: req.params.filename }, function (err, fileInfo) {
    if (err) {
      res.render('index', { files: false, data: data });
    } else {
      let cart = req.session.cart || {};
      cart[req.params.filename + " (" + req.params.sizing + ")"] = { price: fileInfo[0].price, type: fileInfo[0].type, count: "1", size: req.params.sizing };
      req.session.cart = cart;
      req.session.save();
    }
  });
});

app.post('/updateCart/:filename/:count', (req, res) => {
  if(req.params.count == 0) {
    delete req.session.cart[req.params.filename];
    req.session.save();
  } else if(req.params.count > 0) {
    req.session.cart[req.params.filename].count = req.params.count; 
    req.session.save();
  }
});

// @route DELETE /cart
// @desc add items to cart
app.delete('/cart/:filename', (req, res) => {
  delete req.session.cart[req.params.filename];
  req.session.save();
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  mongooseJS.gfs.files.find().toArray((err, files) => {
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
app.get('/product/:filename', (req, res) => {
  let data = { title: "junk1", authenticated: req.session.authenticated, inCart: req.session.cart? req.session.cart : false };
  mongooseJS.StoreItem.find({ filename: req.params.filename }, function (err, fileInfo) {
    if (err) {
      res.render('index', { file: false, data: data });
    } else {
      mongooseJS.gfs.files.find({ filename: req.params.filename }).toArray((err, file) => {
        // Check if files
        if (!file || file.length === 0) {
          res.render('index', { files: false, data: data });
        } else {
          file.map(file => {
            if (
              file.contentType === 'image/jpeg' ||
              file.contentType === 'image/png'
            ) {
              file.isImage = true;
              file.price = fileInfo[0].price;
              file.description = fileInfo[0].description;
              file.xs = fileInfo[0].xs;
              file.s = fileInfo[0].s;
              file.m = fileInfo[0].m;
              file.l = fileInfo[0].l;
              file.xl = fileInfo[0].xl;
            } else {
              file.isImage = false;
            }
          });
          res.render('product', { file: file[0], data: data });
        }
      });
    }
  });
});

app.get('/updateCart/:filename', (req, res) => {
  res.render('updatecart', {data: req.session.cart, filename: req.params.filename});
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
  mongooseJS.gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = mongooseJS.gfs.createReadStream(file.filename);
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
app.delete('/files/:id/:filename', (req, res) => {
  mongooseJS.gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    } else {
      mongooseJS.StoreItem.deleteOne({ filename: req.params.filename }, (err) => {
        if (err) {
          console.log(err);
        }
      });
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
  setPassport.passport.authenticate('local-signup', function (err, user, info) {
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

// login page
app.get('/adminlogin', function (req, res, next) {
  res.render('admin-login', { title: "LeGeit Admins Login" })
});

// admin login
app.post('/adminlogin', setPassport.passport.authenticate('local', { failureRedirect: '/adminlogin' }),
  function (req, res, next) {
    req.session.authenticated = true;
    res.redirect('/');
  }
);

//admin logout
app.get('/logout', function (req, res, next) {
  req.session.destroy();
  res.redirect('/');
});

const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));