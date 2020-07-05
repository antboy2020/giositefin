const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('./models');
const multer = require('multer');
const fs = require('fs');
const mongooseJS = require('./script/setMongoose');
const manageFiles = require('./script/manageFiles');
const setPassport = require('./script/setPassport');
const methodOverride = require('method-override');
const expressSession = require('express-session');
const stripe = require('stripe')('sk_test_ztd0iQr35Jsk2fcRHPYUWa9F00AAE3Dlob');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Middleware
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
    if (customer && customer.email) {
      //make sure stripe email is being sent
      updateCountOnSuccess(req);
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
    } else if (fileInfo.length < 1) {
      res.render('index', { files: false, data: data });
    } else {
      res.render('index', { files: fileInfo, data: data })
    }
  });
});

function updateCountOnSuccess(req){
  for(const item in req.session.cart){
    mongooseJS.StoreItem.updateOne({filename: req.session.cart[item].originalName}, { $inc: {xs: -req.session.cart[item].count}}, (err)=> {
      if (err) {
        res.sendStatus(500);
      } else {
        console.log("here updating");
      }
    })
  }
}

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

const upload = multer({
  dest: process.env.MULTER_PATH
  // you might also want to set some limits: https://github.com/expressjs/multer#limits
});

app.post(
  "/upload",
  upload.single("file" /* name attribute of <file> element in your form */),
  (req, res) => {
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, "./uploads/" + req.body.name.trim());

    if (path.extname(req.file.originalname).toLowerCase() === ".png" || path.extname(req.file.originalname).toLowerCase() === ".jpg") {
      manageFiles.addStoreItem(req, fs, tempPath, targetPath, res);
    } else {
      fs.unlink(tempPath, err => {
        if (err) return handleError(err, res);

        res
          .status(403)
          .contentType("text/plain")
          .end("Only .png files are allowed!");
      });
    }
  }
);

app.post(
  "/uploadsecondary/:filename",
  upload.single("file" /* name attribute of <file> element in your form */),
  (req, res) => {
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, "./secondaryuploads/" + req.params.filename);

    if (path.extname(req.file.originalname).toLowerCase() === ".png" || path.extname(req.file.originalname).toLowerCase() === ".jpg") {
      fs.rename(tempPath, targetPath, err => {
        if (err) {
          return console.log(err)
        }

        res
          .status(200)
          .contentType("text/plain")
          .end("File uploaded!");
      });
    } else {
      fs.unlink(tempPath, err => {
        if (err) return handleError(err, res);

        res
          .status(403)
          .contentType("text/plain")
          .end("Only .png files are allowed!");
      });
    }
  }
);

// route to delete store item
app.delete('/images/:filename', (req, res) => {
  mongooseJS.StoreItem.deleteOne({ filename: req.params.filename }, (err) => {
    if (err) {
      return "could not delete";
    } else {
      const targetPath = path.join(__dirname, "./uploads/" + req.params.filename);
      fs.unlink(targetPath, (err) => {
        if (err) {
          console.error(err)
          return
        }

        res.redirect("/");
        //file removed
      })
    }
  })
});

// route to delete secondary items
app.delete('/secondaryimages/:filename', (req, res) => {
  const targetPath = path.join(__dirname, "./secondaryuploads/" + req.params.filename);
  fs.unlink(targetPath, (err) => {
    if (err) {
      console.error(err)
      return
    }

    res.redirect('/product' + req.params.filename);
    //file removed
  });
}
);

// @route POST /cart
// @desc add items to cart
app.post('/cart/:filename/:sizing', (req, res) => {
  mongooseJS.StoreItem.find({ filename: req.params.filename }, function (err, fileInfo) {
    if (err) {
      res.render('index', { files: false, data: data });
    } else {
      let cart = req.session.cart || {};
      cart[req.params.filename + " (" + req.params.sizing + ")"] = { price: fileInfo[0].price, type: fileInfo[0].type, count: "1", size: req.params.sizing, originalName: req.params.filename};
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
  return { total: round(total, 2), tax: round(tax, 2), shipping: round(shipping, 2) };
}

function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
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

function updateStock(filename, size, count){
}

//reoute to update the count that is remaining in stock for store item
app.post('/updateAttribute/:filename/:attribute/:change', (req, res) => {
  mongooseJS.StoreItem.updateOne({ filename: req.params.filename }, { [req.params.attribute]: req.params.change }, (err) => {
    if (err) {
      res.sendStatus(500);
    } else {
      if (req.params.attribute == "filename") {
        const prevPath = path.join(__dirname, "./uploads/" + req.params.filename);
        const newPath = path.join(__dirname, "./uploads/" + req.params.change);
        fs.rename(prevPath, newPath, err => {
          if (err) {
            return console.log(err)
          }
        });
      }
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
              unit_amount: round(total * 100, 2),
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: 'http://155.138.218.81?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'http://155.138.218.81',
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
          unit_amount: round(total * 100,2),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
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
  res.sendFile(path.join(__dirname, "./uploads/" + req.params.filename));
});

// @route GET /image/:filename
// @desc Display Image
app.get('/secondaryimage/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, "./secondaryuploads/" + req.params.filename));
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

module.exports = app;
//const port = 5000;
//app.listen(port, () => console.log(`Server started on port ${port}`));
