import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';

export default function App() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Passw0rd!');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  type FirebaseErr = { message?: string };

  const niceError = (err: FirebaseErr | unknown): string => {
    const s = String((err as FirebaseErr)?.message || err);
    const cleaned = s
      .replace(/^Firebase:\s*/i, '')
      .replace(/\s*\(auth\/[a-z0-9-]+\)\.?$/i, '')
      .trim();

    if (/invalid-credential/i.test(s)) return 'Invalid email or password.';
    if (/user-not-found/i.test(s)) return 'Account not found.';
    if (/wrong-password/i.test(s)) return 'Incorrect password.';
    if (/too-many-requests/i.test(s)) return 'Too many attempts. Try again later.';
    return cleaned;
  };

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      // 1) Sign in
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // 2) Force-refresh token to get latest custom claims
      const token = await cred.user.getIdTokenResult(true);
      interface CustomClaims {
        role?: string;
      }
      const role = (token.claims as CustomClaims)?.role;

      // 3) Gate by role
      if (role === 'admin') {
        setMsg('Logged in ✔ Admin access granted.');
        // TODO: navigate to your admin dashboard (e.g., with TanStack Router or React Router)
        // navigate('/admin');
      } else {
        await signOut(auth);
        setMsg("Your account doesn't have admin access yet. Ask an owner to set your role, then sign in again.");
      }
    } catch (err) {
      setMsg(niceError(err));
    } finally {
      setLoading(false);
    }
  };

  // Reusable input style
  const inputBase: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
    background: '#fff',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#f9fafb',
        fontFamily: 'Inter, system-ui, Arial, sans-serif',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          padding: 24,
        }}
      >
        <h2 style={{ textAlign: 'center', margin: 0, marginBottom: 8 }}>
          Admin Login
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: '#6b7280',
            marginTop: 0,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Sign in to access your dashboard
        </p>

        <form onSubmit={login} style={{ display: 'grid', gap: 10 }}>
          {/* Email */}
          <label htmlFor="email" style={{ fontSize: 14, color: '#374151' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="admin@scamhuntph.gov.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
            style={inputBase}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
          />

          {/* Password */}
          <label htmlFor="password" style={{ fontSize: 14, color: '#374151', marginTop: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id="password"
              placeholder="********"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{
                ...inputBase,
                paddingRight: 44, // room for toggle button
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
            />
            <button
              type="button"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                color: '#2563eb',
                padding: '4px 6px',
                lineHeight: 1,
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '12px 16px',
              backgroundColor: loading ? '#93c5fd' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'transform 0.05s ease',
              touchAction: 'manipulation',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Message / status */}
        <div
          role="status"
          aria-live="polite"
          style={{
            fontStyle: 'italic',
            marginTop: 12,
            textAlign: 'center',
            wordBreak: 'break-word',
            color: /admin access granted/i.test(msg) ? '#065f46' : '#374151',
            minHeight: 20,
          }}
        >
          {msg}
        </div>

        {/* Small footer/help */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12,
            color: '#6b7280',
          }}
        >
          Having trouble? Ensure the user exists and has the admin role in Firebase Auth.
        </div>
      </div>
    </div>
  );
}
