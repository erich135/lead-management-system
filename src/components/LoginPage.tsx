import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Lock, Mail, Sparkles, Shield, Zap, X } from 'lucide-react';

/**
 * Login page component with modern, fun styling.
 * Connects to the ARS backend API for authentication.
 */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  /**
   * Handles form submission and authenticates the user.
   * 
   * @param e - Form submit event
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        // Check for specific error messages
        const errorMessage = result.error.message.toLowerCase();
        let displayMessage = 'The email or password you entered is incorrect. Please try again.';
        
        if (errorMessage.includes('invalid credentials') || 
            errorMessage.includes('incorrect') || 
            errorMessage.includes('wrong password') ||
            errorMessage.includes('authentication failed') ||
            errorMessage.includes('unauthorized')) {
          // Already set to the correct message
        } else if (errorMessage.includes('password not set')) {
          displayMessage = 'Please set your password first. Check your email for the invitation link.';
        } else if (errorMessage.includes('email not verified') || errorMessage.includes('verify your email')) {
          displayMessage = 'Please verify your email address. Check your email for the verification link.';
        } else {
          displayMessage = result.error.message || 'Failed to sign in. Please check your credentials.';
        }
        
        setError(displayMessage);
      }
    } catch (err) {
      // Handle any unexpected errors
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      let displayMessage = 'The email or password you entered is incorrect. Please try again.';
      
      if (errorMessage.includes('invalid credentials') || 
          errorMessage.includes('incorrect') || 
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('401')) {
        // Already set to the correct message
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('failed to fetch')) {
        displayMessage = 'Unable to connect to the server. Please check your connection and try again.';
      } else {
        displayMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      }
      
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clears the error message.
   */
  function clearError() {
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ars-primary via-ars-primary to-blue-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-ars-secondary rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-ars-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main login card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
          {/* Logo and header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300 p-3">
                  <img src="/Logo.png" alt="ARS Logo" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-ars-secondary rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-4 h-4 text-ars-heading" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-ars-heading mb-2">
              ARS Management
            </h1>
            <p className="text-ars-body text-lg">Welcome back! Sign in to continue</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl flex items-start gap-3 animate-shake shadow-md relative overflow-hidden group">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-20 h-20 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500 rounded-full translate-x-1/2 translate-y-1/2"></div>
              </div>
              
              <div className="relative z-10 flex items-start gap-3 w-full">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-red-900 mb-1">Login Failed</h3>
                  <p className="text-sm text-red-800 leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-red-200 transition-colors flex items-center justify-center group-hover:opacity-100 opacity-70"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4 text-red-700" />
                </button>
              </div>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-ars-heading">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-ars-body" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-ars-primary transition-all duration-200 bg-gray-50 focus:bg-white text-ars-heading"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-ars-heading">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-ars-body" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-ars-primary focus:border-ars-primary transition-all duration-200 bg-gray-50 focus:bg-white text-ars-heading"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ars-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group hover:bg-blue-800"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-ars-body">
              <Shield className="w-4 h-4 inline-block mr-1" />
              Secure authentication powered by ARS
            </p>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 text-center">
          <p className="text-white/90 text-sm">
            Need help? Contact your administrator
          </p>
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}
