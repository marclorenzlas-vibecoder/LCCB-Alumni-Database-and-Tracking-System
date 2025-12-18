import React, { useState } from 'react';
import loginBackground from '../assets/loginbackground2.png';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!email || !password) {
        setError("Please enter both email and password");
        return;
      }

      // Validate email domain
      const emailDomain = email.split('@')[1];
      
      if (emailDomain === 'lccbonline.com') {
        // Teacher login
        await authService.loginTeacher(email, password);
        setSuccess("Teacher login successful! Redirecting...");
      } else if (emailDomain === 'gmail.com') {
        // Alumni/Student login
        await authService.login(email, password);
        const user = authService.getCurrentUser();
        
        // Check if user is pending approval
        if (user && (user.approval_status === 'PENDING' || user.approval_status === 'REJECTED')) {
          setSuccess("Login successful! Checking account status...");
          setTimeout(() => {
            window.location.href = "/pending-approval";
          }, 1500);
          return;
        }
        
        setSuccess("Login successful! Redirecting...");
      } else {
        setError("Invalid email domain. Please use @lccbonline.com (teachers) or @gmail.com (alumni)");
        return;
      }

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      console.error("Login error:", err);
      // Check if the error message contains 'blocked'
      if (err.message && err.message.toLowerCase().includes('blocked')) {
        setError(err.message);
      } else {
        setError(err.message || "Login failed");
      }
    }
  };

  const handleGoogleLogin = () => {
    const googleAuthUrl = "http://localhost:5001/api/auth/google";
    // Add state parameter for security
    const state = Math.random().toString(36).substring(7);
    // Store state in sessionStorage for verification
    sessionStorage.setItem('oauth_state', state);
    // Add return URL
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `${googleAuthUrl}?state=${state}&return_to=${returnTo}`;
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-6xl h-[90vh] max-h-[700px] flex flex-col md:flex-row items-stretch rounded-3xl overflow-hidden shadow-2xl">
        {/* Left panel - Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-10 bg-white flex flex-col justify-center overflow-y-auto scrollbar-hide">
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <div className="mb-6">
            <h2 className="text-3xl lg:text-4xl font-bold mb-1 text-gray-900">Welcome to</h2>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">LCCB Alumni</h1>
          </div>
          <p className="text-gray-500 text-sm mb-6">Sign in to access your alumni account and connect with your community.</p>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error.includes('blocked') ? (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800">Account Blocked</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <div className="text-center">{error}</div>
            )}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1.5" htmlFor="email">
              Email/Username
            </label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1.5" htmlFor="password">
              Password
            </label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
              placeholder="Enter your password"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-all shadow-lg shadow-blue-600/30"
          >
            Sign In
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 18 18" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2045c0-.638-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.701-1.566 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.957-2.19l-2.908-2.258c-.806.54-1.84.86-3.049.86-2.344 0-4.328-1.582-5.036-3.708H.957v2.332C2.437 15.982 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.704A5.41 5.41 0 0 1 3.68 9c0-.59.102-1.159.284-1.704V4.964H.957A9.01 9.01 0 0 0 0 9c0 1.456.35 2.834.957 4.036l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.579c1.32 0 2.507.454 3.44 1.344l2.58-2.58C13.463.891 11.426 0 9 0 5.482 0 2.437 2.018.957 4.964l3.007 2.332C4.672 5.17 6.656 3.579 9 3.579z"/>
          </svg>
          Signup with Google
        </button>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">Don't have an account? </span>
          <a 
            href="/register" 
            className="font-semibold text-cyan-500 hover:text-cyan-600 underline"
          >
            Register
          </a>
        </div>

        </div>

        {/* Right panel - Background Image */}
        <div 
          className="hidden md:flex md:w-1/2 p-8 lg:p-12 items-center justify-center relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/85 via-blue-600/80 to-teal-700/85"></div>
          <div className="relative z-10 text-white max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">Connect with Your LCCB Community</h2>
            <p className="text-base lg:text-lg mb-8 text-white/95 leading-relaxed">Access your alumni profile, track achievements, and stay connected with fellow graduates.</p>
            
            {/* Stats/Features */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Alumni Network</p>
                  <p className="text-white/80 text-xs">Connect with thousands of graduates</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Track Achievements</p>
                  <p className="text-white/80 text-xs">Showcase your career milestones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
