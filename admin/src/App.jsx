import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, getDocs, doc, updateDoc, addDoc,
  query, orderBy, serverTimestamp, deleteField
} from 'firebase/firestore';
import { auth, db } from './firebase';

// ---- Auth context ----
// Removed duplicate declaration of AuthContext and AuthProvider

// ---- Login page ----
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(`Login failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 20 }}>
      <h1>ScamHunt Admin</h1>
      {error && <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
               placeholder="Email" required autoComplete="username" style={{ padding: 8 }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               placeholder="Password" required autoComplete="current-password" style={{ padding: 8 }} />
        <button type="submit" style={{ padding: 10, background: '#0066cc', color: 'white', border: 'none' }}>
          Sign In
        </button>
      </form>
    </div>
  );
}

// ---- Dashboard ----
function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('warning');

  useEffect(() => {
    async function loadReports() {
      setError('');
      try {
        const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(reportsQuery);
        setRows(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading reports:', err);
        setError('Failed to load reports');
      } finally {
        setLoadingRows(false);
      }
    }
    loadReports();
  }, []);

  const setStatus = async (id, status, publish = false) => {
    setError('');
    try {
      await updateDoc(doc(db, 'reports', id), {
        status,
        updatedAt: serverTimestamp(),
        ...(publish ? { publishedAt: serverTimestamp() } : { publishedAt: deleteField() }),
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, updatedAt: new Date() } : r)));
    } catch (err) {
      console.error('Error updating status:', err);
      setError(`Failed to update status: ${err.message}`);
    }
  };

  const sendAlert = async () => {
    const msg = alertMessage.trim();
    if (!msg) return setError('Please enter an alert message');
    setError('');
    try {
      await addDoc(collection(db, 'alerts'), {
        message: msg,
        type: alertType,
        createdAt: serverTimestamp(),
        active: true,
      });
      setAlertMessage('');
      window.alert('Alert sent successfully!');
    } catch (err) {
      console.error('Error sending alert:', err);
      setError(`Failed to send alert: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error('Logout failed', e); }
  };

  if (loadingRows) return <div>Loading reports...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const fmtTime = (ts) => {
    try {
      if (!ts) return 'unknown date';
      const d = typeof ts?.toDate === 'function' ? ts.toDate() : ts;
      return new Date(d).toLocaleString();
    } catch {
      return 'unknown date';
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>ScamHunt Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: 8, background: '#f44336', color: 'white', border: 'none' }}>
          Logout
        </button>
      </div>

      <div style={{ margin: '20px 0', padding: 15, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Broadcast Alert</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <select value={alertType} onChange={(e) => setAlertType(e.target.value)} style={{ padding: 8 }}>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
            <option value="info">Info</option>
          </select>
          <input type="text" value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)}
                 placeholder="Alert message" style={{ padding: 8, flexGrow: 1 }} />
        </div>
        <button onClick={sendAlert} style={{ padding: 10, background: '#ff9800', color: 'white', border: 'none', width: '100%' }}>
          Broadcast Alert
        </button>
      </div>

      <h2>Reports</h2>
      {rows.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{
            border: '1px solid #ccc', margin: '8px 0', padding: '12px', borderRadius: 8,
            background: r.status === 'approved' ? '#e8f5e9' : r.status === 'rejected' ? '#ffebee' : '#fff',
          }}>
            <div style={{ marginBottom: 8 }}>
              <b>{r.type || 'Report'}</b> — <span style={{ color: r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'orange' }}>
                {r.status || 'pending'}
              </span>
            </div>
            {r.message && <div style={{ margin: '8px 0' }}>{r.message}</div>}
            <div style={{ fontSize: '0.9em', color: '#666', marginBottom: 12 }}>
              by {r.userId || 'unknown user'} • {fmtTime(r.createdAt)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.status !== 'approved' && (
                <button onClick={() => setStatus(r.id, 'approved', true)}
                        style={{ padding: 8, background: '#4caf50', color: 'white', border: 'none' }}>
                  Approve & Publish
                </button>
              )}
              {r.status !== 'rejected' && (
                <button onClick={() => setStatus(r.id, 'rejected', false)}
                        style={{ padding: 8, background: '#f44336', color: 'white', border: 'none' }}>
                  Reject
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---- Route guard ----
// Removed duplicate Guarded function definition

// Removed duplicate export of App component



// ---- Auth context ----
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      try {
        if (authUser) {
          const token = await authUser.getIdTokenResult();
          setClaims(token.claims || {});
        } else {
          setClaims({});
        }
      } catch (e) {
        console.error('Failed to get ID token/claims:', e);
        setClaims({});
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, claims, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return React.useContext(AuthContext);
}

// ---- Login page ----
// Removed duplicate Login function definition

// ---- Dashboard ----
// Removed duplicate Dashboard function definition

// ---- Route guard ----
function Guarded() {
  const { user, /* claims, */ loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // if (!claims.admin) return <div>Access denied. Admin privileges required.</div>;
  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Guarded />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
