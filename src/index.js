const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const otpGenerator = require('otp-generator');
const session = require("express-session");

const { adminCollection } = require("./confing");
const { stockCollection } = require("./confing");
const { orderCollection } = require("./confing");
const { OTPCollection } = require("./confing");

let USERNAME = "";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hardbosamiya9b@gmail.com',
        pass: 'jsbw quqt tkul zoft'
    }
});

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(express.static("public"));

console.log("adminCollection Model:", adminCollection);
console.log("stockCollection Model:", stockCollection);
console.log("orderCollection Model:", orderCollection);
console.log("OTPCollection Model:", OTPCollection);

app.get("/", async (req, res) => {
    try {
        const products = await stockCollection.find({}, { image: 1, buyingPrice:1, sellingPrice:1, productName:1 , productId:1}).limit(100);
        res.render("home", { products, USERNAME: req.session.username });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching products.");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.clearCookie("connect.sid"); // Clear session cookie
        res.redirect("/"); // Redirect to home after logout
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/orders", async (req, res) => {
    res.render("orders");
});

app.post("/order", async (req, res) => {
    const { productId } = req.body;
    const product = await stockCollection.findById(productId);

    res.render("order", {
        productName : product.productName,
        image: product.image,
        buyingPrice: product.buyingPrice
    });
});

app.post("/signup", async (req, res) => {
    try {
        const data = {
            name: req.body.name,
            password: req.body.password,
            email: " ",
            userType: "user"
        };

        const existingUser = await adminCollection.findOne({ name: data.name });

        if (existingUser) {
            return res.send("User already exists. Please choose a different name.");
        }

        const saltRounds = 10;
        data.password = await bcrypt.hash(data.password, saltRounds);

        await adminCollection.create(data);
        console.log("User registered:", data.name);

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error registering user.");
    }
});

app.get("/signup", async (req,res) => {
    return res.render("signup");
});

app.post("/login", async (req, res) => {
    if (req.body.which==1){
        const orders = await orderCollection.find({},{_id: 1, userName: 1,productName: 1, quantity: 1, Address: 1, phoneNumber: 1})
        return res.render("orders", {orders});
    }

    if (req.body.which == 2) {
        const products = await stockCollection.find({}, { _id: 1, productName: 1, quantity: 1, buyingPrice: 1, sellingPrice: 1, category: 1, quantityType: 1, image: 1 });

        const modifiedProducts = products.map(product => ({
            ...product._doc,
            image: product.image ? `data:image/png;base64,${product.image.toString('base64')}` : null
        }));

        return res.render("myproduct", { products: modifiedProducts });
    }

    try {
        const user = await adminCollection.findOne({ name: req.body.name });

        if (!user) {
            return res.send("User not found.");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);

        if (isPasswordMatch) {
            if(user.userType=="admin"){
                req.session.username = req.body.name;
                req.session.username = 'user_name';  // Replace with actual user data
                res.redirect("/");
                return res.render("admin");
            } else {
                req.session.username = req.body.name;
                req.session.username = 'user_name';  // Replace with actual user data
                res.redirect("/");
                return res.redirect("/");
            }
        } else {
            return res.send("Wrong password.");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error logging in.");
    }
});

app.post("/admin", upload.single("image"), async (req, res) => {
    console.log("Headers:", req.headers);
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);

    if (!req.file) {
        return res.status(400).send("No image uploaded.");
    }

    const data = {
        productName: req.body.productName,
        quantity: req.body.quantity,
        buyingPrice: req.body.buyingPrice,
        sellingPrice: req.body.sellingPrice,
        category: req.body.category,
        quantityType: req.body.quantityType,
        image: req.file.buffer
    };

    await stockCollection.create(data);
    console.log("Product added successfully!");
    return res.send("Product added successfully!");
});

app.post("/orderPlace", async (req, res) => {
    const data = {
        userName: req.session.username,
        productName: req.body.productName,
        quantity: req.body.quantity,
        Address: req.body.Address,
        phoneNumber: req.body.phoneNumber
    }
    const { phoneNumber } = req.body;

    if (!req.session.username){
        res.send(`<html>
            <body>
                <p>You are not logged in. So pls first login</p>
                <script>
                    setTimeout(() => {
                        document.getElementById('redirectForm').submit();
                    }, 1000);
                </script>
                <form id="redirectForm" action="/login" method="get"></form>
            </body>
        </html>`);
    } else {
        if (phoneNumber.toString().length !== 10){
            return res.send("Invalid phone number");
        } else {
            await orderCollection.create(data);
        }
        return res.render("orderplaced");
    }
});

app.post("/req-otp", async (req,res) => {
    res.render("req-otp");
});

app.post("/send-otp", async (req, res) => {
    const name = req.body.user;
    const user = await adminCollection.findOne({ name });

    if(!user){
        return res.send("The username doesn't exist");
    }

    if (user.email == " "){
        return res.send("There is no email registered with this.");
    }

    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log(otp);

    await OTPCollection.deleteMany({ email: user.email });
    await OTPCollection.create({ email: user.email, otp: otpHash, expiresAt });

    const mailOptions = {
        from: 'hardbosamiya9b@gmail.com',
        to: user.email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}. It expires in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send("Error sending OTP");
        }
        console.log("OTP sent: " + info.response);
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head><title>OTP-Verification</title><link rel="stylesheet" href="/style.css"></head>
            <body>
            <div class="form-container-admin">
                <h2>Admin Panel</h2>
                <form action="/verify" method="post">
                    <input type="text" name="OTP" placeholder="Enter OTP" required>
                    <input type="hidden" name="email" value="${user.email}">
                    <button type="submit">Verify</button>
                </form>
            </div>
            </body>
            </html>`);
    });
});

app.post("/verify", async (req, res) => {
    const { OTP, email } = req.body;
    const otpHash = crypto.createHash('sha256').update(OTP).digest('hex');
    const otpRecord = await OTPCollection.findOne({ email });

    if (!otpRecord || otpRecord.expiresAt < new Date() || otpHash !== otpRecord.otp) {
        return res.send("Invalid or expired OTP.");
    } else {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>New password</title><link rel="stylesheet" href="/style.css"></head>
            <body>
            <div class="form-container-admin">
                <h2>Admin Panel</h2>
                <form action="/new" method="post">
                    <input type="text" name="password" placeholder="New password" required>
                    <input type="text" name="again" placeholder="Enter password again" required>
                    <input type="hidden" name="email" value="${email}">
                    <button type="submit">Change</button>
                </form>
            </div>
            </body>
            </html>`);
    }
});

app.post("/new", async (req, res) => {
    const { password, again, email } = req.body;

    if (password === again) {
        const hash = await bcrypt.hash(password, 10);
        await adminCollection.findOneAndUpdate({ email }, { $set: { password: hash } });
        return res.redirect("/login");
    }

    res.send(`
        <html>
            <body>
                <p>Passwords do not match</p>
                <script>
                    setTimeout(() => {
                        document.getElementById('redirectForm').submit();
                    }, 1000);
                </script>
                <form id="redirectForm" action="/new" method="post"></form>
            </body>
        </html>
    `);
});

app.post("/delete", async (req, res) => {
    try {
        const id = req.body.id;

        if (!id) {
            return res.status(400).send("ID is required");
        }

        const result = await orderCollection.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).send("Order not found");
        }

        console.log(`Deleted order with ID: ${id}`);

        res.send(`
            <html>
                <body>
                    <p>Order deleted successfully. Redirecting...</p>
                    <script>
                        setTimeout(() => {
                            document.getElementById('redirectForm').submit();
                        }, 1000);
                    </script>
                    <form id="redirectForm" action="/login" method="post">
                        <input type="hidden" name="which" value="1">
                    </form>
                </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting order");
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on Port: ${port}`);
});
