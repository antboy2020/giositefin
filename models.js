var mongoose = require('mongoose');

mongoose.model('User', new mongoose.Schema({
    email: String,
    passwordHash: String
}))

// mongoose.model('ShoppingItem', new mongoose.Schema({
//     name: String,
//     price: String,
//     description: String
    
// }))