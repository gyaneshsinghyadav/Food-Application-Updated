import { useUserStore } from "../store/useUserStore.js";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [input, setInput] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const { loading, login } = useUserStore();
  const navigate = useNavigate();

  const changeEventHandler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const loginSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const result = await login(input);
      if (result) navigate("/");
    } catch (error) {
      // console.log(error);
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
          <h2 className="mt-4 text-2xl font-semibold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-400">Sign in to your intelligent nutrition assistant</p>
        </div>

        <form onSubmit={loginSubmitHandler} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                value={input.email}
                onChange={changeEventHandler}
                className="pl-10 pr-4 py-3 w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" size={18} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative rounded-md shadow-sm">
              <input
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                value={input.password}
                onChange={changeEventHandler}
                className="pl-10 pr-4 py-3 w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <LockKeyhole className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" size={18} />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
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
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-white/10"></div>
            <div className="mx-4 text-gray-500 text-sm font-medium">NEW TO EATIT?</div>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <p className="text-center text-sm text-gray-400">
            <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Create an account
            </Link> instead.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;