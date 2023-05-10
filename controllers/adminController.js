const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const categoryModel = require("../models/categoryModel");
const orderModel = require("../models/orderModel");
const bannerModel = require("../models/bannerModel");
const productModel = require("../models/productModel");
const couponModel = require("../models/couponModel");
const fs = require("fs");
const path = require("path");

// userlogin started
const loadLogin = async (req, res) => {
    try {
        res.render("admin/login");
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
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.is_admin === 0) {
                    res.render("admin/login", { message: "Email and password incorrect" });
                } else {
                    req.session.user_id = userData._id;
                    req.session.user_type = "admin"
                    res.redirect("/admin/home");
                }
            } else {
                res.render("admin/login", { message: "Email and password incorrect" });
            }
        } else {
            res.render("admin/login", { message: "Email and password incorrect" });
        }
    } catch (error) {
        console.log(error.message);
    }
};

const loadDashboard = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id });
        res.render("admin/home", { admin: userData });
    } catch (error) {
        console.log(error.message);
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect("/admin");
    } catch (error) {
        console.log(error.message);
    }
};

const adminDashboard = async (req, res) => {
    try {
        // var search = '';
        // if (req.query.search) {
        //   search = req.query.search;
        // }
        // const userData = await User.find({
        //   is_admin: 0,
        //   $or: [
        //     { name: { $regex: '.*' + search + '.*', $options: 'i' } },
        //     { email: { $regex: '.*' + search + '.*', $options: 'i' } },
        //     { contact: { $regex: '.*' + search + '.*', $options: 'i' } }
        //   ]
        // });
        let users = await userModel.find();
        res.render("admin/users", { users });
    } catch (error) {
        console.log(error.message);
    }
};

