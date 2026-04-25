import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService.js';
import { guardarSesion } from '../utils/auth.js';
import ErrorBox from '../components/ui/ErrorBox.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('olate.pablo@gmail.com');
  const [password, setPassword] = useState('Fullstack2026@');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(evento) {
    evento.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const respuesta = await login(correo, password);
      guardarSesion(respuesta);
      navigate('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-logo">GCR</div>
        <h1>Gestión Centralizada de Reclamos</h1>
        <p>Ingreso de usuarios internos</p>

        <label>Correo</label>
        <input value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" autoComplete="username" />

        <label>Contraseña</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />

        <ErrorBox error={error} />

        <button className="btn btn-primary" disabled={cargando} type="submit">
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <div className="demo-users">
          <strong>Usuarios demo</strong>
          <span>olate.pablo@gmail.com</span>
          <span>sebaore13@gmail.com</span>
          <span>trabajador@demo.cl</span>
          <span>visor@demo.cl</span>
        </div>
      </form>
    </div>
  );
}
