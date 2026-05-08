import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { Loader2, LockKeyhole, ArrowLeft, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [input, setInput] = useState({
    password: "",
    confirmPassword: "",
    token: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const { resetPassword, loading } = useUserStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!input.token.trim()) {
      newErrors.token = "Reset token is required";
    }
    
    if (!input.password) {
      newErrors.password = "New password is required";
    } else if (input.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (input.password !== input.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        await resetPassword({
          token: input.token,
          password: input.password,
        });
        navigate("/login");
      } catch (error) {
        setErrors({
          general: "Failed to reset password. Please try again.",
        });
      }
    }
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
          <h2 className="mt-4 text-2xl font-semibold text-white">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your reset token and create a new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
              {errors.general}
            </div>
          )}

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-1">
              Reset Token
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                id="token"
                name="token"
                type="text"
                value={input.token}
                onChange={handleChange}
                placeholder="Paste your reset token"
                className={`px-4 py-3 w-full bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.token ? "border-red-500" : "border-white/10"
                }`}
              />
              {errors.token && (
                <p className="mt-1 text-xs text-red-400">{errors.token}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              New Password
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={input.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`pl-10 pr-10 py-3 w-full bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.password ? "border-red-500" : "border-white/10"
                }`}
              />
              <LockKeyhole className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" size={18} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={input.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`pl-10 pr-4 py-3 w-full bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.confirmPassword ? "border-red-500" : "border-white/10"
                }`}
              />
              <LockKeyhole className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" size={18} />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
              )}
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
            {loading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;