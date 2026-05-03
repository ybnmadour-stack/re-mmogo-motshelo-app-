import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, saveSession } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      saveSession(data);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Re-Mmogo</h1>
        <p>Login to manage your Motshelo group</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input type="password" minLength="6" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
          <button type="submit">{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <p className="small">No account? <Link to="/register">Register here</Link></p>
      </div>
    </div>
  );
}
