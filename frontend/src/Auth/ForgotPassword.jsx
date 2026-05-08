import { useState } from "react";
import { Link } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { loading, forgotPassword } = useUserStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      setError("Failed to process your request. Please try again.");
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
            {isSubmitted
              ? "Check your email for reset instructions"
              : "Enter your email and we'll send you reset instructions"}
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`pl-10 pr-4 py-3 w-full bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    error ? "border-red-500" : "border-white/10"
                  }`}
                />
                <Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" size={18} />
                {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
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
              {loading ? "Sending..." : "Send reset instructions"}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-900/40 border border-emerald-500/50 rounded-lg p-4 text-emerald-300">
            <p className="text-sm">
              We've sent password reset instructions to your email. Please check your inbox.
            </p>
          </div>
        )}

        <div className="flex justify-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;