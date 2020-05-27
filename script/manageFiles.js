const GridFsStorage = require('multer-gridfs-storage');
const multer = require('multer');
const crypto = require('crypto');
const mongooseJS = require('./setMongoose');

// Create storage engine
const storage = new GridFsStorage({
  url: mongooseJS.mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        mongooseJS.gfs.files.find().toArray((err, files) => {
          files.forEach((file) => {
            if (file.filename == req.body.name)
              reject("filename exists");
          });
          const fileInfo = {
            filename: req.body.name,
            bucketName: 'uploads'
          };
          addStoreItem(req, fileInfo);
          resolve(fileInfo);
        });
      });
    });
  }
});
const upload = multer({ storage });

function addStoreItem(req, fileInfo) {
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
      featured: req.body.featured
    });
    newStoreItem.save(function (err) {
      if (err) {
        console.log("could not save the storeitem");
        reject("could not save the storeitem");
      }
    });
  })
}

exports.upload = upload;