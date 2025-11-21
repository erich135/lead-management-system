/**
 * Set Password page component.
 * Allows users to set their password using an invitation token from email.
 */
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyInvitationToken, setPassword } from '../lib/api';
import { Lock, CheckCircle, AlertCircle, Mail } from 'lucide-react';

/**
 * Set Password page component.
 * Verifies the invitation token and allows the user to set their password.
 */
export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  /**
   * Verifies the invitation token on component mount.
   */
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('No invitation token provided. Please check your email for the correct link.');
        setVerifying(false);
        return;
      }

      try {
        const response = await verifyInvitationToken(token);
        // apiRequest unwraps the response, so we get { user: {...} } directly
        if (response?.user) {
          setValidToken(true);
          setUserEmail(response.user.email || '');
        } else {
          setError('Invalid or expired invitation token. Please request a new invitation.');
        }
      } catch (err: any) {
        setError(err.message || 'Invalid or expired invitation token. Please request a new invitation.');
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  /**
   * Handles form submission to set the password.
   * 
   * @param e - Form submit event
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('No invitation token provided.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await setPassword(token, password);
      // Redirect to login after successful password set
      setTimeout(() => {
        navigate('/login?passwordSet=true');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4"></div>
            <p className="text-slate-600">Verifying invitation token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Token</h1>
            <p className="text-slate-600 mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-[#0969a9] text-white rounded-xl font-bold text-[14px] hover:bg-[#0a7bc4] transition-colors"
            >
              GO TO LOGIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#0969a9]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#0969a9]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Set Your Password</h1>
          {userEmail && (
            <p className="text-slate-600 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {userEmail}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-2">Please create a secure password for your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0969a9] focus:border-transparent text-[15px]"
              placeholder="Enter your password (min. 8 characters)"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0969a9] focus:border-transparent text-[15px]"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#0969a9] to-[#0a7bc4] text-white rounded-xl font-bold text-[14px] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                SETTING PASSWORD...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                SET PASSWORD
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

