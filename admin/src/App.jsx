import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export default function App() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Passw0rd!');
  const [msg, setMsg] = useState('');

  const login = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setMsg('Logged in ✅ (Week 1 shell)');
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        fontFamily: 'Inter, system-ui, Arial, sans-serif',
        // base font size; we’ll scale inputs/buttons separately
        fontSize: 16,
        padding: 16, // helpful on very small screens
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,        // comfy on desktop
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          padding: 24,
        }}
      >
        <h2 style={{ textAlign: 'center', margin: 0, marginBottom: 8 }}>Admin Login</h2>
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

        <form
          onSubmit={login}
          style={{
            display: 'grid',
            gap: 12,
          }}
        >
          {/* Email */}
          <label htmlFor="email" style={{ fontSize: 14, color: '#374151' }}>
            Email
          </label>
          <input
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            style={{
              padding: '12px 14px',       // bigger tap target on mobile
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 16,
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />

          {/* Password */}
          <label htmlFor="password" style={{ fontSize: 14, color: '#374151' }}>
            Password
          </label>
          <input
            id="password"
            placeholder="********"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              padding: '12px 14px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 16,
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />

          {/* Submit */}
          <button
            type="submit"
            style={{
              marginTop: 4,
              padding: '12px 16px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'transform 0.05s ease',
              touchAction: 'manipulation',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Sign in
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
            color: '#374151',
            minHeight: 20, // keeps layout stable when empty
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
          Having trouble? Check your admin email in Firebase Auth.
        </div>
      </div>
    </div>
  );
}
