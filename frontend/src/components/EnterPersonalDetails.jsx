import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {useHealthProfileStore} from "../store/useUserInformationStore"
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  CheckCircle,
  Heart,
  Activity,
  Utensils,
  UserCircle,
  Calendar,
  Ruler,
  Weight,
  Image as ImageIcon,
} from "lucide-react";

const EnterPersonalDetails = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef();
  const {enterProfileDetails,updateProfileDetails,FetchProfile}=useHealthProfileStore();
  const [imagePreview, setImagePreview] = useState("");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "Male",
      heightCm: "",
      weightKg: "",
      purposes: [],
      allergies: [],
      diseases: [],
      otherDisease: "",
      healthGoal: "Improve Overall Health",
      dietPreference: "None",
    },
  });

  const purposes = watch("purposes");
  const diseases = watch("diseases");
  const otherDisease = watch("otherDisease");
  const heightCm = watch("heightCm");
  const weightKg = watch("weightKg");

  // Fetch existing profile if in edit mode
  useEffect(() => {
    if (isEdit) {
      const fetchProfile = async () => {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/profile/me`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          const profile = response.data;
          setExistingProfile(profile);

          // Set form values
          Object.keys(profile).forEach((key) => {
            if (key === "dateOfBirth" && profile[key]) {
              setValue(key, profile[key].slice(0, 10));
            } else if (
              ["purposes", "allergies", "diseases"].includes(key) &&
              profile[key]
            ) {
              setValue(key, profile[key]);
            } else if (key !== "images" && key !== "_id") {
              setValue(key, profile[key]);
            }
          });

          if (profile.images?.url) {
            setImagePreview(profile.images.url);
          }
        } catch (error) {
          toast.error("Failed to fetch profile");
          console.error("Fetch profile error:", error);
        }
      };

      fetchProfile();
    }
  }, [isEdit, setValue]);

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      toast.error("Please upload an image file (JPEG, PNG)");
      return;
    }

    // Revoke previous URL if exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Checkbox handlers
  const handleCheckboxChange = (group, value) => {
    const currentValues = watch(group);
    const newValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    setValue(group, newValues);
  };

  // Calculate BMI
  const calculateBMI = () => {
    if (heightCm && weightKg) {
      const heightM = heightCm / 100;
      const bmi = (weightKg / (heightM * heightM)).toFixed(1);

      let category = "";
      if (bmi < 18.5) category = "Underweight";
      else if (bmi < 25) category = "Normal weight";
      else if (bmi < 30) category = "Overweight";
      else category = "Obese";

      return { bmi, category };
    }
    return null;
  };

  const bmiData = calculateBMI();

  // Form submission
  const onSubmit = async (data) => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Append all regular fields
      Object.keys(data).forEach((key) => {
        if (key !== "image" && key !== "purposes" && key !== "allergies" && key !== "diseases") {
          formData.append(key, data[key]);
        }
      });

      // Append array fields
      data.purposes.forEach((purpose) => formData.append("purposes", purpose));
      data.allergies.forEach((allergy) => formData.append("allergies", allergy));
      data.diseases.forEach((disease) => formData.append("diseases", disease));

      // Append image if it exists
      const imageFile = fileInputRef.current?.files?.[0];
      if (imageFile) {
        formData.append("image", imageFile);
      }
      formData.append("id",id);
      // For debugging - log FormData contents
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      if (isEdit) {
        const response = await axios.put(
          `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/profile/Update-Personal-Details`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        updateProfileDetails(response.data)
        toast.success("Profile updated successfully");
      } else {
        const response = await axios.post(
          `${import.meta.env.VITE_URL || 'http://localhost:3000'}/api/v1/profile/Enter-Personal-Details`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        enterProfileDetails(response.data)
        toast.success("Profile created successfully");
      }

      navigate("/login");
    } catch (error) {
      console.error("Error submitting profile:", error);
      const errorMessage =
        error.response?.data?.message || "Something went wrong";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step validation
  const validateStep = async (stepNumber) => {
    let isValid = true;

    if (stepNumber === 1) {
      isValid = await trigger(["fullName", "dateOfBirth", "gender", "heightCm", "weightKg"]);
      if (heightCm && (heightCm < 30 || heightCm > 300)) {
        toast.error("Height must be between 30cm and 300cm");
        isValid = false;
      }
      if (weightKg && (weightKg < 1 || weightKg > 500)) {
        toast.error("Weight must be between 1kg and 500kg");
        isValid = false;
      }
    } else if (stepNumber === 2) {
      isValid = await trigger(["purposes", "diseases"]);
      if (purposes.length === 0) {
        toast.error("Please select at least one purpose");
        isValid = false;
      }
      if (diseases.length === 0) {
        toast.error("Please select at least one medical condition");
        isValid = false;
      }
      if (diseases.includes("Other") && !otherDisease.trim()) {
        toast.error("Please specify your medical condition");
        isValid = false;
      }
    } else if (stepNumber === 3) {
      isValid = await trigger(["healthGoal", "dietPreference"]);
    }

    return isValid;
  };

  // Navigation between steps
  const nextStep = async () => {
    if (await validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  // Options for form fields
  const purposeOptions = [
    "Fitness Tracking",
    "Health Monitoring",
    "Diet/Nutrition Planning",
    "Weight Management",
    "Medical Condition Management",
    "Physical Activity Management",
    "Research Purpose",
  ];

  const allergyOptions = ["Nuts", "Dairy", "Gluten", "Seafood", "Pollen", "Latex", "None"];
  const diseaseOptions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Asthma",
    "Thyroid Disorder",
    "None",
    "Other",
  ];

  const healthGoalOptions = [
    "Gain Weight",
    "Maintain Weight",
    "Weight Loss",
    "Improve Muscle Tone",
    "Increase Stamina",
    "Improve Overall Health",
  ];

  const dietPreferenceOptions = [
    "Vegetarian",
    "Vegan",
    "Pescatarian",
    "Omnivore",
    "Keto",
    "Paleo",
    "None",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
            <h2 className="text-2xl font-bold flex items-center">
              {isEdit ? (
                <>
                  <UserCircle className="mr-2" size={24} />
                  Update Your Health Profile
                </>
              ) : (
                <>
                  <Heart className="mr-2" size={24} />
                  Create Your Health Profile
                </>
              )}
            </h2>
            <p className="text-blue-100">
              {isEdit
                ? "Modify your health information to keep your profile updated"
                : "Tell us about yourself so we can personalize your experience"}
            </p>
          </div>

          <div className="px-6 pt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${step * 33.33}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Basic Info</span>
              <span>Health Details</span>
              <span>Preferences</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-medium text-gray-800 flex items-center">
                  <UserCircle className="mr-2" size={20} />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.fullName ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Full Name
                      <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Full Name"
                        className={`pl-10 pr-4 py-2 border ${
                          errors.fullName
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300"
                        } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                        {...register("fullName", { required: true })}
                      />
                      <UserCircle
                        className={`absolute left-3 top-2.5 ${
                          errors.fullName ? "text-red-400" : "text-gray-400"
                        }`}
                        size={18}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.dateOfBirth ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Date of Birth
                      <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        className={`pl-10 pr-4 py-2 border ${
                          errors.dateOfBirth
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300"
                        } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                        {...register("dateOfBirth", { required: true })}
                      />
                      <Calendar
                        className={`absolute left-3 top-2.5 ${
                          errors.dateOfBirth ? "text-red-400" : "text-gray-400"
                        }`}
                        size={18}
                      />
                    </div>
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.gender ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Gender
                      <span className="text-red-600">*</span>
                    </label>
                    <select
                      className={`pl-4 pr-10 py-2 border ${
                        errors.gender
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                      {...register("gender", { required: true })}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    {errors.gender && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.heightCm ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Height (cm)
                      <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Height in cm"
                        min="30"
                        max="300"
                        className={`pl-10 pr-4 py-2 border ${
                          errors.heightCm
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300"
                        } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                        {...register("heightCm", {
                          required: true,
                          min: 30,
                          max: 300,
                        })}
                      />
                      <Ruler
                        className={`absolute left-3 top-2.5 ${
                          errors.heightCm ? "text-red-400" : "text-gray-400"
                        }`}
                        size={18}
                      />
                    </div>
                    {errors.heightCm?.type === "required" && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                    {(errors.heightCm?.type === "min" ||
                      errors.heightCm?.type === "max") && (
                      <p className="text-red-500 text-xs mt-1">
                        Height must be between 30cm and 300cm
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.weightKg ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Weight (kg)
                      <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Weight in kg"
                        min="1"
                        max="500"
                        className={`pl-10 pr-4 py-2 border ${
                          errors.weightKg
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300"
                        } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                        {...register("weightKg", {
                          required: true,
                          min: 1,
                          max: 500,
                        })}
                      />
                      <Weight
                        className={`absolute left-3 top-2.5 ${
                          errors.weightKg ? "text-red-400" : "text-gray-400"
                        }`}
                        size={18}
                      />
                    </div>
                    {errors.weightKg?.type === "required" && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                    {(errors.weightKg?.type === "min" ||
                      errors.weightKg?.type === "max") && (
                      <p className="text-red-500 text-xs mt-1">
                        Weight must be between 1kg and 500kg
                      </p>
                    )}
                  </div>
                </div>

                {bmiData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-blue-800 mb-1">
                      Your BMI: {bmiData.bmi}
                    </h4>
                    <p className="text-sm text-blue-600">
                      Category: {bmiData.category}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-medium text-gray-800 flex items-center">
                  <Activity className="mr-2" size={20} />
                  Health Details
                </h3>

                <div>
                  <label
                    className={`block text-sm font-medium ${
                      errors.purposes ? "text-red-600" : "text-gray-700"
                    } mb-2`}
                  >
                    Purpose of Using Health Profile
                    <span className="text-red-600">*</span>
                  </label>
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${
                      errors.purposes
                        ? "border border-red-500 rounded-md p-2 bg-red-50"
                        : ""
                    }`}
                  >
                    {purposeOptions.map((p) => (
                      <label
                        key={p}
                        className="flex items-center space-x-2 py-1.5 px-3 border border-gray-200 rounded-md hover:bg-blue-50 transition cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={purposes.includes(p)}
                          onChange={() => handleCheckboxChange("purposes", p)}
                          className="text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">{p}</span>
                      </label>
                    ))}
                  </div>
                  {errors.purposes && (
                    <p className="text-red-500 text-xs mt-1">
                      Please select at least one purpose
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergies
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allergyOptions.map((a) => (
                      <label
                        key={a}
                        className="flex items-center space-x-2 py-1.5 px-3 border border-gray-200 rounded-md hover:bg-blue-50 transition cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={watch("allergies").includes(a)}
                          onChange={() => handleCheckboxChange("allergies", a)}
                          className="text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium ${
                      errors.diseases ? "text-red-600" : "text-gray-700"
                    } mb-2`}
                  >
                    Existing Medical Conditions
                    <span className="text-red-600">*</span>
                  </label>
                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${
                      errors.diseases
                        ? "border border-red-500 rounded-md p-2 bg-red-50"
                        : ""
                    }`}
                  >
                    {diseaseOptions.map((d) => (
                      <label
                        key={d}
                        className="flex items-center space-x-2 py-1.5 px-3 border border-gray-200 rounded-md hover:bg-blue-50 transition cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={diseases.includes(d)}
                          onChange={() => handleCheckboxChange("diseases", d)}
                          className="text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">{d}</span>
                      </label>
                    ))}
                  </div>
                  {errors.diseases && (
                    <p className="text-red-500 text-xs mt-1">
                      Please select at least one option
                    </p>
                  )}
                </div>

                {diseases.includes("Other") && (
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.otherDisease ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Please specify other medical condition
                      <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      className={`px-4 py-2 border ${
                        errors.otherDisease
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                      {...register("otherDisease", {
                        required: diseases.includes("Other"),
                      })}
                    />
                    {errors.otherDisease && (
                      <p className="text-red-500 text-xs mt-1">
                        Please specify your medical condition
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-medium text-gray-800 flex items-center">
                  <Utensils className="mr-2" size={20} />
                  Preferences & Goals
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.healthGoal ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Health Goal
                      <span className="text-red-600">*</span>
                    </label>
                    <select
                      className={`px-4 py-2 border ${
                        errors.healthGoal
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                      {...register("healthGoal", { required: true })}
                    >
                      {healthGoalOptions.map((goal) => (
                        <option key={goal}>{goal}</option>
                      ))}
                    </select>
                    {errors.healthGoal && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        errors.dietPreference ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      Diet Preference
                      <span className="text-red-600">*</span>
                    </label>
                    <select
                      className={`px-4 py-2 border ${
                        errors.dietPreference
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      } rounded-lg w-full text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                      {...register("dietPreference", { required: true })}
                    >
                      {dietPreferenceOptions.map((diet) => (
                        <option key={diet}>{diet}</option>
                      ))}
                    </select>
                    {errors.dietPreference && (
                      <p className="text-red-500 text-xs mt-1">
                        This field is required
                      </p>
                    )}
                  </div>

                  {/* ── Health Report Upload ── */}
                  <div className="space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">📋</span>
                      <div>
                        <label className="block text-sm font-semibold text-blue-800">
                          Upload Your Health Report
                        </label>
                        <p className="text-xs text-blue-600">
                          Blood test or lab report — we'll extract values to personalize your food recommendations
                        </p>
                      </div>
                    </div>

                    <label className="relative cursor-pointer block">
                      <span className="sr-only">Upload Health Report</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className={`w-full h-28 rounded-lg border-2 border-dashed ${imagePreview ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-white'} flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200`}>
                        {imagePreview ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={imagePreview}
                              alt="Report preview"
                              className="h-20 w-20 rounded-lg object-cover border-2 border-white shadow"
                            />
                            <div className="text-left">
                              <p className="text-sm font-medium text-green-700">✅ Report uploaded!</p>
                              <p className="text-xs text-green-600">We'll analyze it when you submit</p>
                              <p className="text-xs text-blue-500 mt-1 underline">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="text-blue-400 mx-auto mb-1" size={28} />
                            <p className="text-sm font-medium text-blue-600">Tap to upload report image</p>
                            <p className="text-xs text-gray-400">JPEG, PNG — blood test, CBC, lipid profile, etc.</p>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* What gets extracted */}
                    <div className="flex flex-wrap gap-1.5">
                      {['Blood Sugar', 'Cholesterol', 'BP', 'Hemoglobin', 'Thyroid', 'Liver', 'Kidney', 'Vitamins'].map((item) => (
                        <span key={item} className="text-xs bg-white text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          ✓ {item}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 italic">
                      Optional — you can skip and upload later from your Profile page
                    </p>
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  <div className="flex justify-between space-x-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2" size={18} />
                          {isEdit ? "Update Profile" : "Complete Setup"}
                        </>
                      )}
                    </button>
                  </div>

                  {!isEdit && (
                    <p className="text-xs text-center text-gray-500">
                      By submitting this form, you agree to our Terms of Service
                      and Privacy Policy.
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default EnterPersonalDetails;