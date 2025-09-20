import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { auth, db } from './src/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function App() {
  const [email, setEmail] = useState('test@example.com');  // create this user in Console ➜ Auth
  const [password, setPassword] = useState('Passw0rd!');
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState('Idle');
  const [apiStatus, setApiStatus] = useState('No API calls made yet');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  const doLogin = async () => {
    try {
      setStatus('Signing in...');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setStatus('Signed in');
      await loadLessons();
    } catch (e) {
      setStatus(String(e));
    }
  };

  const loadLessons = async () => {
    setStatus('Loading lessons...');
    const q = query(collection(db, 'lessons'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setLessons(rows);
    setStatus(`Loaded ${rows.length}`);
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  const pingHealth = async () => {
    try {
      setApiStatus('Checking backend health...');
      const response = await fetch(`${API_URL}/healthz`);
      const data = await response.json();
      
      if (response.ok) {
        setApiStatus(`Backend is healthy: ${JSON.stringify(data)}`);
      } else {
        setApiStatus(`Error: ${response.status} - ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setApiStatus(`Connection failed: ${error.message}`);
      console.error('Health check error:', error);
    }
  };
  
  const testWrite = async () => {
    try {
      setApiStatus('Testing write operation...');
      const response = await fetch(`${API_URL}/test/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          device: Platform.OS,
          test: true
        }),
      });
      
      const data = await response.json();
      setApiStatus(`Write test: ${response.ok ? 'Success' : 'Failed'} - ${JSON.stringify(data)}`);
    } catch (error) {
      setApiStatus(`Write test failed: ${error.message}`);
      console.error('Write test error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <Text style={styles.h1}>Connectivity Check</Text>
      {user ? (
        <>
          <Text>Signed in as: {user.email}</Text>
          <Button title="Reload Lessons" onPress={loadLessons} />
          <FlatList
            data={lessons}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.title || item.id}</Text>
                <Text>{item.body || '(no body)'}</Text>
              </View>
            )}
          />
          <Button title="Sign out" onPress={() => signOut(auth)} />
        </>
      ) : (
        <>
          <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
          <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
          <Button title="Sign in" onPress={doLogin} />
        </>
      )}
      <Button title="Ping Backend /health" onPress={pingHealth} />
      <Button title="POST /test/write" onPress={testWrite} />
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.status}>{apiStatus}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 6 },
  card: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginVertical: 6 },
  title: { fontWeight: '700' },
  status: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#f5f5f5',
    color: '#333',
    fontSize: 14,
  }
});