// ------------- products update in dashboard-----------------//
const home = async (req, res, next) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);
        let salesChart = await orderModel.aggregate([
            {
                $match: {
                    order_status: { $ne: "pending" },
                    ordered_date: {
                        $gte: startOfMonth,
                        $lt: endOfMonth,
                    },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$ordered_date" } },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);
        let Orderpending = await orderModel.countDocuments({
            order_status: "pending",
        });
        let Ordercanceled = await orderModel.countDocuments({
            order_status: "canceled",
        });
        let paymentpending = await orderModel.countDocuments({
            "payment.payment_status": "pending",
        });
        let paymentpaid = await orderModel.countDocuments({
            "payment.payment_status": "completed",
        });
        let product = await productModel.find().count();
        let category = await categoryModel.find().count();
        let order = await orderModel.find({ order_status: { $ne: "pending" } }).count();
        let user = await userModel.find().count();
        orderModel
            .find({ order_status: { $ne: "pending" } })
            .populate("userid")
            .sort({ ordered_date: -1 })
            .limit(10)
            .then((orders) => {
                res.render("admin/home", {
                    page: "dashboard",
                    admin: res.locals.admindata.name,
                    orders,
                    product,
                    category,
                    order,
                    User,
                    salesChart,
                    Orderpending,
                    Ordercanceled,
                    paymentpending,
                    paymentpaid,
                });
            });
    } catch (error) {
        next(error);
    }
};
// -------------------  users list ----------------------------
const customers = async (req, res, next) => {
    try {
      const users = await userModel.find();
      res.render("admin/customers", {
        page: "customers",
        users,
        admin: res.locals.admindata.name,
      });
    } catch (error) {
      next(error);
    }
  };

//-------------- block user ------------------//

const block = async (req, res, next) => {
    try {
        const id = req.params.id;
        await userModel.updateOne({ _id: id }, { $set: { status: "banned" } }).then(() => {
            res.redirect("/admin/customers");
        });
    } catch (error) {
        next(error);
    }
};
//------------- Unblock Users -----------------

const unblock = async (req, res, next) => {
    try {
        const id = req.params.id;
        await userModel.updateOne({ _id: id }, { $set: { status: "unbanned" } }).then(() => {
            res.redirect("/admin/customers");
        });
    } catch (error) {
        next(error);
    }
};
//-------------- add new user-------------------
const newUserLoad = async (req, res) => {
    try {
        res.render("admin/new-user");
    } catch (error) {
        console.log(error.message);
    }
};
const addUser = async (req, res) => {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const contact = req.body.contact;
        const password = randomstring.generate(8);

        const spassword = await securePassword(password);

        const user = new User({
            name: name,
            email: email,
            contact: contact,
            password: spassword,
        });
        const userData = await user.save();
        if (userData) {
            res.redirect("/admin/customers");
        } else {
            res.render("admin/new-user", { message: "Something wrong" });
        }
    } catch (error) {
        console.log(error.message);
    }
};
//---------------edit user-------------------
const editUserLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById({ _id: id });
        if (userData) {
            res.render("admin/edit-user", { user: userData });
        } else {
            res.redirect("/admin/customers");
        }
    } catch (error) {
        console.log(error.message);
    }
};
const updateUsers = async (req, res) => {
    try {
        const userData = await User.findByIdAndUpdate({ _id: req.body.id }, { $set: { name: req.body.name, email: req.body.email, contact: req.body.contact } });
        res.redirect("/admin/customers");
    } catch (error) {
        console.log(error.message);
    }
};
//---------------- delete user --------------------
const deleteUser = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.deleteOne({ _id: id });
        res.redirect("/admin/customers");
    } catch (error) {
        console.log(error.message);
    }
};
//---------------- add category ---------------------
const addCategory = async (req, res) => {
    try {
        const name = req.body.name;

        const oldCategory = await addCategory.findOne({ title: { $regex: ".*" + title + ".*", $options: "i" } });
        if (oldCategory) {
            res.render("admin/categoryManagement", { message: "Already exists this category" });
        } else {
            const newCategory = new categoryModel({
                categoryName: name,
            });
            const categoryData = await newCategory.save();
            if (categoryData) {
                res.render("admin/categoryManagement", { message: "successfully added new category" });
            } else {
                res.render("admin/categoryManagement", { message: "something went wrong.Try again" });
            }
        }
    } catch (error) {
        console.log(error.message);
    }
};
//----------------- products page -------------------
const products = async (req, res, next) => {
    try {
        const products = await productModel.find({ is_delete: false }).populate("brand");
        res.render("admin/products", {
            //   page: "Products",
            products,
            // admin: res.locals.admindata.name,
        });
    } catch (error) {
        next(error);
    }
};
const addProducts = async (req, res, next) => {
    try {
        let category = await categoryModel.find();
        res.render("admin/new-product", {
            // page: "products",
            // admin: res.locals.admindata.name,
            field: "field",
            userstatus: "false",
            category,
        });
    } catch (error) {
        next(error);
    }
};
//-------------- Add products -----------------------------
const addProduct = async (req, res, next) => {
    try {
        let category = await categoryModel.find();
        const filenames = req.files.map((file) => file.filename);
        if (
            req.body.name &&
            req.body.description &&
            req.body.shortdescription &&
            req.body.price &&
            req.body.brand &&
            req.body.stock &&
            // req.body.status &&
            filenames
        ) {
            let products = productModel({
                name: req.body.name,
                description: req.body.description,
                shortDescription: req.body.shortdescription,
                price: req.body.price,
                brand: req.body.brand,
                stock: req.body.stock,
                // status: req.body.status,
                image: filenames,
            });
            products.save().then(() => {
                res.redirect("/admin/products");
            });
        } else {
            res.render("admin/new-product", {
                // page: "products",
                // admin: res.locals.admindata.name,
                field: "no field",
                userstatus: "false",
                category,
            });
        }
    } catch (error) {
        next(error);
    }
};
//  ----------------------delete Products ---------------------
// ----------------------------------------------------------------
//    products.image.forEach((value) => {
//           fs.unlink(
//             path.join(__dirname, "../public/images/", value),
//     () => {
//     }
//    );
// });
//  ---------------------------------------------------------------

deleteproduct = async (req, res, next) => {
    try {
        const product = await productModel.findByIdAndUpdate(req.params.id, { $set: { is_delete: true } }, { new: true });
        // req.flash('success_msg', 'Product has been soft deleted');
        res.redirect("/admin/products");
    } catch (error) {
        console.log(error);
        // req.flash('error_msg', 'Error occurred while deleting the product');
        res.redirect("/admin/products");
    }
};

//------------------- category ---------------------------
const category = async (req, res) => {
    try {
        let Categories = await categoryModel.find({ is_delete: false });
        res.render("admin/category", {
            // page: "category",
            // admin: res.locals.admindata.name,
            Categories,
        });
    } catch (error) {
        console.log(error.message);
    }
};

