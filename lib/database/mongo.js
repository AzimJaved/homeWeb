const mongoose = require('mongoose')
const endpoint = require('../../config.json').databaseEndpoint

mongoose.connect(endpoint);
let connection = mongoose.connection
connection.once("open", () => {
    console.log("Connection to the database has been established")
})
module.exports.connection = connection

