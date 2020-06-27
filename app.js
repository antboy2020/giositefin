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
const stripe = require('stripe')('sk_test_ztd0iQr35Jsk2fcRHPYUWa9F00AAE3Dlob');

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

const url = require('url');
// @route GET /
// @desc Loads form
app.get('/', async (req, res) => {
  const queryObject = url.parse(req.url, true).query;
  if (queryObject['session_id']) {
    let stripe = require('stripe')('sk_test_ztd0iQr35Jsk2fcRHPYUWa9F00AAE3Dlob');

    let session = await stripe.checkout.sessions.retrieve(queryObject['session_id']);
    let customer = await stripe.customers.retrieve(session.customer);
    //send email to customer with thanks and order number
    //send email to gio with the customer email the items they purchased and the shipping addresss
    //send email to me to let me know the customers used the account
    if (customer && customer.email) {
      var nodemailer = require('nodemailer');

      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'anthony.then95@gmail.com',
          pass: 'Astdlr.2020gsuite'
        }
      });

      var mailOptions = {
        from: 'anthony.then95@gmail.com',
        to: 'anthony.then95@rocketmail.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!'
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    }
  }
  let data = { title: "junk1", authenticated: req.session.authenticated, cart: req.session.cart };
  mongooseJS.StoreItem.find({ featured: true }, function (err, fileInfo) {
    if (err) {
      res.render('index', { files: false, data: data });
    } else {
      mongooseJS.gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
          res.render('index', { files: false, data: data });
        } else {
          let featuredFiles = fileInfo.filter((file) => file.featured);
          res.render('index', { files: featuredFiles, data: data });
        }
      });
    }
  });
});

// @route GET /products
// full products page
app.get('/products', (req, res) => {
  let data = { title: "junk1", authenticated: req.session.authenticated, cart: req.session.cart };
  mongooseJS.StoreItem.find({}, function (err, files) {
    if (!files || files.length === 0) {
      res.render('products', { files: false, data: data });
    } else {
      files.sort((a, b) => (a.orderNumber > b.orderNumber) ? 1 : -1);
      res.render('products', { files: files, data: data });
    }
  });
});

app.get('/booking', (req, res) => {
  let data = { cart: req.session.cart };
  res.render('booking', { data: data });
})

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', manageFiles.upload.single('file'), (req, res) => {
  res.redirect('/');
});

// route to reupload photo in product page
app.post('/reupload/:filename', manageFiles.upload.single('file'), (req, res) => {
  res.redirect('/');
});

// @route POST /uploadSecondary
// @desc  Uploads file to DB
app.post('/uploadSecondaryPicture/:filename', manageFiles.upload.single('file'), (req, res) => {
  res.redirect('/product/' + req.params.filename);
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

//route for updating the cart object in session
app.post('/updateCart/:filename/:count', (req, res) => {
  if (req.params.count == 0) {
    delete req.session.cart[req.params.filename];
    req.session.save();
  } else if (req.params.count > 0) {
    req.session.cart[req.params.filename].count = req.params.count;
    req.session.save();
  } else {
    res.sendStatus(500);
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
  let data = { title: "junk1", authenticated: req.session.authenticated, inCart: req.session.cart ? req.session.cart : false };
  mongooseJS.StoreItem.find({ filename: req.params.filename }, function (err, fileInfo) {
    if (err) {
      res.render('index', { file: false, data: data });
    } else {
      res.render('product', { file: fileInfo[0], data: data });
    }
  });
});

app.get('/billing', async (req, res) => {
  console.log("hello");
  let total = cartTotal(req).total;
  let sessionId = await readyCheckout(total);
  res.render('billing', { sessionId: sessionId });
});



function cartTotal(req) {
  let total = 0;
  let clothesTotal = 0;
  let barberTotal = 0;
  let tax = 0;
  let count = 0;
  let shipping = 0;
  if (req.session.cart) {
    for (let [key, val] of Object.entries(req.session.cart)) {
      count += val.count;
    }
    shipping = count == 1 ? 5.95 : 7.95;
    for (let [key, value] of Object.entries(req.session.cart)) {
      if (value.type == "clothing") {
        clothesTotal += value.price * value.count;
      } else if (value.type == "barbering") {
        barberTotal += value.price;
      }
    }
  }
  if (clothesTotal > 110) {
    tax = (clothesTotal + barberTotal) * .04;
  } else {
    tax = (barberTotal) * .04;
  }
  total = clothesTotal + barberTotal + tax + shipping;
  return { total: total, tax: tax, shipping: shipping };
}

//reoute to update the count that is remaining in stock for store item
app.post('/updateCount/:filename/:size/:count', (req, res) => {
  mongooseJS.StoreItem.updateOne({ filename: req.params.filename }, { [req.params.size]: req.params.count }, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

//route to change whether an item is featured on homepage
app.post('/updateFeatured/:filename/:featured', (req, res) => {
  mongooseJS.StoreItem.updateOne({ filename: req.params.filename }, { featured: req.params.featured }, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

//route to change whether an item is featured on homepage
app.post('/updateOrder/:filename/:order', (req, res) => {
  mongooseJS.StoreItem.updateOne({ filename: req.params.filename }, { orderNumber: req.params.order }, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

//route to update category
app.post('/updateType/:filename/:type', (req, res) => {
  mongooseJS.StoreItem.updateOne({ filename: req.params.filename }, { type: req.params.type }, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

async function readyCheckout(total) {
  let itemNotFound = true;
  let legeitCartName = "legeitcheckout";
  let sessionId = "";
  let productList = await stripe.products.list({ active: true });
  let products = productList.data;
  if (products) {
    for (product in products) {
      if (products[product].name == legeitCartName) {
        itemNotFound = false;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product: products[product].id,
              unit_amount: total * 100,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: 'http://localhost:5000?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'http://localhost:5000',
          shipping_address_collection: {
            allowed_countries: ['US', 'CA'],
          },
        });
        sessionId = session.id;
      }
    }
  }
  if (itemNotFound) {
    const product = await stripe.products.create({
      name: legeitCartName,
    });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product: product.id,
          unit_amount: total * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:5000',
      cancel_url: 'https://localhost:5000',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
    });
    sessionId = session.id;
    // const price = await stripe.prices.create({
    //   product: product.id,
    //   unit_amount: req.params.cartTotal * 100,
    //   currency: 'usd',
    // });
  }
  return sessionId;
}

// route to update and view cart
app.get('/updateCart', (req, res) => {
  if (req.session.cart && Object.keys(req.session.cart).length > 0) {

    let cartPricingDetails = cartTotal(req);
    res.render('updatecart', { data: req.session.cart, tax: cartPricingDetails.tax, shipping: cartPricingDetails.shipping });
  } else {

    res.render('updatecart', { data: req.session.cart, tax: null, shipping: null });
  }
});

app.get('/updateCart/:filename', (req, res) => {
  res.render('updatecart', { data: req.session.cart, filename: req.params.filename });
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
app.delete('/files/:filename', (req, res) => {
  mongooseJS.gfs.remove({ filename: req.params.filename, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    } else {
      mongooseJS.StoreItem.deleteOne({ filename: req.params.filename }, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
    let endpoint = req.params.endpoint ? req.params.endpoint : "";
    res.redirect('/' + endpoint);
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
