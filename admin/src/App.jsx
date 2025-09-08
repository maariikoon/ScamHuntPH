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
    <div style={{maxWidth: 360, margin: '48px auto', display:'grid', gap:12}}>
      <h2>Admin Login</h2>
      <form onSubmit={login} style={{display:'grid', gap:8}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Sign in</button>
      </form>
      <div style={{fontStyle:'italic'}}>{msg}</div>
    </div>
  );
}
