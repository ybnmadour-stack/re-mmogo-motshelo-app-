import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, saveSession } from '../api.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(form);
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
        <p>Create an admin account</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Full name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input type="password" minLength="6" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
          <button type="submit">{loading ? 'Creating account...' : 'Register'}</button>
        </form>
        <p className="small">Already registered? <Link to="/login">Login here</Link></p>
      </div>
    </div>
  );
}
