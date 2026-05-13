const User = require("../models/UserInformation");
const { analyzeHealthReport } = require("./Analysis-Data.js");
const { uploadOnCloudinary } = require("../utils/cloudinary");

const EnterPersonaldetails = async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      heightCm,
      weightKg,
      purposes = [],
      allergies = ["None"],
      diseases = ["None"],
      otherDisease,
      healthGoal,
      dietPreference,
      id
    } = req.body;
    const imageLocalPath = req.file?.path;
    console.log("Request file: ", req.file);
    console.log("Request.body: ", req.body);

    // Check each required field
    const missingFields = [];
    if (!fullName) missingFields.push("Full Name");
    if (!dateOfBirth) missingFields.push("Date of Birth");
    if (!gender) missingFields.push("Gender");
    if (!heightCm) missingFields.push("Height");
    if (!weightKg) missingFields.push("Weight");
    if (!healthGoal) missingFields.push("Health Goal");
    if (!dietPreference) missingFields.push("Diet Preference");

    let imageData = null;

    if (missingFields.length > 0) {
      return res.status(200).json({
        success: false,
        message: "Missing required fields",
        missingFields: missingFields
      });
    }

    const authId = id;
    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing auth ID",
      });
    }

    const PersonalData = {
      fullName,
      dateOfBirth,
      gender,
      heightCm,
      weightKg,
      purposes,
      allergies,
      diseases,
      otherDisease,
      healthGoal,
      dietPreference,
      authId,
    };
    if (imageData) PersonalData.image = imageData;

    // OCR health report from uploaded image (non-blocking — don't crash profile creation if OCR fails)
    if (imageLocalPath) {
      try {
        console.log('[EnterPersonaldetails] Running health report OCR...');
        const healthReport = await analyzeHealthReport(imageLocalPath);
        if (healthReport && healthReport.rawSummary && healthReport.rawSummary !== 'Not a medical report') {
          PersonalData.healthReport = healthReport;
          // Keep legacy field for backward compat
          PersonalData.documents = healthReport.rawSummary || '';
          console.log('[EnterPersonaldetails] Health report extracted:', healthReport.rawSummary?.substring(0, 100));
          if (healthReport.riskFactors?.length) {
            console.log('[EnterPersonaldetails] Risk factors:', healthReport.riskFactors.join(', '));
          }
        } else {
          console.log('[EnterPersonaldetails] Image was not a medical report, skipping OCR data');
        }
      } catch (ocrError) {
        console.warn('[EnterPersonaldetails] Health report OCR failed (non-critical):', ocrError.message);
        // Continue without health report — profile creation should still succeed
      }
      
      // Upload to Cloudinary AFTER OCR (because uploadOnCloudinary deletes the local file)
      const cloudResponse = await uploadOnCloudinary(imageLocalPath);
      if (cloudResponse) {
        imageData = {
          url: cloudResponse.secure_url,
          publicId: cloudResponse.public_id
        };
        PersonalData.image = imageData;
      }
    }

    const newUser = await User.create(PersonalData);

    return res.status(201).json({
      success: true,
      user: newUser,
      message: "Personal details saved successfully",
    });
  } catch (error) {
    console.error("Error saving personal details:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing auth ID",
      });
    }

    const {
      fullName, dateOfBirth, gender, heightCm, weightKg,
      purposes, allergies, diseases, otherDisease,
      healthGoal, dietPreference, additionalInfo,
    } = req.body;

    const updatedData = {
      ...(fullName && { fullName }),
      ...(dateOfBirth && { dateOfBirth }),
      ...(gender && { gender }),
      ...(heightCm && { heightCm }),
      ...(weightKg && { weightKg }),
      ...(purposes && { purposes }),
      ...(allergies && { allergies }),
      ...(diseases && { diseases }),
      ...(otherDisease && { otherDisease }),
      ...(healthGoal && { healthGoal }),
      ...(dietPreference && { dietPreference }),
      ...(additionalInfo && { additionalInfo }),
    };

    const updatedUser = await User.findOneAndUpdate(
      { authId: userId },
      updatedData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile Update Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Upload / re-upload health report (separate from profile update)
const uploadHealthReport = async (req, res) => {
  try {
    const userId = req.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a health report image" });
    }

    const imagePath = req.file.path;
    console.log('[uploadHealthReport] Processing report for user:', userId);

    // Run OCR
    const healthReport = await analyzeHealthReport(imagePath);

    if (!healthReport || healthReport.rawSummary === 'Not a medical report') {
      return res.status(400).json({
        success: false,
        message: "Could not extract health data. Please upload a clear medical/lab report image.",
      });
    }

    // Upload image to Cloudinary AFTER OCR
    const cloudResponse = await uploadOnCloudinary(imagePath);
    const imageUrl = cloudResponse ? cloudResponse.secure_url : "";
    const publicId = cloudResponse ? cloudResponse.public_id : "";

    // Update user's health report
    const updatedUser = await User.findOneAndUpdate(
      { authId: userId },
      {
        healthReport,
        documents: healthReport.rawSummary || '',
        ...(cloudResponse && { image: { url: imageUrl, publicId: publicId } })
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log('[uploadHealthReport] ✅ Report saved. Risk factors:', healthReport.riskFactors);

    return res.status(200).json({
      success: true,
      user: updatedUser,
      healthReport,
      message: "Health report analysed and saved successfully",
    });
  } catch (error) {
    console.error("Upload Health Report Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const FetchDetails = async (req, res) => {
  try {
    const userId = req.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing auth ID" });
    }

    const userProfile = await User.findOne({ authId: userId });
    if (!userProfile) {
      return res.status(404).json({ success: false, message: "User profile not found" });
    }

    return res.status(200).json({
      success: true,
      user: userProfile,
      message: "Profile fetched successfully",
    });
  } catch (error) {
    console.error("Fetch Profile Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  EnterPersonaldetails,
  updateProfile,
  uploadHealthReport,
  FetchDetails,
};
