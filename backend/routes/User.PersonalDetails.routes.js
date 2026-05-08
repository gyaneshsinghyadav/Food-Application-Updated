const express = require("express");
const  { EnterPersonaldetails , updateProfile , FetchDetails} = require("../controllers/PersonalDetails.controller");
const upload = require("../middlewares/multer.js");
const { isAuthenticated } = require("../middlewares/isAuthenticated.js");

const router = express.Router();

router.post("/Enter-Personal-Details", upload.single("image"), EnterPersonaldetails);
router.route("/Update-Personal-Details").put(isAuthenticated, updateProfile);
router.route("/me").get(isAuthenticated, FetchDetails);

module.exports = router;
