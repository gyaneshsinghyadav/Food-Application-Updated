import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const VerifyEmail = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const { verifyEmail, loading } = useUserStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!verificationCode.trim()) {
      setError("Verification code is required");
      return;
    }

    try {
      const response = await verifyEmail(verificationCode);
      if (response) {
        navigate("/personal-details/" + response._id);
      }
    } catch (err) {
      setError("Invalid verification code. Please try again.");
    }
  };

  // Handle code input, restrict to numbers only and format with spaces
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove all non-digits
    setVerificationCode(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a, #1e2022)' }}>
      {/* Animated background orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full space-y-8 p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10" style={{ background: 'rgba(30, 32, 34, 0.6)', backdropFilter: 'blur(16px)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Eat</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">iT</span>
          </h1>
          <h2 className="mt-4 text-2xl font-semibold text-white">Verify your email</h2>
          <p className="mt-2 text-sm text-gray-400">
            Please enter the verification code sent to your email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1">
              Verification Code
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                id="code"
                name="code"
                type="text"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="Enter your verification code"
                className={`px-4 py-3 w-full bg-white/5 border text-center text-xl tracking-[0.5em] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  error ? "border-red-500" : "border-white/10"
                }`}
                maxLength={6}
              />
              {error && <p className="mt-1 text-xs text-red-400 text-center">{error}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white ${
              loading
                ? "bg-emerald-600/50 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500"
            } transition-all duration-300 transform hover:-translate-y-1`}
          >
            {loading && <Loader2 className="animate-spin h-5 w-5 mr-3" />}
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <div className="flex justify-center mt-6">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;