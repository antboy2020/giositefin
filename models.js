var mongoose = require('mongoose');

mongoose.model('User', new mongoose.Schema({
    email: String,
    passwordHash: String
}));

mongoose.model('StoreItem', new mongoose.Schema({
    filename: String,
    price: Number,
    description: String,
    xs: Number,
    s: Number,
    m: Number,
    l: Number,
    xl: Number,
    type: String,
    ml30: Number,
    ml50: Number,
    ml100: Number,
    ml250: Number,
    g100: Number,
    featured: Boolean,
    orderNumber: Number,
}));