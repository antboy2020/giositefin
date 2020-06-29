const mongooseJS = require('./setMongoose');


function addStoreItem(req) {
  mongooseJS.StoreItem.findOne({ filename: req.body.name }, (err, file) => {
    if (err) return err;
    if (file) return Promise.reject("filename exists");
    let newStoreItem = new mongooseJS.StoreItem({
      filename: req.body.name,
      price: req.body.price,
      description: req.body.description,
      xs: req.body.xs,
      s: req.body.s,
      m: req.body.m,
      l: req.body.l,
      xl: req.body.xl,
      type: req.body.type,
      ml30: req.body.ml30,
      ml50: req.body.ml50,
      ml100: req.body.ml100,
      ml250: req.body.ml250,
      g100: req.body.g100,
      wholecount: req.body.wholecount,
      featured: req.body.featured,
      orderNumber: req.body.orderNumber || 0,
    });
    newStoreItem.save(function (err) {
      if (err) {
        console.log("could not save the storeitem");
        reject("could not save the storeitem");
      }
    });
  })
}

exports.addStoreItem = addStoreItem;