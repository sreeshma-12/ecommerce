const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/userImages"));
  },
  filename: function (req, file, cb) {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  },
});

const upload = multer({ storage: storage });
const userController = require("../controllers/userController");
const ajax = require("../middleware/ajax");
router.get("/register", auth.isLogout, userController.loadRegister);
router.post("/register", upload.single("image"), userController.insertUser);
router.get("/", auth.isLogout, userController.loginLoad);
router.get("/login", auth.isLogout, userController.loginLoad);
router.post("/otp", userController.sendOtp);
router.post("/verifyotp", userController.verifyotp);
router.get("/resend", userController.resendOTP);
router.get("/about", userController.about);
router.get("/contact", userController.contact);

router.get("/wishlist", auth.isLogin, userController.wishlist);
router.get("/shop", auth.isLogin, userController.shop);
router.get("/shop", auth.isLogin, userController.shopp);

router.get("/orderhistory", auth.isLogin, userController.orderhistory);
router.get("/checkout", auth.isLogin, userController.checkout);
router.get("/cart", auth.isLogin, userController.cart);
router.get("/order-complete", auth.isLogin, userController.orderComplete);
router.post("/orderid", auth.isLogin, userController.orderid);
router.post("/checkoutform", auth.isLogin, userController.checkoutform);
router.post("/addwishlist", auth.isLogin, userController.addwishlist);
router.post(
  "/addwishlist",
  auth.isLogin,
  ajax.ajaxSession,
  userController.addwishlist
);
router.post("/addtocart", auth.isLogin, userController.addtocart);
router.post("/delete-cart/:id", auth.isLogin, userController.cartDelete);
router.post(
  "/delete-wishlist/:id",
  auth.isLogin,
  userController.wishlistDelete
);
router.post("/quantity", auth.isLogin, userController.quantity);
router.post("/quantitydec", auth.isLogin, userController.quantitydec);
router.post("/orders/create", auth.isLogin, userController.createOrder);
router.post("/product-detail", auth.isLogin, userController.loadProductdetail);
router.post(
  "/product-detail",
  auth.isLogin,
  ajax.ajaxSession,
  userController.loadProductdetail
);
router.get("/product-detail", auth.isLogin, userController.productdetails);
router.get("/productdetails", auth.isLogin, userController.productdetails);

// router.get("/payment", auth.isLogin,userController.verifypayment);
router.get("/product-det", auth.isLogin, userController.productdet);
router.get("/home", auth.isLogin, userController.loadHome);
router.get("/orderdetails", auth.isLogin, userController.orderdetails);
router.get("/account", auth.isLogin, userController.account);

router.post("/login", userController.verifyLogin);
router.get("/logout", userController.userLogout);
router.get("/forgot", auth.isLogout, userController.forgotLoad);
router.post("/forgot", userController.forgotVerify);
router.get(
  "/forgot-password",
  auth.isLogout,
  userController.forgotPasswordLoad
);
router.post("/forgot-password", userController.resetPassword);
router.post("/couponvalidate", userController.couponValidate);

module.exports = router;