//------------------ Add Category page -----------------------
const addcategory = (req, res, next) => {
    try {
        res.render("admin/new-category");
    } catch (error) {
        console.log(error, "error");
        next(error);
    }
};
//--------------------- Add categorys ----------------------
const addcategorydetails = async (req, res) => {
    try {
        let Cname = req.body;
        let nameCat = req.body.name;
        // let Cname = req.body.category;
        let catecheck = await categoryModel.findOne({ categoryName: nameCat });
        if (!catecheck) {
            let category = new categoryModel({
                categoryName: nameCat,

                // status: req.body.status,
                //  id: req.body.id,
                image: req.file.filename,
            });
            await category.save();
            res.redirect("/admin/category");
            //categorys.save().then(() => {
            //res.redirect("/admin/category");
            //});
        } else {
            res.redirect("/admin/category");
        }
    } catch (error) {
        console.log(error.message);
    }
};
const deletecategories = async (req, res) => {
    try {
        const id = req.params.id;
        // const img = req.params.val;
        await categoryModel.findByIdAndUpdate({ _id: id }, { $set: { is_delete: true } });
        //  fs.unlink(path.join(__dirname, "../public/productimages/", img), () => {
        // });
        res.redirect("/admin/category");
    } catch (error) {
        next(error);
    }
};

