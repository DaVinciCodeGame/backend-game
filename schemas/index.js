const express = require("express")
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const app = express();
dotenv.config();

mongoose.set("strictQuery", false);

//DB settings
mongoose.connect(process.env.MONGO_URL);
var DB = mongoose.connection;

DB.once('open', function(){
  console.log('DB connected')

})

DB.on('error', function(err){
  console.log('DB ERROR: ', err)

})

app.listen(5000, function(){
  console.log('server on! https://localhost:5000')
});