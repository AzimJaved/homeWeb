const mongoose = require('mongoose')
var applianceSchema = mongoose.Schema({
    id: String,
    name: String,
    image: String,
    pin: Number,
    lastStatus: String,
    lastStatusTime: Date,
    type: String
})

module.exports.Appliance = mongoose.model('Appliance', applianceSchema )