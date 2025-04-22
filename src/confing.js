require('dotenv').config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("✅ MongoDB connected successfully");
})
.catch((error) => {
  console.error("❌ MongoDB connection error:", error.message);
});


// Create Schema for login
const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true
    }
});

// Create Schema for stock
const StockSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    buyingPrice: {
        type: Number,
        required: true
    },
    sellingPrice: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantityType: {
        type: String,
        required: true
    },
    image: {
        type: Buffer, 
        required: true
    }
});

// Create Schema for orders
const OrderSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    Address: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: Number,
        required: true
    }
});

// Create Schema for OTPs
const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

// Define the collections
const adminCollection = mongoose.model("admin", LoginSchema);
const stockCollection = mongoose.model("stock", StockSchema);
const orderCollection = mongoose.model("order", OrderSchema);
const OTPCollection = mongoose.model("OTP", OTPSchema);

// Export collections to use elsewhere in the project
module.exports = { adminCollection, stockCollection, orderCollection, OTPCollection };
