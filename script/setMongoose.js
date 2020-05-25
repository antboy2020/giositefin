const Grid = require('gridfs-stream');
const mongoose = require('mongoose');

// Mongo URI
const mongoURI = 'mongodb://127.0.0.1:27017/gio-site-data';
mongoose.connect(mongoURI, { useUnifiedTopology: true, useNewUrlParser: true });

// Create mongo connection
const conn = mongoose.connection;

//User object for log-in and sign-up
const User = mongoose.model('User');

//Store item object for item details
const StoreItem = mongoose.model('StoreItem');

//Cart for session
// const Cart = mongoose.model('Cart');

// Init gfs
var gfs;

conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
    exports.gfs = gfs;
});

exports.mongoURI = mongoURI;
exports.User = User;
exports.StoreItem = StoreItem;
// exports.Cart = Cart;