const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const otpGenerator = require('otp-generator');

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

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();

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
        const products = await stockCollection.find({}, { image: 1, buyingPrice:1, sellingPrice:1, productName:1 , productId:1}).limit(100);  // Fetch first 10 products (or adjust as needed)

        res.render("home", { products, USERNAME});
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching products.");
    }
});

app.get("/logout", async (req, res) => {
    USERNAME="";
    res.send(`
        <html>
            <body>
                <p>Loging out.....</p>
                <script>
                    setTimeout(() => {
                        document.getElementById('redirectForm').submit();
                    }, 1000); // 1-second delay
                </script>
                <form id="redirectForm" action="/" method="get">
                </form>
            </body>
        </html>
    `);
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/orders", async (req,res) => {
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
                USERNAME = req.body.name;
                return res.render("admin");
            }
            else{
                USERNAME = req.body.name;
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

app.post("/orderPlace", async (req, res)=>{
    const data = {
        userName: USERNAME,
        productName: req.body.productName,
        quantity: req.body.quantity,
        Address: req.body.Address,
        phoneNumber: req.body.phoneNumber
    }
    const {phoneNumber} = req.body;
    if (USERNAME==""){
        res.send(`<html>
            <body>
                <p>You are not logged in. So pls first login</p>
                <script>
                    setTimeout(() => {
                        document.getElementById('redirectForm').submit();
                    }, 1000); // 1-second delay
                </script>
                <form id="redirectForm" action="/login" method="get">
                </form>
            </body>
        </html>`); 

    }else{

        if (phoneNumber.toString().length !==10){
            return res.send("Ivalid phone number");
        }else{
            orderCollection.create(data);
        }
        return res.render("orderplaced")
    }

});

app.post("/req-otp", async (req,res) => {
    res.render("req-otp");
});

app.post("/send-otp", async (req, res) => {
    // res.redirect("/");
    const name = req.body.user;
    const user = await adminCollection.findOne({ name });

    if(!user){
        return res.send("The usernam dosn't esist ");
    }
    
    if (user.email==" "){
        return res.send("There is bo email registor with this.");
    }

    const otp = otpGenerator.generate(6, { 
        digits: true, 
        lowerCaseAlphabets: false, 
        upperCaseAlphabets: false, 
        specialChars: false 
      });
      
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log(otp);

    const email = user.email; 
    const deletes = await OTPCollection.deleteMany({ email: user.email });

    await OTPCollection.create({ email: user.email, otp: otpHash, expiresAt });



    const mailOptions = {
        from: 'hardbosamiya9b@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}. It expires in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send("Error sending OTP");
        }
        console.log("OTP sent: " + info.response);
        res.status(200).send(`<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OTP-Verification</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="form-container-admin">
                    <h2>Admin Panel</h2>
                    <form action="/verify" method="post">
                        <div class="form-group">
                            <label for="OTP">OTP:</label>
                            <input type="text" name="OTP" placeholder="Enter OTP" required autocomplete="off">
                            <input type="hidden" name="email" value="${email}">
                        </div>
                        <button type="submit" class="submit-btn">Verify</button>
                    </form>
                </div>
            </body>
            </html>`);
            
});

});

app.post("/verify", async (req,res) => {
    const { OTP,email } = req.body;
    
    console.log(email);

    const otpHash = crypto.createHash('sha256').update(OTP).digest('hex');
    const otpRecord = await OTPCollection.findOne({ email: email });

    if (!otpRecord || otpRecord.expiresAt < new Date() || otpHash!=otpRecord.otp ) {
        return res.send("Invalid or expired OTP.");
    }
    else {
        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New password</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="form-container-admin">
        <h2>Admin Pannel</h2>
        <form action="/new" method="post" >
            <div class="form-group">
                <label for="OTP">New Password:</label>
                <input type="text" name="password" id="password" placeholder="new password" required autocomplete="off">
            </div>
            
            <div class="form-group">
                <label for="OTP">Again:</label>
                <input type="text" name="again" id="again" placeholder="Eneter Password" required autocomplete="off">
                <input type="hidden" name="email" value="${email}">
            </div>
            <button type="submit" class="submit-btn">Verify</button>
        </form>
    </div>
</body>
</html>`);
    }


});

app.post("/new", async (req,res) => {
    const newp = req.body.password;
    const again = req.body.again;
    const emails = req.body.email;

    if (newp==again){
        const saltRounds = 10;
        const hashPassword = await bcrypt.hash(again, saltRounds);
        await adminCollection.findOneAndUpdate({email : emails}, {$set : {password: hashPassword}});
        return res.redirect("/login");
    }
    res.send(`
        <html>
            <body>
                <p>both are not same</p>
                <script>
                    setTimeout(() => {
                        document.getElementById('redirectForm').submit();
                    }, 1000); // 1-second delay
                </script>
                <form id="redirectForm" action="/new" method="post">
                </form>
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
                        }, 1000); // 1-second delay
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