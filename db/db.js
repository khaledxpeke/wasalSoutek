const mongoose = require("mongoose");
require("dotenv").config();
const database_Url = process.env.DATABASE_URL;
const localDB = database_Url;
const connectDB = async () => {
  await mongoose.connect(localDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  console.log("MongoDB Connected")
}
module.exports = connectDB