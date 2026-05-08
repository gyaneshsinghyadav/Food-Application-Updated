import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useUserStore } from "./store/useUserStore";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import Login from "./Auth/Login";
import Signup from "./Auth/Signup";
import ForgotPassword from "./Auth/ForgotPassword";
import ResetPassword from "./Auth/ResetPassword";
import VerifyEmail from "./Auth/VerifyEmail";
import Home from "./components/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import Post from "./components/Post";
import Profile from "./components/Profile";
import EnterPersonalDetails from "./components/EnterPersonalDetails";
import Chat from "./components/Chat";
import Scan from "./components/Scan";
import DisplayPost from "./components/DisplayPost";
import Header from "./components/Header";
import Footer from "./components/Footer";

// Removed developer NavigationButtons to clean up production view

function App() {
  const { checkAuthentication, isCheckingAuth } = useUserStore();

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <Router>
        <div className="flex flex-col min-h-screen">
          {/* Add Header component */}
          <Header />
          
          {/* Main content with top padding for fixed header */}
          <main className="flex-grow pt-16">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/personal-details/:id" element={<EnterPersonalDetails />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/scan" element={<Scan />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/posts" element={<Post />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/posts/:postId" element={<DisplayPost />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-screen p-4">
                  <h2 className="text-2xl md:text-4xl font-bold mb-4">404 Not Found</h2>
                  <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
                  <button 
                    onClick={() => window.history.back()} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go Back
                  </button>
                </div>
              } />
            </Routes>
          </main>
          
          {/* Add Footer component */}
          <Footer />
        </div>
      </Router>
    </>
  );
}

export default App;