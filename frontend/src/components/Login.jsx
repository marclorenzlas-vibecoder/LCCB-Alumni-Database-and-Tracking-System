import React, { useState, useEffect } from 'react';
import loginBackground from '../assets/loginbackground2.png';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';

const MIN_SIGNING_DISPLAY_MS = 1800;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginStatus, setLoginStatus] = useState('signing');
  const [showPassword, setShowPassword] = useState(false);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitForMinimumSigningDisplay = async (startedAt) => {
    const remainingTime = MIN_SIGNING_DISPLAY_MS - (Date.now() - startedAt);
    if (remainingTime > 0) {
      await delay(remainingTime);
    }
  };

  // Redirect to home if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = authService.getCurrentUser();
    if (token && user) {
      const role = authService.getRole();
      navigate(['teacher', 'admin'].includes(role) ? '/dashboard' : '/home', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem('auth_blocked_message');
      if (msg) {
        sessionStorage.removeItem('auth_blocked_message');
        toast.error(msg);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginStatus('signing');
    setIsSubmitting(true);
    const signingStartedAt = Date.now();

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        toast.error("Please enter both email and password");
        setIsSubmitting(false);
        return;
      }

      // Validate email domain
      const emailDomain = normalizedEmail.split('@')[1];
      
      let redirectPath = '/home';

      if (emailDomain === 'lccbonline.com') {
        // Teacher or admin login
        await authService.loginTeacher(normalizedEmail, password);
        const role = authService.getRole();
        await waitForMinimumSigningDisplay(signingStartedAt);
        setLoginStatus('success');
        redirectPath = ['teacher', 'admin'].includes(role) ? '/dashboard' : '/home';
      } else if (emailDomain === 'gmail.com') {
        // Alumni/Student login
        await authService.login(normalizedEmail, password);
        const user = authService.getCurrentUser();

        // Check if user is pending approval
        if (user && (user.approval_status === 'PENDING' || user.approval_status === 'REJECTED')) {
          await waitForMinimumSigningDisplay(signingStartedAt);
          setLoginStatus('success');
          await delay(3800);
          window.history.replaceState(null, '', '/pending-approval');
          navigate('/pending-approval', { replace: true });
          return;
        }

        await waitForMinimumSigningDisplay(signingStartedAt);
        setLoginStatus('success');
      } else {
        toast.error("Invalid email domain. Please use @lccbonline.com (teachers) or @gmail.com (alumni)");
        setIsSubmitting(false);
        return;
      }

      await delay(3800);
      // Clear history and navigate to landing page based on role
      window.history.replaceState(null, '', redirectPath);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      // Extract error message from various formats
      let errorMessage = "Login failed";

      if (err?.code === 'SERVER_AT_CAPACITY') {
        errorMessage = 'Server is full right now. Please try again in a few minutes.';
      } else if (typeof err?.error === 'string' && err.error.toLowerCase().includes('at capacity')) {
        errorMessage = 'Server is full right now. Please try again in a few minutes.';
      }
      
      if (errorMessage === "Login failed" && err.error) {
        errorMessage = err.error;
      } else if (errorMessage === "Login failed" && err.message) {
        errorMessage = err.message;
      }
      
      // Display the error message (which will include the blocked reason if account is blocked)
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const googleAuthUrl = `${API_BASE_URL}/auth/google`;
    // Add state parameter for security
    const state = Math.random().toString(36).substring(7);
    // Store state in sessionStorage for verification
    sessionStorage.setItem('oauth_state', state);
    // Add return URL
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `${googleAuthUrl}?state=${state}&return_to=${returnTo}`;
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50 flex items-stretch justify-stretch">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex min-w-[23rem] flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl" role="status" aria-live="polite">
            {loginStatus === 'success' ? (
              <div className="login-success-icon flex h-12 w-12 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg shadow-blue-900/25">
                <svg className="block h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path className="login-success-check" pathLength="1" d="M7 12.4l3.3 3.3L17.2 8.8" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900" />
            )}
            <div className="text-lg font-semibold text-slate-900">
              {loginStatus === 'success' ? 'Login successful!' : 'Signing in...'}
            </div>
            <div className="text-sm text-slate-500">
              {loginStatus === 'success' ? 'Logging in...' : 'Please wait while we connect you to the dashboard.'}
            </div>
          </div>
        </div>
      )}
      <div className="w-full min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden bg-white">
        {/* Left panel - Form */}
        <div className="w-full md:w-1/2 p-6 md:p-10 lg:p-14 bg-white flex flex-col justify-center overflow-y-auto scrollbar-hide">
          <div className="mb-6">
            <h1 className="mt-3 text-3xl lg:text-4xl font-extrabold leading-tight text-slate-900">
              Welcome to
              <span className="block bg-gradient-to-r from-blue-900 to-cyan-600 bg-clip-text text-transparent">
                LCCB Alumni
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              Sign in to reconnect with your community, manage your profile, and stay updated with alumni opportunities.
            </p>
          </div>
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
              className="w-full h-[50px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[50px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full ${isSubmitting ? 'bg-slate-400 cursor-not-allowed hover:bg-slate-400' : 'bg-blue-900 hover:bg-blue-800'} text-white font-semibold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 transition-all shadow-lg shadow-blue-900/30`}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
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
          className="hidden md:flex md:w-1/2 p-10 lg:p-14 items-center justify-center relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-700/85 via-blue-900/80 to-teal-800/85"></div>
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
