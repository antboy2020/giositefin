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
    type: String
}));