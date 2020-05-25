var mongoose = require('mongoose');

mongoose.model('User', new mongoose.Schema({
    email: String,
    passwordHash: String
}));

mongoose.model('StoreItem', new mongoose.Schema({
    filename: String,
    price: Number,
    description: String,
    xs: String,
    s: String,
    m: String,
    l: String,
    xl: String,
    type: String
}));