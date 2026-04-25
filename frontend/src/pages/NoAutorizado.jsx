import { Link } from 'react-router-dom';

export default function NoAutorizado() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>No autorizado</h1>
        <p>No tienes permisos para acceder a esta sección.</p>
        <Link className="btn btn-primary" to="/dashboard">Volver al dashboard</Link>
      </div>
    </div>
  );
}
