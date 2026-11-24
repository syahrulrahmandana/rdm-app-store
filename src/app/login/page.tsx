'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowRight,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import { FaGoogle, FaGithub, FaWhatsapp } from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('expired') === '1') {
        setError('Sesi Anda telah berakhir setelah 30 menit demi keamanan. Silakan login kembali.')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* Ambient Background Decorative Elements */}
      <div className="ambient-blob blob-1" />
      <div className="ambient-blob blob-2" />
      <div className="ambient-blob blob-3" />

      <div className="login-wrapper">
        {/* LEFT COLUMN: Mascot & Creative Background (Ref Style) */}
        <div className="mascot-section">
          {/* Big Sunburst / Circle Backdrop (Color 3 & 4: 90CAF9, E3F2FD, 2196F3) */}
          <div className="sunburst-backdrop">
            <div className="circle-base" />
            <div className="circle-ring ring-1" />
            <div className="circle-ring ring-2" />
            {/* Dynamic Brush Accent Lines */}
            <div className="brush-streak streak-1" />
            <div className="brush-streak streak-2" />
            <div className="brush-streak streak-3" />
          </div>

          {/* Floating Feature / Greeting Bubble */}
          <div className="mascot-badge">
            <span className="badge-icon">
              <HiOutlineSparkles size={16} />
            </span>
            <span>RDM AI Smart POS</span>
          </div>

          {/* Robot Mascot Sitting with Laptop */}
          <div className="mascot-image-wrapper">
            <img
              src="/mascot.png"
              alt="RDM Mascot Robot"
              className="mascot-img"
            />
          </div>

          {/* Slogan under mascot */}
          <div className="mascot-caption">
            <h3>Kelola Kasir & Stok Otomatis</h3>
            <p>Terhubung langsung dengan Bot WhatsApp & Multi-Payment</p>
          </div>
        </div>

        {/* RIGHT COLUMN: Modern Floating Login Card */}
        <div className="card-section">
          <div className="card-container">
            {/* Card Header with Logo Emblem */}
            <div className="card-header">
              <div className="logo-emblem">
                <img
                  src="/logo.png"
                  alt="RULLHHH Digital Market"
                  className="emblem-img"
                />
              </div>
              <h1 className="card-title">Welcome Back</h1>
              <p className="card-subtitle">Log in to continue your journey</p>
            </div>

            {/* Error / Expired Alert */}
            {error && (
              <div className="alert-box">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="login-form">
              {/* Email / Username Field */}
              <div className="input-group-custom">
                <div className="input-field-wrapper">
                  <span className="field-icon">
                    <HiOutlineEnvelope size={19} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    className="custom-input"
                    placeholder="Email or Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="input-group-custom">
                <div className="input-field-wrapper">
                  <span className="field-icon">
                    <HiOutlineLockClosed size={19} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="custom-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <HiOutlineEyeSlash size={19} /> : <HiOutlineEye size={19} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Help Links */}
              <div className="form-options">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="custom-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="https://wa.me/6287844538339?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20login%20Kasir%20RDM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="forgot-link"
                >
                  Forgot password?
                </a>
              </div>

              {/* Main Submit Button (Pill Gradient 2196F3 -> 0D47A1) */}
              <button
                type="submit"
                className="submit-pill-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-content">
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <span className="btn-content">
                    Log In
                    <HiOutlineArrowRight size={18} className="btn-arrow" />
                  </span>
                )}
              </button>
            </form>

            {/* Divider "Or log in with" matching reference image */}
            <div className="divider-section">
              <div className="divider-line" />
              <span className="divider-text">Or log in with</span>
              <div className="divider-line" />
            </div>

            {/* Social / Integration Badges */}
            <div className="social-pill-group">
              <button
                type="button"
                className="social-pill-btn"
                onClick={() => setEmail('owner@rdm.com')}
                title="Isi email Owner"
              >
                <FaGoogle size={17} color="#EA4335" />
              </button>
              <button
                type="button"
                className="social-pill-btn"
                onClick={() => setPassword('RDM12345')}
                title="Isi password Owner"
              >
                <FaGithub size={18} color="#0D47A1" />
              </button>
              <a
                href="https://wa.me/6287844538339"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill-btn"
                title="Bantuan WhatsApp"
              >
                <FaWhatsapp size={19} color="#25D366" />
              </a>
            </div>

            {/* Card Footer */}
            <div className="card-footer">
              <span className="footer-muted">RDM App Store</span>
              <span className="footer-dot">•</span>
              <span className="footer-highlight">Point of Sale System</span>
            </div>
          </div>
        </div>
      </div>

      {/* Styled JSX Scoped Styles */}
      <style jsx>{`
        /* PALETTE CONSTANTS:
           1. #0D47A1 (Navy / Deep Blue)
           2. #2196F3 (Primary Blue)
           3. #90CAF9 (Soft Sky Blue)
           4. #E3F2FD (Very Light Blue Tint)
        */

        .login-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 45%, #EAF4FD 100%);
          position: relative;
          overflow-x: hidden;
          padding: 24px 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        /* Ambient glowing circles */
        .ambient-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }

        .blob-1 {
          width: 450px;
          height: 450px;
          background: rgba(144, 202, 249, 0.45);
          top: -100px;
          left: -100px;
        }

        .blob-2 {
          width: 480px;
          height: 480px;
          background: rgba(33, 150, 243, 0.2);
          bottom: -120px;
          right: -100px;
        }

        .blob-3 {
          width: 320px;
          height: 320px;
          background: rgba(227, 242, 253, 0.9);
          top: 40%;
          left: 45%;
        }

        /* Main Wrapper */
        .login-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 60px;
          max-width: 1080px;
          width: 100%;
          margin: 0 auto;
        }

        /* LEFT: Mascot Section */
        .mascot-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          max-width: 480px;
        }

        .sunburst-backdrop {
          position: absolute;
          width: 390px;
          height: 390px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -55%);
          z-index: 1;
          pointer-events: none;
        }

        .circle-base {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle, #90CAF9 0%, #E3F2FD 70%, rgba(227, 242, 253, 0.2) 100%);
          box-shadow: 0 16px 40px rgba(33, 150, 243, 0.15);
        }

        .circle-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px dashed rgba(33, 150, 243, 0.4);
        }

        .ring-1 {
          width: 112%;
          height: 112%;
          top: -6%;
          left: -6%;
          animation: rotateClockwise 35s linear infinite;
        }

        .ring-2 {
          width: 88%;
          height: 88%;
          top: 6%;
          left: 6%;
          border-style: dotted;
          border-color: rgba(13, 71, 161, 0.3);
          animation: rotateCounter 28s linear infinite;
        }

        /* Brush strokes around the circle (Ref aesthetic) */
        .brush-streak {
          position: absolute;
          border-radius: 12px;
          background: linear-gradient(90deg, #2196F3, #90CAF9);
          opacity: 0.65;
        }

        .streak-1 {
          width: 48px;
          height: 8px;
          top: 15px;
          right: 35px;
          transform: rotate(25deg);
        }

        .streak-2 {
          width: 32px;
          height: 6px;
          top: 45px;
          right: 15px;
          transform: rotate(40deg);
        }

        .streak-3 {
          width: 40px;
          height: 8px;
          bottom: 40px;
          left: 10px;
          transform: rotate(-35deg);
        }

        .mascot-badge {
          position: absolute;
          top: 12px;
          right: 20px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          padding: 8px 16px;
          border-radius: 9999px;
          box-shadow: 0 8px 20px rgba(13, 71, 161, 0.12);
          border: 1px solid #E3F2FD;
          font-size: 13px;
          font-weight: 700;
          color: #0D47A1;
          animation: floatBadge 3.5s ease-in-out infinite;
        }

        .badge-icon {
          color: #2196F3;
          display: flex;
        }

        .mascot-image-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mascot-img {
          width: 100%;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 20px 30px rgba(13, 71, 161, 0.18));
          animation: floatMascot 4s ease-in-out infinite;
        }

        .mascot-caption {
          position: relative;
          z-index: 2;
          text-align: center;
          margin-top: 10px;
        }

        .mascot-caption h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0D47A1;
          margin: 0 0 4px 0;
        }

        .mascot-caption p {
          font-size: 13px;
          color: #64748B;
          margin: 0;
        }

        /* RIGHT: Card Section */
        .card-section {
          flex: 1;
          max-width: 440px;
          width: 100%;
        }

        .card-container {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1.5px solid rgba(144, 202, 249, 0.5);
          border-radius: 36px;
          padding: 42px 38px;
          box-shadow: 0 25px 60px -15px rgba(13, 71, 161, 0.14),
                      0 8px 24px -6px rgba(33, 150, 243, 0.08);
          position: relative;
        }

        /* Header */
        .card-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .logo-emblem {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: #E3F2FD;
          border: 1.5px solid #90CAF9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 6px 16px rgba(33, 150, 243, 0.18);
          overflow: hidden;
          padding: 6px;
        }

        .emblem-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .card-title {
          font-size: 28px;
          font-weight: 800;
          color: #0D47A1;
          letter-spacing: -0.5px;
          margin: 0 0 6px 0;
        }

        .card-subtitle {
          font-size: 14px;
          color: #64748B;
          margin: 0;
        }

        /* Alert box */
        .alert-box {
          background: #FFF1F2;
          border: 1px solid #FECDD3;
          border-radius: 14px;
          padding: 10px 14px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #E11D48;
          font-weight: 500;
        }

        .alert-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        /* Form & Inputs */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group-custom {
          display: flex;
          flex-direction: column;
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 18px;
          color: #2196F3;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1;
        }

        .custom-input {
          width: 100%;
          height: 52px;
          background: #F8FAFD;
          border: 1.5px solid #E3F2FD;
          border-radius: 18px;
          padding: 0 18px 0 50px;
          font-size: 14px;
          color: #0D47A1;
          font-weight: 500;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .custom-input::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .custom-input:hover {
          border-color: #90CAF9;
          background: #FFFFFF;
        }

        .custom-input:focus {
          border-color: #2196F3;
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.15);
        }

        .password-toggle-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: color 0.15s ease;
        }

        .password-toggle-btn:hover {
          color: #2196F3;
        }

        /* Form Options (Remember Me & Forgot Link) */
        .form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: -2px;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .remember-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #64748B;
          user-select: none;
          font-weight: 500;
        }

        .custom-checkbox {
          accent-color: #2196F3;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          cursor: pointer;
        }

        .forgot-link {
          color: #2196F3;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .forgot-link:hover {
          color: #0D47A1;
          text-decoration: underline;
        }

        /* Main Pill Button */
        .submit-pill-btn {
          width: 100%;
          height: 52px;
          border: none;
          border-radius: 9999px;
          background: linear-gradient(135deg, #2196F3 0%, #0D47A1 100%);
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 24px -4px rgba(33, 150, 243, 0.45);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 6px;
          overflow: hidden;
          position: relative;
        }

        .submit-pill-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px -4px rgba(13, 71, 161, 0.35);
        }

        .submit-pill-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 6px 16px -2px rgba(13, 71, 161, 0.4);
        }

        .submit-pill-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-arrow {
          transition: transform 0.2s ease;
        }

        .submit-pill-btn:hover .btn-arrow {
          transform: translateX(3px);
        }

        .spinner {
          width: 18px;
          height: 18px;
          animation: spin 0.9s linear infinite;
        }

        /* Divider */
        .divider-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 18px;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #E3F2FD;
        }

        .divider-text {
          font-size: 12px;
          color: #94A3B8;
          font-weight: 500;
        }

        /* Social / Shortcut Pills */
        .social-pill-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .social-pill-btn {
          width: 64px;
          height: 44px;
          border-radius: 14px;
          border: 1.5px solid #E3F2FD;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.06);
        }

        .social-pill-btn:hover {
          border-color: #90CAF9;
          background: #F8FAFD;
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(33, 150, 243, 0.12);
        }

        /* Footer */
        .card-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .footer-highlight {
          color: #2196F3;
          font-weight: 600;
        }

        /* Keyframes */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateCounter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes floatMascot {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes floatBadge {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .login-wrapper {
            flex-direction: column;
            gap: 32px;
            padding: 12px 0;
          }

          .mascot-section {
            max-width: 320px;
          }

          .sunburst-backdrop {
            width: 280px;
            height: 280px;
          }

          .mascot-image-wrapper {
            max-width: 240px;
          }

          .mascot-caption {
            display: none;
          }

          .card-section {
            max-width: 420px;
          }

          .card-container {
            padding: 32px 24px;
            border-radius: 28px;
          }
        }

        @media (max-width: 480px) {
          .login-root {
            padding: 16px 12px;
          }

          .mascot-section {
            max-width: 240px;
          }

          .sunburst-backdrop {
            width: 220px;
            height: 220px;
          }

          .mascot-image-wrapper {
            max-width: 190px;
          }

          .card-title {
            font-size: 24px;
          }

          .card-container {
            padding: 28px 18px;
            border-radius: 24px;
          }

          .custom-input {
            height: 48px;
            font-size: 13px;
          }

          .submit-pill-btn {
            height: 48px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}