const Updatecategories = async (req, res, next) => {
    try {
        const id = req.params.id;
        // const val = req.params.val;
        const cname = req.body.name.toLowerCase();
        let cateToUpdate = {
            categoryName: cname,
            img: req.body.img,
        };
        // if (req.file) {
        // fs.unlink(
        // path.join(__dirname,"../public/images/",val),
        // () => {}
        // );
        // cateToUpdate.img = req.file.filename;
        // }
        await categoryModel.findOneAndUpdate({ _id: id }, { $set: cateToUpdate });
        res.redirect("/admin/category");
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------- category edit ---------------
const editcategory = async (req, res, next) => {
    try {
        const id = req.params.id;
        let category = await categoryModel.findOne({ _id: id }).populate("categoryName");
        let products = await productModel.find();
        res.render("admin/edit-category", {
            category,
            // page: "Products",
            // admin: res.locals.admindata.name,

            field: "field",
            products,
            category,
            userstatus: "false",
        });
    } catch (error) {
        next(error);
    }
};

const updatecategory = async (req, res) => {
    try {
        const categoryData = await User.findByIdAndUpdate({ _id: req.body.id }, { $set: { name: req.body.name, email: req.body.email, contact: req.body.contact } });
        res.redirect("/admin/category");
    } catch (error) {
        console.log(error.message);
    }
};

// ----------------------- banner ------------------------
const banner = async (req, res, next) => {
    try {
        const banner = await bannerModel.find();
        res.render("admin/banner", {
            // page: "banner",

            banner,
        });
    } catch (error) {
        console.log(error.message);
        next(error);
    }
};

// --------------------- add  banner page ----------------------------
const addbanner = (req, res, next) => {
    try {
        res.render("admin/addBanner", {
            //  page: "banner",
            //  admin: res.locals.admindata.name,
            ustatus: "no",
        });
    } catch (error) {
        next(error);
    }
};
//  ---------------------- add banner ------------------
const AddBanner = (req, res, next) => {
    try {
        if (req.body.banner && req.file.filename) {
            let banner = bannerModel({
                bannerName: req.body.banner,
                description: req.body.description,
                image: req.file.filename,
            });
            banner.save().then(() => {
                res.render("admin/addBanner", {
                    // page: "banner",
                    // admin: res.locals.admindata.name,
                    ustatus: "true",
                });
            });
        } else {
            res.render("admin//banner", {
                page: "banner",
                admin: res.locals.admindata.name,
                ustatus: "false",
            });
        }
    } catch (error) {
        next(error);
    }
};
//  -------------------  Disable banner ----------------- //

disablebanner = async (req, res, next) => {
    try {
        const id = req.params.id;
        await bannerModel.updateOne({ _id: id }, { $set: { status: "false" } }).then(() => {
            res.redirect("/admin/banner");
        });
    } catch (error) {
        next(error);
    }
};

//----------------------  Enable Banner -----------------------------------//

enablebanner = async (req, res, next) => {
    try {
        const id = req.params.id;
        await bannerModel.updateOne({ _id: id }, { $set: { status: true } }).then(() => {
            res.redirect("/admin/banner");
        });
    } catch (error) {
        next(error);
    }
};
const deletebanner = async (req, res) => {
    try {
        const id = req.params.id;
        const img = req.params.val;
        await bannerModel.findOne({ _id: id });
        fs.unlink(path.join(__dirname, "../public/productimages/", img), () => {});
        bannerModel.deleteOne({ _id: id }).then(() => {
            res.redirect("/admin/banner");
        });
    } catch (error) {
        next(error);
    }
};

// -----------------------------------------------------------------
const ordermanagement = async (req, res, next) => {
    try {
        orderModel
            .find({ order_status: { $ne: "pending" } })
            .populate("userid")
            .sort({ ordered_date: -1 })
            .then((orders) => {
                res.render("admin/orders", {
                    // page: "order",
                    // admin: res.locals.admindata.name,
                    ustatus: "false",
                    orders,
                });
            });
    } catch (error) {
        next(error);
    }
};
  const orderlist= (req, res, next) => {
    try {
      orderModel
        .findOne({ _id: req.params.id })
        .populate(["products.product_id", "userid"])
        .then((singleorder) => {
          res.render("admin/orderdetails", {
            page: "order",
            //  admin: res.locals.admindata.name,
            ustatus: "false",
            singleorder,
          });
        });
    } catch (error) {
      next(error);
    }
  };
// ---------------- Delivary Status Update -------------------- //
const delivarystatus = (req, res, next) => {
    try {
        if (req.body.Status == "shipped") {
            orderModel
                .updateOne(
                    { _id: req.body.id },
                    {
                        $set: {
                            "delivery_status.shipped.state": true,
                            "delivery_status.shipped.date": Date.now(),
                        },
                    }
                )
                .then((data) => {
                    res.redirect("/orderlist/" + req.body.id);
                });
        } else if (req.body.Status == "out_for_delivery") {
            orderModel
                .updateOne(
                    { _id: req.body.id },
                    {
                        $set: {
                            "delivery_status.out_for_delivery.state": true,
                            "delivery_status.out_for_delivery.date": Date.now(),
                        },
                    }
                )
                .then((data) => {
                    res.redirect("/orderlist/" + req.body.id);
                });
        } else if (req.body.Status == "delivered") {
            orderModel
                .updateOne(
                    { _id: req.body.id },
                    {
                        $set: {
                            "delivery_status.delivered.state": true,
                            "delivery_status.delivered.date": Date.now(),
                        },
                    }
                )
                .then((data) => {
                    res.redirect("/orderlist/" + req.body.id);
                });
        } else {
            res.redirect("/orderlist/" + req.body.id);
        }
    } catch (error) {
        next(error);
    }
};
//------------------  Payment Pending ----------------//
const paymentpending = (req, res, next) => {
    try {
        orderModel.updateOne({ _id: req.body.id }, { $set: { "payment.payment_status": "completed" } }).then(() => {
            res.json("completed");
        });
    } catch (error) {
        next(error);
    }
};


//------------------ Invoice ----------------------//

// const invoice = (req, res, next) => {
//     try {
//         orderModel
//             .findOne({ _id: req.params.id })
//             .populate(["products.product_id", "userid"])
//             .then((invoice) => {
//                 res.render("admin/orderinvoice", {
//                     page: "order",
//                     admin: res.locals.admindata.name,
//                     ustatus: "false",
//                     invoice,
//                 });
//             });
//     } catch (error) {
//         next(error);
//     }
// };

//---------------------   invoice --------------------------//
const invoice = async (req, res, next) => {
 try {
      console.log(req.params.id,'order_id');
    const invoice = await orderModel
    .findById(req.params.id)
    .populate("products.product_id")
    console.log("invoice--",invoice);
        res.render("admin/orderinvoice", {
          page: "order",
           // admin: res.locals.admindata.name,
           ustatus: "false",
           invoice
         })
   } catch (error) {
   next(error);
 }
}

// ----------------  Coupon Page  --------------------------//
const coupon = async (req, res, next) => {
    try {
        const id = req.body.id;
        const coupon = await couponModel.find();
        const singlecoupon = await couponModel.find({ _id: id });
        res.render("admin/coupons", {
            // page: "coupon",
            // admin: res.locals.admindata.name,
            coupon,
            singlecoupon,
        });
    } catch (error) {
        next(error);
    }
};

//------------------ Add coupon -----------------------//
const addcoupon = async (req, res, next) => {
    try {
        // const cpname = req.body.couponName.toLowerCase();
        const cpcheck = await couponModel.findOne({ couponName: req.body.couponName });

        if (!cpcheck) {
            let coupon = couponModel({
                couponName: req.body.couponName,
                couponCode: req.body.couponCode,
                percentage: req.body.percentage,
                expiryDate: req.body.expDate,
                minimumAmount: req.body.minimumAmount,
            });

            coupon.save().then(() => {
                res.redirect("/admin/coupons");
            });
        } else {
            res.redirect("/admin/coupons");
        }
    } catch (error) {
        next(error);
    }
};
//----------------------------  Update Coupon -------------------//

updatecoupon = async (req, res) => {
    try {
        const id = req.params.id;
        const cname = req.body.couponName.toLowerCase();
        let coupToUpdate = {
            couponName: cname,
            couponCode: req.body.couponCode,
            percentage: req.body.percentage,
            expiryDate: req.body.expDate,
            minimumAmount: req.body.minimumAmount,
        };
        await couponModel.updateOne({ _id: id }, { $set: coupToUpdate });
        res.redirect("/admin/coupon");
    } catch (error) {
        next(error);
    }
};

// ----------------------   ajax Coupon Edit ------------------------------- //

ajaxcoupon = async (req, res, next) => {
    try {
        let coupondet = await couponModel.findOne({ _id: req.body.id });
        res.json(coupondet);
    } catch (error) {
        next(error);
    }
};

//---------------------------  Delete coupon --------------------//

const deleteCoupon = async (req, res) => {
    try {
        const id = req.params.id;
        couponModel.deleteOne({ _id: id }).then(() => {
            res.redirect("/admin/coupons");
        });
    } catch (error) {
        next(error); 
    }
};

const updateProduct = async (req, res, next) => {
    try {
        const id = req.params.id;
        const filenames = req.files.map((file) => file.filename);
        let dataToUpdate = {
            name: req.body.name,
            description: req.body.description,
            shortDescription: req.body.shortdescription,
            price: req.body.price,
            brand: req.body.brand,
            stock: req.body.stock,
            // status: req.body.status,
        };
        if (req.files.length > 0) {
            console.log("IF CONDITION");
            await productModel.updateOne({ _id: id }, { $push: { image: { $each: filenames } } });
        }
        let category = await categoryModel.find();
        let products = await productModel.findOneAndUpdate({ _id: id }, { $set: dataToUpdate });
        res.render("admin/edit-product", {
            // page: "Products",
            // admin: res.locals.admindata.name,

            field: "field",
            category,
            products,
            userstatus: "true",
        });
    } catch (error) {
        next(error);
    }
};
// --------------------  edit Products Page -----------------------//

const editproducts = async (req, res, next) => {
    try {
        const id = req.params.id;
        let products = await productModel.findOne({ _id: id }).populate("brand");
        let category = await categoryModel.find();
        res.render("admin/edit-product", {
            products,
            // page: "Products",
            // admin: res.locals.admindata.name,

            field: "field",
            products,
            category,
            userstatus: "false",
        });
    } catch (error) {
        next(error);
    }
};
const deleteimage = async (req, res, next) => {
    try {
        const val = req.params.val;
        const id = req.params.id;
        fs.unlink(path.join(__dirname, "../public/images/", val), () => {});
        await productModel.updateOne({ _id: id }, { $pull: { image: val } });
        res.redirect("/admin/edit-product/" + id);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    adminDashboard,
    newUserLoad,
    addUser,
    editUserLoad,
    updateUsers,
    deleteUser,
    // dashboard,
    home,
    customers,
    addProduct,
    block,
    unblock,
    addcategorydetails,
    addcategory,
    category,
    deletecategories,
    Updatecategories,
    addProduct,
    deleteproduct,
    products,
    addProducts,
    banner,
    addbanner,
    AddBanner,
    ordermanagement,
    orderlist,
    invoice,
    deleteCoupon,
    addcoupon,
    coupon,
    editproducts,
    updateProduct,
    editcategory,
    deletebanner,
    enablebanner,
    disablebanner,
    ajaxcoupon,
    updatecoupon,
    deleteimage,
    //  confirmdeleteproduct
    // loadEditCategory
};
