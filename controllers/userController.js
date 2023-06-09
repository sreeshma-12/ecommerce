const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const config = require("../config/config");
const randomstring = require("randomstring");
const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
// const orderMdeL = require("../models/orderMdeL");
const mongoose = require("mongoose");
const couponModel = require("../models/couponModel");
let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  auth: {
    user: config.emailUser,
    pass: config.emailPassword,
  },
});

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};
//------------------ for send mail --------------------
const sendVerifyMail = async (name, email, user_id) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
    const mailOptions = {
      from: config.emailUser,
      to: email,
      subject: "For verification mail",
      html:
        "<p>Hii" +
        name +
        ',please click here to <a href="http:127.0.0.1:3000/verify?id=' +
        user_id +
        '">Verify',
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:-", info.response);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};
//-------------- for reset password send mail -----------------------
const sendResetPasswordMail = async (name, email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
    const mailOptions = {
      from: config.emailUser,
      to: email,
      subject: "For Reset password",
      html:
        "<p>Hii " +
        name +
        ',please click here to<a href="http:127.0.0.1:3000/forgot-password?token=' +
        token +
        '">Reset</a>your password',
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:-", info.response);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};
const loadRegister = async (req, res) => {
  try {
    res.render("users/registration", { status: "hh" });
  } catch (error) {
    console.log(error.message);
  }
};
const insertUser = async (req, res) => {
  try {
    const spassword = await securePassword(req.body.password);
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      contact: req.body.contact,
      address: req.body.address,
      password: spassword,
      is_admin: 0,
    });
    const userData = await user.save();
    if (userData) {
      res.render("users/registration", {
        message: "Your registration has been successfully completed",
      });
    } else {
      res.render("users/registration", {
        message: "Your registration has been failed",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};
//--------login user methods started----------
const loginLoad = async (req, res) => {
  try {
    res.render("users/login");
  } catch (error) {
    console.log(error.message);
  }
};
const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });
    if (userData) {
      if (userData.status == "banned") {
        res.render("users/login", { message: "Admin Blocked Your account" });
      }
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_verified === 0) {
          res.render("users/login", { message: "please verify your mail" });
        } else {
          req.session.user_id = userData._id;
          req.session.user_type = "user";
          res.redirect("/home");
        }
      } else {
        res.render("users/login", {
          message: "Email and password is incorrect",
        });
      }
    } else {
      res.render("users/login", { message: "Email and password is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const loadHome = async (req, res) => {
  try {
    let products = await productModel.find({ is_delete: false });
    if (req.query?.sort != undefined) {
      products = products.sort({
        price: req.query.sort == "low" ? 1 : -1,
      });
    }
    products = await products;
    res.render("users/home", { products });
  } catch (error) {
    console.log(error.message);
  }
};
const loadProductdetail = async (req, res) => {
  try {
    res.render("users/product-detail");
  } catch (error) {
    console.log(error.message);
  }
};
const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};
//----------forgot password code started-----------------------
const forgotLoad = async (req, res) => {
  try {
    res.render("users/forgot");
  } catch (error) {
    console.log(error.message);
  }
};
const forgotVerify = async (req, res) => {
  try {
    const email = req.body.email;
    const userData = await User.findOne({ email: email });
    if (userData) {
      if (userData.is_verified === 0) {
        res.render("users/forgot", { message: "please verify your mail" });
      } else {
        const randomString = randomstring.generate();
        const updatedData = await User.updateOne(
          { email: email },
          { $set: { token: randomString } }
        );
        sendResetPasswordMail(userData.name, userData.email, randomString);
        res.render("users/forgot", {
          message: "please check your mail to reset your password",
        });
      }
    } else {
      res.render("users/forgot", { message: "user email is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const forgotPasswordLoad = async (req, res) => {
  try {
    const token = req.query.token;
    const tokenData = await User.findOne({ token: token });
    if (tokenData) {
      res.render("users/forgot-password", { user_id: tokenData._id });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const resetPassword = async (req, res) => {
  try {
    const password = req.body.password;
    const user_id = req.body.user_id;
    const secure_password = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate(
      { _id: user_id },
      { $set: { password: secure_password, token: "" } }
    );
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};
//---------- Otp ---------------------------
let otp = Math.random();
otp = otp * 1000000;
otp = parseInt(otp);
// console.log("otp",otp);

//-------------- OTP Page ----------------------
const otpget = (req, res) => {
  res.render("users/otp");
};
//-------------- Send OTP -------------------------
const sendOtp = async (req, res, next) => {
  try {
    if (req.body.password == req.body.repassword) {
      req.session.name = req.body.name;
      // req.session.image = req.file.filename;
      req.session.email = req.body.email;
      req.session.address = req.body.address;
      req.session.contact = req.body.contact;
      req.session.password = req.body.password;
      email = req.body.email;
      const user = await userModel.findOne({ email: email });
      if (!user) {
        //    console.log("hhh");
        // var mailOptions = {
        //     from: config.emailUser,
        //     to: req.body.email,
        //     subject: "Otp for registration is: ",
        //     html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>",
        // };
        // transporter.sendMail(mailOptions, (error, info) => {
        //     if (error) {
        //         return console.log(error);
        //     }
        //     res.render("users/otp", { status: "false" });
        // });
        res.render("users/otp", { status: "false" });
      } else {
        res.render("users/registration", { status: "true" });
      }
    } else {
      res.render("users/registration", { status: "false" });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
//------------------ Verify OTP -----------------------
const verifyotp = async (req, res, next) => {
  try {
    if (req.body.otp == otp) {
      req.session.password = await bcrypt.hash(req.session.password, 10);

      let newUser = userModel({
        name: req.session.name,
        email: req.session.email,
        address: req.session.address,
        contact: req.session.contact,
        password: req.session.password,
      });

      newUser.save().then(() => {
        req.session.useremail = req.session.Email;
        req.session.userlogged = true;
        req.session.user = newUser;
        res.redirect("/");
      });
    } else {
      res.render("users/otp", { status: "true" });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};
//-------------- Resend Otp ----------------------------
const resendOTP = (req, res, next) => {
  try {
    const mailoptions = {
      from: config.emailUser,
      to: req.session.email,
      subject: "OTP for registration is :",
      html:
        "<h3>OTP for account verification is </h3>" +
        "<h1 style='font-weight:bold;'>" +
        otp +
        "</h1>",
    };
    transporter.sendMail(mailoptions, (error, info) => {
      if (error) {
        res.render("users/error/error");
      }
      res.render("users/otp");
    });
  } catch (err) {
    next(err);
  }
};

//-----------------------   user home -------------------------------
const home = async (req, res, next) => {
  try {
    let banner = await bannerModel.findOne({ status: true }).limit(1);
    let category = await categoryModel.find().limit(1);
    let row = await categoryModel.find().skip(1).limit(2);
    let col = await categoryModel.find().skip(3).limit(1);
    let products = await productModel.find().limit(8).populate("brand");
    res.render("users/home", {
      page: "Home",
      category,
      row,
      col,
      products,
      banner,
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------- Shop ----------------------------
const shop = async (req, res, next) => {
  try {
    let category = await categoryModel.find({ status: "Show" });
    //  let allcount = await productModel.find().count();
    let searResult = [];
    if (req.query.category) {
      let products = await productModel.find({ brand: req.query.category });
      // let count = await productModel.find({
      // brand: req.query.cate,
      // }).countDocuments();
      res.render("users/shop", {
        page: "Shop",
        products,
        category,
        // count,
        // allcount,
        user: req.session.user,
      });
    } else if (req.query.page) {
      const page = req.query.page;
      let products = productModel.find();
      if (req.query.sort != undefined) {
        products = products.sort({
          price: req.query.sort == "low" ? 1 : -1,
        });
      }
      products = products.skip((page - 1) * 8).limit(8);
      products = await products;
      //  let count = await ProductModel.find({
      // brand: req.query.cate,
      //  }).countDocuments();
      res.render("users/shop", {
        page: "shop",
        products,
        category,
        // count,
        // allcount,
        user: req.session.user,
      });
    } else if (req.query.search) {
      let products = productModel.find({
        name: { $regex: req.query.search },
      });
      if (req.query.sort != undefined) {
        products = products.sort({
          price: req.query.sort == "low" ? 1 : -1,
        });
      }
      products = await products;
      res.render("users/shop", {
        page: "shop",
        products,
        category,
        // user:req.session.user,
      });
    } else {
      let products = productModel.find();
      if (req.query.sort != undefined) {
        products = products.sort({
          price: req.query.sort == "low" ? 1 : -1,
        });
      }
      products = products.limit(12);
      products = await products;
      // let count = await productModel.find().limit(12).count();
      res.render("users/shop", {
        // page: "shop",
        products,
        category,
        // count,
        // allcount,
        user: req.session.user,
      });
    }
  } catch (error) {
    next(error);
  }
};
// -------------- copy ----------------------------
const shopp = async (req, res, next) => {
  try {
    console.log("SHOP");
    let category = await categoryModel.find({ status: "Show" });
    //  let allcount = await productModel.find().count();
    let searResult = [];
    if (req.query.category) {
      let products = await productModel.find({ brand: req.query.category });
      // let count = await productModel.find({
      // brand: req.query.cate,
      // }).countDocuments();
      res.render("shop", {
        page: "Shop",
        products,
        category,
        // count,
        // allcount,
        user: req.session.user,
      });
    } else if (req.query.page) {
      const page = req.query.page;
      let products = await productModel
        .find()
        .skip((page - 1) * 8)
        .limit(8);
      //  let count = await ProductModel.find({
      // brand: req.query.cate,
      //  }).countDocuments();
      res.render("shop", {
        page: "shop",
        products,
        category,
        // count,
        // allcount,
        user: req.session.user,
      });
    } else if (req.query.search) {
      console.log(req.query.search);
      let products = await productModel.find({
        name: { $regex: req.query.search },
      });
      console.log(products);
      res.render("shop", {
        page: "shop",
        products,
        category,
        // user:req.session.user,
      });
    } else {
      let products = await productModel.find().limit(12);
      // let count = await productModel.find().limit(12).count();
      res.render("shop", {
        // page: "shop",
        products,
        category,
        // count,
        // allcount,
        user: req.session.user,
      });
    }
  } catch (error) {
    next(error);
  }
};
//-------------------------- wishlist -------------------------------
const wishlist = async (req, res, next) => {
  try {
    // let wishlist=await userModel.find({_id:req.session.user_id}).populate('wishlist')
    let wishlist = await userModel.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(req.session.user_id) } },
      {
        $lookup: {
          from: "productdatas",
          localField: "wishlist",
          foreignField: "_id",
          as: "wishlistData",
        },
      },
    ]);
    // console.log(find);
    wishlist = wishlist[0];
    res.render("users/wishlist", {
      page: "wishlist",
      wishlist,
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
};
const addwishlist = async (req, res, next) => {
  try {
    const id = req.session.user_id;
    let isExist = await userModel.findOne({ _id: id });
    let wishlist = isExist.wishlist.findIndex((pdid) => pdid == req.body.proId);
    if (wishlist == -1) {
      await userModel.updateOne(
        { _id: id },
        { $push: { wishlist: req.body.proId } }
      );
      res.json({ key: "added" });
    } else {
      res.json("alreadyexit");
    }
  } catch (error) {
    next(error);
  }
};
// ---------------------- address -----------------------------
const addaddress = async (req, res, next) => {
  try {
    const id = res.locals.userdata._id;
    let isExist = await userModel.findOne({ _id: id });
    let newaddresss = {
      fname: req.body.Name,
      house: req.body.House,
      post: req.body.post,
      city: req.body.city,
      district: req.body.district,
      state: req.body.state,
      pin: req.body.pin,
    };
    await userModel.updateOne({ _id: id }, { $push: { address: newaddresss } });
    res.redirect("/account");
  } catch (error) {
    next(error);
  }
};
// -------------------------- check out --------------------
const checkout = async (req, res, next) => {
  try {
    let id = req.query.id;
    let orderData = await orderModel.findOne({
      _id: id,
      order_status: "pending",
    });
    const coupon = await couponModel.find();
    //  let cartbill = await userModel.findOne({ _id: req.session.user_id });

    // let userData = await userModel.findOne({_id:req.session.user_id}).populate('cart.product_id')
    // let cart = await userModel.aggregate([{$match:{_id:req.session.user_id}}])
    // console.log(orderData,"..............");
    res.render("users/checkout", {
      // page: "none",
      // cart,
      // cartbill,
      // userData,
      orderData,
      user: req.session.user,
      coupon,
    });
  } catch (error) {
    next(error);
  }
};
const checkoutform = async (req, res, next) => {
  if (req.body.optradio == "cod") {
    let order = await orderModel.findOne({
      _id: req.body.id,
      order_status: "pending",
    });
    if (order) {
      orderModel
        .updateOne(
          {
            _id: req.body.id,
          },
          {
            $set: {
              address: {
                fname: req.body.fname,
                house: req.body.address1,
                house1: req.body.address2,
                phonenumber: req.body.pnumber,
                post: req.body.post,
                pin: req.body.pincode,
                city: req.body.city,
                district: req.body.district,
                state: req.body.state,
              },
              order_status: "completed",
              "payment.payment_id": "COD_" + req.body.id,
              "payment.payment_order_id": "COD_noOID",
              "payment.payment_method": "cash_on_delivery",
              "delivery_status.ordered.state": true,
              "delivery_status.ordered.date": Date.now(),
            },
          }
        )
        .then(() => {
          res.render("users/order-complete");
        });
    } else {
      res.redirect("/checkout");
    }
  }
};
// ------------------ verify payment -----------------------------------
const payment = async (req, res, next) => {
  try {
    console.log("verify", req.body);
    const { payment, order } = req.body;
    let hmac = crypto.createHmac("sha256", "OxPD34ItyleLJgzGlWfCQa1p");
    hmac.update(payment.razorpay_order_id + "|" + payment.razorpay_payment_id);
    hmac = hmac.digest("hex");
    if (hmac === payment.razorpay_signature) {
      console.log("payment success");
      const updatePayStatus = await order.findOneAndUpdate(
        { _id: order.receipt },
        { paymentStatus: "completed" }
      );
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
    //res.send(req.body)
  } catch (e) {
    next(e);
  }
};

// ----------------------------  try code --------------------------------

const verifyPayment = async (req, res, next) => {
  try {
    const id = req.session.user._id;
    await orderModel
      .updateOne(
        { _id: req.session.OrderId, user_Id: req.session.user._id },
        { $set: { paymentStatus: "Paid", paymentMethod: "Online Payment" } }
      )
      .then((data) => {
        res.json({ success: true });
      });

    const userData = await userModel.findById(res.locals.userdata._id);
    const cartProducts = userData.cart;

    for (let i = 0; i < cartProducts.length; i++) {
      let singleProduct = await productModel.findById(
        cartProducts[i].product_id
      );

      singleProduct.stock -= cartProducts[i].quantity;

      if (singleProduct.stock <= 0) {
        singleProduct.status = "Out of Stock";
      }

      singleProduct.save();
    }
    const userCart = await userModel.updateOne(
      { _id: id },
      { $unset: { cart: { $exists: true } } }
    );
    req.session.OrderId = "";
  } catch (error) {
    next(error);
  }
};
// ------------------------- order history---------------------------------------------
const orderhistory = async (req, res, next) => {
  const id = req.session.user_id;

  const userData = await userModel.findOne({ _id: id });
  const orderDetails = await orderModel
    .find({ userid: req.session.user_id })
    .sort({
      ordered_date: -1,
    })
    .populate("products.product_id");
  res.render("users/orderhistory", {
    userData,
    orderDetails,
    user: req.session.user,
  });
};

// ------------------order details------------------------
const orderdetails = async (req, res, next) => {
  res.render("users/orderdetails", {
    user: req.session.user,
  });
};

//----------------------------- Delete Item -----------------------
deleteitem: async (req, res, next) => {
  try {
    await userModel.updateOne(
      { _id: res.locals.userdata.id },
      { $pull: { wishlist: req.body.id } }
    );
    res.json("added");
  } catch (error) {
    next(error);
  }
};

// ------------------- single product ---------------------------
const productdetails = async (req, res, next) => {
  try {
    let product = await productModel.findOne({
      _id: mongoose.Types.ObjectId(req.query.pid),
    });
    // console.log(product)
    let brand = await categoryModel.findOne({
      _id: product.brand,
    });
    res.render("users/product-detail", {
      product,
      brand,
    });
  } catch (error) {
    next(error);
  }
};
// ---------- cart ----------------

const cart = async (req, res, next) => {
  try {
    // ------------------
    // let cart = await userModel.aggregate([{$match:{_id:mongoose.Types.ObjectId(req.session.user_id)}},

    let userData = await userModel
      .findOne({ _id: req.session.user_id })
      .populate("cart.product_id");
    //  let cart = await userModel.aggregate([{$match:{_id:req.session.user_id}},
    //   {$lookup:{
    //     from:"productdatas",
    //     localField:"cart",
    //     foreignField:"_id",
    //     as:"cartData"
    //     }
    //   }
    //   ]);
    // -----------
    const id = req.session.user_id;
    // console.log(id);
    // let cart = await userModel
    //   .findOne({ _id: id })
    //   .populate("cart.product_id");
    // console.log(cart);
    res.render("users/cart", {
      page: "cart",
      cart,
      userData,
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
};
const about = async (req, res, next) => {
  res.render("users/about", {
    user: req.session.user,
  });
};
const contact = async (req, res, next) => {
  res.render("users/contact", {
    user: req.session.user,
  });
};
const orderComplete = async (req, res, next) => {
  res.render("users/order-complete", {
    user: req.session.user,
  });
};

const addtocart = async (req, res, next) => {
  try {
    // const id = res.locals.userdata;

    const pdid = req.body.proId;
    let productprice = await productModel.findOne({ _id: pdid });
    let isExist = await userModel.findOne({ _id: req.session.user_id });
    let cart = isExist.cart.findIndex(
      (pdid) => pdid.product_id == req.body.pdid
    );
    if (cart == -1) {
      await userModel.updateOne(
        { _id: req.session.user_id },
        {
          $push: {
            cart: {
              product_id: pdid,
              quantity: 1,
              // price: productprice.price,
            },
          },
        }
      );
      res.json({ key: "added", price: productprice.price });
    } else {
      res.json("alreadyexit");
    }
  } catch (error) {
    next(error);
  }
};
// ----------------------------------------------

const createOrder = async (req, res) => {
  try {
    const { userId, address, billAmount, payment, products } = req.body;

    const newOrder = newOrder({
      user_id: userId,
      address: address,
      bill_amount: billAmount,
      payment: payment,
      products: products,
    });

    const savedOrder = await newOrder.save();

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
};

const orderid = async (req, res, next) => {
  const id = req.session.user_id;
  let total = 0;
  let cartProduct = [];
  const cartbill = await userModel
    .findOne({ _id: id })
    .populate("cart.product_id");
  // console.log(JSON.stringify(cartbill));
  cartbill.cart.forEach((id) => {
    total = total + id.quantity * id.product_id.price;
    let Product = {
      product_id: id.product_id._id,
      name: id.product_id.name,
      quantity: id.quantity,
      price: id.product_id.price,
    };
    cartProduct.push(Product);
  });
  let product = {
    userid: req.session.user_id,
    bill_amount: total,
    products: cartProduct,
    coupon: { discount: 0 },
  };
  let newOrder = new orderModel(product);
  newOrder.save().then((data) => {
    res.json(data);
  });
};
//---------------------- Cart Quantity Increase -----------------------------//
const quantity = async (req, res, next) => {
  try {
    const id = req.session.user_id;
    const cdid = req.body.id;
    let productcheck = await userModel.findOne({ _id: id, "cart._id": cdid });
    productcheck.cart.forEach(async (val, i) => {
      if (val._id.toString() == cdid.toString()) {
        productquantity = await productModel.findOne({ _id: val.product_id });
        if (productquantity.stock <= val.quantity) {
          res.json({ key: "over", price: productquantity.stock });
        } else {
          await userModel.updateOne(
            { _id: id, "cart._id": cdid },
            { $inc: { "cart.$.quantity": 1 } }
          );
          res.json("added");
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
//--------------------------- Cart Ouantity decrease -----------------------//
const quantitydec = async (req, res, next) => {
  try {
    const id = req.session.user_id;
    const cdid = req.body.id;
    let quantitycheck = await userModel.findOne({
      _id: id,
      "cart._id": cdid,
    });
    quantitycheck.cart.forEach(async (val, i) => {
      if (val._id.toString() == cdid.toString()) {
        if (val.quantity <= 1) {
          await userModel.updateOne(
            { _id: id },
            { $pull: { cart: { _id: cdid } } }
          );
          res.json("deleted");
        } else {
          await userModel.updateOne(
            { _id: id, "cart._id": cdid },
            { $inc: { "cart.$.quantity": -1 } }
          );
          res.json("added");
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
const cartDelete = async (req, res, next) => {
  try {
    const id = req.params.id;
    await userModel.findOne({ _id: id });

    await userModel
      .updateOne({ _id: req.session.user_id }, { $pull: { cart: { _id: id } } })
      .then(() => {
        res.redirect("/cart");
      });
  } catch (error) {
    next(error);
  }
};
const wishlistDelete = async (req, res, next) => {
  try {
    const id = req.params.id;
    await userModel
      .findByIdAndUpdate(
        { _id: req.session.user_id },
        { $pull: { wishlist: id } }
      )
      .then(() => {
        res.redirect("/wishlist");
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    next(error);
  }
};
const productdet = async (req, res, next) => {
  res.render("users/product-detail", {
    user: req.session.user,
  });
};
const account = async (req, res, next) => {
  res.render("users/account", {
    user: req.session.user,
  });
};
const couponValidate = async (req, res, next) => {
 try {
const user = req.session.user_id;
const code = req.body.couponCode;
const userData = await userModel.findById(user)
 console.log(code ,"DATA");
 const appliedCoupons = userData.appliedCoupons.map(item=>item.couponCode)
 console.log("appliedCoupons",appliedCoupons);
if (appliedCoupons.includes(code)) {
  res.json({ success: false, message: "Coupon Already Applied" });
} else {
  res.json({ success: true, message: "Coupon is Valid." });
   }}catch (error) {
    next(error);
  }
};
const wallet = async (req, res, next) =>{
  try {
    let wallet = await userModel.aggregate(
      { $match: { _id: mongoose.Types.ObjectId(req.session.user_id) } },
      {
        $lookup: {
          from: "productdatas",
          localField: "wallet",
          foreignField: "_id",
          as: "walletData",
        },
      },
    );
  } catch (error) {
    next(error);
  }
};


module.exports = {
  loadRegister,
  insertUser,
  loginLoad,
  verifyLogin,
  loadHome,
  userLogout,
  forgotLoad,
  forgotVerify,
  forgotPasswordLoad,
  resetPassword,
  loadProductdetail,
  otpget,
  sendOtp,
  verifyotp,
  resendOTP,
  shop,
  wishlist,
  addwishlist,
  productdetails,
  addaddress,
  checkout,
  cart,
  about,
  contact,
  orderComplete,
  addtocart,
  quantitydec,
  quantity,
  cartDelete,
  wishlistDelete,
  createOrder,
  orderid,
  checkoutform,
  orderhistory,
  productdet,
  payment,
  orderdetails,
  shopp,
  account,
  couponValidate,
  wallet
};
