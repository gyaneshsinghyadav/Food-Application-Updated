import React, { useEffect } from 'react';
import { useHealthProfileStore } from "../store/useUserInformationStore";
import { useUserStore } from "../store/useUserStore";
import { useNavigate } from "react-router-dom";

const Profile = () => {
    const { profile, fetchProfile, loading } = useHealthProfileStore();
    const { user } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    if (loading) return (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-xl p-4">
            <div className="animate-pulse text-gray-500 flex flex-col items-center">
                <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    if (!profile) return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full border border-gray-100">
                <div className="bg-blue-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                    <span className="text-3xl">👤</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h2>
                <p className="text-gray-600 mb-8">It looks like you haven't completed your personal details setup yet.</p>
                <button 
                    onClick={() => navigate(`/personal-details/${user?._id}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-colors"
                >
                    Complete Profile Setup
                </button>
            </div>
        </div>
    );

    // Function to handle image download
    const handleDownload = () => {
        // Get the image URL
        const imageUrl = profile.image?.url || "/api/placeholder/150/150";
        
        // Create a link element
        const downloadLink = document.createElement('a');
        downloadLink.href = imageUrl;
        downloadLink.download = `${profile.fullName || 'profile'}-image.jpg`;
        
        // Append to the document, click it, and remove it
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50">
            {/* Profile Header - Name only */}
            <div className="flex flex-col items-center mb-10 bg-gradient-to-b from-blue-50 to-white rounded-2xl p-8 shadow-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{profile.fullName}</h1>
                <p className="text-blue-600 font-medium bg-blue-50 px-4 py-1 rounded-full shadow-sm">{profile.healthGoal}</p>
            </div>

            {/* Basic Information Grid - Enhanced with better visual styling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                        <span className="bg-blue-100 p-2 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </span>
                        Personal Details
                    </h2>
                    <div className="space-y-4">
                        <DetailItem label="Gender" value={profile.gender} icon="👤" />
                        <DetailItem label="Date of Birth" value={new Date(profile.dateOfBirth).toLocaleDateString()} icon="📅" />
                        <DetailItem label="Height" value={`${profile.heightCm} cm`} icon="📏" />
                        <DetailItem label="Weight" value={`${profile.weightKg} kg`} icon="⚖️" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                        <span className="bg-green-100 p-2 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </span>
                        Health Information
                    </h2>
                    <div className="space-y-4">
                        <DetailItem label="Diet Preference" value={profile.dietPreference || 'Not specified'} icon="🍎" />
                        <div>
                            <p className="text-gray-600 mb-2 flex items-center gap-2">
                                <span className="bg-red-100 p-1 rounded-md">
                                    <span className="text-lg">💊</span>
                                </span>
                                <span>Diseases</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile.diseases.length === 0 || (profile.diseases.length === 1 && profile.diseases[0] === 'None') ? (
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">None reported</span>
                                ) : (
                                    profile.diseases.map((disease, index) => (
                                        disease !== 'None' && (
                                            <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                                                {disease}
                                            </span>
                                        )
                                    ))
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-600 mb-2 flex items-center gap-2">
                                <span className="bg-yellow-100 p-1 rounded-md">
                                    <span className="text-lg">⚠️</span>
                                </span>
                                <span>Allergies</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile.allergies.length === 0 || (profile.allergies.length === 1 && profile.allergies[0] === 'None') ? (
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">None reported</span>
                                ) : (
                                    profile.allergies.map((allergy, index) => (
                                        allergy !== 'None' && (
                                            <span key={index} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                                                {allergy}
                                            </span>
                                        )
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* UPDATED SECTION: Structured Health Report */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8 transition-all duration-300 hover:shadow-lg border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                    <span className="bg-red-100 p-2 rounded-lg mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                    </span>
                    Health Report
                </h2>

                {profile.healthReport ? (
                    <div className="space-y-4">
                        {/* Summary */}
                        {profile.healthReport.rawSummary && (
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{profile.healthReport.rawSummary}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Extracted: {profile.healthReport.extractedAt ? new Date(profile.healthReport.extractedAt).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        )}

                        {/* Lab Values Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <LabCard label="Fasting Blood Sugar" value={profile.healthReport.bloodSugar?.fasting} unit="mg/dL" status={profile.healthReport.bloodSugar?.status} />
                            <LabCard label="HbA1c" value={profile.healthReport.bloodSugar?.hba1c} unit="%" status={profile.healthReport.bloodSugar?.status} />
                            <LabCard label="Total Cholesterol" value={profile.healthReport.cholesterol?.total} unit="mg/dL" status={profile.healthReport.cholesterol?.status} />
                            <LabCard label="HDL / LDL" value={profile.healthReport.cholesterol?.hdl && profile.healthReport.cholesterol?.ldl ? `${profile.healthReport.cholesterol.hdl} / ${profile.healthReport.cholesterol.ldl}` : null} unit="mg/dL" status={profile.healthReport.cholesterol?.status} />
                            <LabCard label="Blood Pressure" value={profile.healthReport.bloodPressure?.systolic ? `${profile.healthReport.bloodPressure.systolic}/${profile.healthReport.bloodPressure.diastolic}` : null} unit="mmHg" status={profile.healthReport.bloodPressure?.status} />
                            <LabCard label="Hemoglobin" value={profile.healthReport.hemoglobin?.value} unit="g/dL" status={profile.healthReport.hemoglobin?.status} />
                            <LabCard label="TSH (Thyroid)" value={profile.healthReport.thyroid?.tsh} unit="mIU/L" status={profile.healthReport.thyroid?.status} />
                            <LabCard label="Creatinine" value={profile.healthReport.kidneyFunction?.creatinine} unit="mg/dL" status={profile.healthReport.kidneyFunction?.status} />
                        </div>

                        {/* Risk Factors */}
                        {profile.healthReport.riskFactors?.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">⚠️ Risk Factors</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile.healthReport.riskFactors.map((rf, i) => (
                                        <span key={i} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">{rf}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dietary Restrictions */}
                        {profile.healthReport.dietaryRestrictions?.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">🍽 Dietary Recommendations</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile.healthReport.dietaryRestrictions.map((dr, i) => (
                                        <span key={i} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">{dr}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-gray-400 text-sm mb-2">No health report uploaded yet</p>
                        <p className="text-gray-400 text-xs">Upload your blood test or medical report to get personalized food recommendations</p>
                    </div>
                )}

                {/* Upload Report Button */}
                <div className="flex justify-center mt-4">
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('image', file);
                                try {
                                    const resp = await fetch(
                                        `${import.meta.env?.VITE_URL || 'http://localhost:3000'}/api/v1/profile/upload-health-report`,
                                        {
                                            method: 'POST',
                                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                                            body: formData,
                                        }
                                    );
                                    const data = await resp.json();
                                    if (data.success) {
                                        alert('Health report uploaded and analysed! Refresh to see results.');
                                        window.location.reload();
                                    } else {
                                        alert(data.message || 'Failed to upload report');
                                    }
                                } catch (err) {
                                    alert('Error uploading report: ' + err.message);
                                }
                            }}
                        />
                        <span className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            {profile.healthReport ? 'Update Health Report' : 'Upload Health Report'}
                        </span>
                    </label>
                </div>
            </div>

            {/* Health Goals Section - Enhanced with progress indicators */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8 transition-all duration-300 hover:shadow-lg border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                    </span>
                    Health Goals
                </h2>
                <div className="flex flex-wrap gap-3">
                    {profile.purposes.length === 0 ? (
                        <p className="text-gray-500 italic">No goals specified yet</p>
                    ) : (
                        profile.purposes.map((purpose, index) => (
                            <span key={index} className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {purpose}
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* Additional Info - Enhanced with card styling and activity indicator */}
            <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                    <span className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </span>
                    Additional Information
                </h2>
                <div className="bg-indigo-50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 text-sm">Member since</p>
                        <p className="text-gray-800 font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-white p-2 rounded-full shadow">
                        <div className="bg-green-400 w-3 h-3 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Lab value card for health report display
const LabCard = ({ label, value, unit, status }) => {
    if (!value || value === 0) return null;
    const statusColors = {
        normal: 'bg-green-100 text-green-700',
        high: 'bg-red-100 text-red-700',
        elevated: 'bg-red-100 text-red-700',
        low: 'bg-yellow-100 text-yellow-700',
        anemic: 'bg-red-100 text-red-700',
        'pre-diabetic': 'bg-orange-100 text-orange-700',
        diabetic: 'bg-red-100 text-red-700',
        borderline: 'bg-yellow-100 text-yellow-700',
        hyper: 'bg-red-100 text-red-700',
        hypo: 'bg-yellow-100 text-yellow-700',
    };
    const colorClass = statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';

    return (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-gray-800">{value} <span className="text-xs text-gray-400">{unit}</span></p>
            </div>
            {status && status !== 'unknown' && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                    {status}
                </span>
            )}
        </div>
    );
};

// Enhanced DetailItem component with better styling
const DetailItem = ({ label, value, icon }) => (
    <div className="flex items-start">
        <div className="bg-gray-100 p-2 rounded-md mr-3">
            <span className="text-lg">{icon}</span>
        </div>
        <div>
            <p className="text-gray-500 text-sm">{label}</p>
            <p className="text-gray-800 font-medium">{value}</p>
        </div>
    </div>
);

export default Profile;