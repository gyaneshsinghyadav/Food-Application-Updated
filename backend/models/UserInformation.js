const mongoose = require("mongoose");
const { Schema } = mongoose;

const HealthReportSchema = new Schema({
  rawSummary: { type: String, default: '' },
  extractedAt: { type: Date, default: Date.now },
  bloodSugar: {
    fasting: { type: Number, default: 0 },
    pp: { type: Number, default: 0 },
    hba1c: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  cholesterol: {
    total: { type: Number, default: 0 },
    hdl: { type: Number, default: 0 },
    ldl: { type: Number, default: 0 },
    triglycerides: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  bloodPressure: {
    systolic: { type: Number, default: 0 },
    diastolic: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  hemoglobin: {
    value: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  thyroid: {
    tsh: { type: Number, default: 0 },
    t3: { type: Number, default: 0 },
    t4: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  kidneyFunction: {
    creatinine: { type: Number, default: 0 },
    uricAcid: { type: Number, default: 0 },
    bun: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  liverFunction: {
    sgot: { type: Number, default: 0 },
    sgpt: { type: Number, default: 0 },
    status: { type: String, default: 'unknown' },
  },
  vitamins: {
    d: { type: Number, default: 0 },
    b12: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
  },
  riskFactors: { type: [String], default: [] },
  dietaryRestrictions: { type: [String], default: [] },
}, { _id: false });

const InformationSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          const now = new Date();
          const oldestDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
          return value <= now && value >= oldestDate;
        },
        message: "Date of birth must be in the past and within 120 years."
      }
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    heightCm: {
      type: Number,
      required: true,
      min: 30, // cm
      max: 300,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 1, // kg
      max: 500,
    },
    purposes: {
      type: [String],
      enum: [
        "Fitness Tracking",
        "Health Monitoring",
        "Diet/Nutrition Planning",
        "Weight Management",
        "Medical Condition Management",
        "Physical Activity Management",
        "Research Purpose"
      ],
      default: [],
    },
    
    allergies: {
      type: [String],
      enum: ["Nuts", "Dairy", "Gluten", "Seafood", "Pollen", "Latex", "None"],
      default: ["None"],
    },
    diseases: {
      type: [String],
      enum: [
        "Diabetes",
        "Hypertension",
        "Heart Disease",
        "Asthma",
        "Thyroid Disorder",
        "None",
        "Other"
      ],
      default: ["None"],
    },
    otherDisease: {
      type: String,
      trim: true,
    },
    healthGoal: {
      type: String,
      enum: [
        "Gain Weight",
        "Maintain Weight",
        "Weight Loss",
        "Improve Muscle Tone",
        "Increase Stamina",
        "Improve Overall Health"
      ],
      required: true,
    },
    dietPreference: {
      type: String,
      enum: ["Vegetarian", "Vegan", "Pescatarian", "Omnivore", "Keto", "Paleo", "None"],
      required: true,
    },
    image: { url: String, publicId: String },
    // Legacy field — kept for backward compatibility
    documents: {
      type: String,
      uploadedAt: { type: Date, default: Date.now }
    },
    // New structured health report
    healthReport: {
      type: HealthReportSchema,
      default: null,
    },
    authId: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Information", InformationSchema);
