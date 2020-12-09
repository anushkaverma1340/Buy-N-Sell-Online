//jshint esversion:6

require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const app = express();

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use("/public", express.static(__dirname + "/public"));
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

mongoose.connect("mongodb://localhost:27017/buynsellDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

var upload = multer({
  storage: storage
});

const productSchema = new mongoose.Schema({
  name: String,
  rating: Number,
  category: String,
  productAbout: String,
  sellerName: String,
  sellerUsername: String,
  sellerContactNumber: Number,
  sellerEmail: String,
  images: [String]
});
const Product = mongoose.model("Product", productSchema);

const userSchema = new mongoose.Schema({
  name: String,
  contactNumber: Number,
  email: String,
  username: String,
  password: String,
  profileImage: String
});
const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/about", function(req, res) {
  const createdCookie = req.cookies.userData;
  if (createdCookie === undefined) {
    res.redirect("/");
  } else {
    res.render("about");
  }
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  const givenUsername = req.body.loginusername;
  const givenPassword = req.body.loginpassword;
  User.findOne({
    username: givenUsername
  }, function(err, founduser) {
    if (!err) {
      if (founduser) {
        bcrypt.compare(givenPassword, founduser.password, function(err, result) {
          if (result) {
            res.cookie("userData", founduser);
            res.redirect("mainpage");
          } else {
            res.render("message", {
              message: "Password incorrect!"
            });
          }
        });
      } else {
        res.render("message", {
          message: "Please register!"
        });
      }
    }
  });
});

app.get("/logout", function(req, res) {
  res.clearCookie("userData");
  res.redirect("/");
});

app.get("/mainpage", function(req, res) {
  const createdCookie = req.cookies.userData;
  if (createdCookie === undefined) {
    res.redirect("/");
  } else {
    res.render("mainpage");
  }
});

app.get("/products-to-sell", function(req, res) {
  const user = req.cookies.userData;
  if (user === undefined) {
    res.redirect("/");
  } else {
    Product.find({
      sellerUsername: req.cookies.userData.username
    }, function(err, foundProducts) {
      if (err) {
        console.log(err);
      } else {
        if (foundProducts.length === 0) {
          res.render("message", {
            message: "No Products!"
          });
        } else {
          res.render("productstosell", {
            productsToSell: foundProducts
          });
        }
      }
    });
  }
});

app.post("/products-to-sell", function(req, res) {
  Product.findByIdAndRemove(req.body.soldButton, function(err, foundProduct) {
    if (err) {
      console.log(err);
    }
  });
  res.redirect("/products-to-sell");
})

app.get("/profile", function(req, res) {
  const user = req.cookies.userData;
  if (user === undefined) {
    res.redirect("/");
  } else {
    res.render("profile", {
      thisUser: user
    });
  }
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", upload.single('profileImage'), function(req, res) {
  bcrypt.hash(req.body.loginpassword, saltRounds, function(err, hash) {
    const newUser = new User({
      name: req.body.loginname,
      contactNumber: req.body.loginnumber,
      email: req.body.loginemail,
      username: req.body.loginusername,
      password: hash,
      profileImage: req.file.filename
    });
    newUser.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        res.cookie("userData", newUser);
        res.redirect("/mainpage");
      }
    });
  });
});

app.get("/upload-product", function(req, res) {
  const createdCookie = req.cookies.userData;
  if (createdCookie === undefined) {
    res.redirect("/");
  } else {
    res.render("uploadproduct");
  }
});

app.post("/upload-product", upload.array('productImages', 3), function(req, res) {
const imagesArray = [];
req.files.forEach(function(file) {
  imagesArray.push(file.filename);
});
const newProduct = new Product({
  name: req.body.uploadProductName,
  rating: req.body.uploadProductRating,
  category: req.body.uploadProductCategory,
  productAbout: req.body.uploadproductAbout,
  sellerName: req.cookies.userData.name,
  sellerUsername: req.cookies.userData.username,
  sellerContactNumber: req.cookies.userData.contactNumber,
  sellerEmail: req.cookies.userData.email,
  images: imagesArray
});
newProduct.save(function(err) {
  if (err) {
    console.log(err);
  } else {
    res.redirect("/products-to-sell");
  }
});
});

app.get("/:productCategory", function(req, res) {
  const createdCookie = req.cookies.userData;
  if (createdCookie === undefined) {
    res.redirect("/");
  } else {
    const productCategory = req.params.productCategory;
    let category = "";
    switch (productCategory) {
      case "cars-and-automobiles":
        category = "Cars & Automobiles";
        break;
      case "properties":
        category = "Properties";
        break;
      case "mobiles":
        category = "Mobiles";
        break;
      case "jobs":
        category = "Jobs";
        break;
      case "bikes":
        category = "Bikes";
        break;
      case "electronic-appliances":
        category = "Electronic Appliances";
        break;
      case "vehicles-and-spares":
        category = "Vehicles & Spares";
        break;
      case "furniture":
        category = "Furniture";
        break;
      case "fashion":
        category = "Fashion";
        break;
      case "books-sports-and-hobbies":
        category = "Books, Sports & Hobbies";
        break;
      case "pets":
        category = "Pets";
        break;
      case "services":
        category = "Services";
        break;
    }
    Product.find({
      category: category
    }, function(err, foundProducts) {
      if (err) {
        console.log(err);
      } else {
        if (foundProducts.length === 0) {
          res.render("message", {
            message: "No Products Yet!"
          });
        } else {
          res.render("productslist", {
            productsList: foundProducts,
            route: "/" + productCategory
          });
        }
      }
    });
  }
});

app.post("/:productCategory", function(req, res) {
  const productId = req.body.productPageButton;
  Product.findOne({
    _id: productId
  }, function(err, foundProduct) {
    if (err) {
      console.log(err);
    } else {
      if (foundProduct) {
        res.render("product", {
          product: foundProduct
        });
      } else {
        res.render("message", {
          message: "Sorry, product does not exist"
        });
      }
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
