/**
 * Forgot Password modal component.
 * Allows users to request a password reset email.
 */
import { useState, FormEvent } from 'react';
import { requestPasswordReset } from '../lib/api';
import { Mail, X, CheckCircle, AlertCircle, Send } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Forgot Password modal component.
 * Displays a form to request a password reset email.
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Function to close the modal
 */
export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * Handles form submission to request password reset.
   * 
   * @param e - Form submit event
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccess(true);
      // Clear email after successful submission
      setTimeout(() => {
        setEmail('');
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles modal close and resets state.
   */
  function handleClose() {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-slideUp border border-white/20">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-ars-body" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-ars-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-ars-primary" />
          </div>
          <h2 className="text-2xl font-bold text-ars-heading mb-2">Forgot Password?</h2>
          <p className="text-sm text-ars-body">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-ars-heading mb-2">Email Sent!</h3>
            <p className="text-sm text-ars-body mb-4">
              If an account exists with this email, a password reset link has been sent. Please check your inbox.
            </p>
            <p className="text-xs text-ars-body text-gray-500">
              This modal will close automatically...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-[8px] flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-ars-heading mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-ars-body" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-[8px] focus:ring-2 focus:ring-ars-primary focus:border-ars-primary transition-all duration-200 bg-gray-50 focus:bg-white text-ars-heading"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ars-primary text-white py-4 rounded-[8px] font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={handleClose}
                className="text-sm text-ars-body hover:text-ars-heading transition-colors"
              >
                Back to Login
              </button>
            </div>
          </>
        )}

        {/* Add custom animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
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
    </div>
  );
}

