import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import { crearReclamoFormulario } from '../services/integracionService.js';

export default function NuevoReclamo() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombreCliente: '',
    correoCliente: '',
    asunto: '',
    mensaje: '',
    identificadorExterno: `front-${Date.now()}`,
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await crearReclamoFormulario(form);
      navigate('/reclamos');
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="page narrow-page">
      <div className="page-header">
        <div>
          <h2>Nuevo reclamo</h2>
          <p>Ingreso manual desde formulario web.</p>
        </div>
      </div>

      <form className="panel form-panel" onSubmit={enviar}>
        <ErrorBox error={error} />

        <label>Nombre cliente</label>
        <input value={form.nombreCliente} onChange={(e) => cambiar('nombreCliente', e.target.value)} required />

        <label>Correo cliente</label>
        <input value={form.correoCliente} onChange={(e) => cambiar('correoCliente', e.target.value)} type="email" required />

        <label>Asunto</label>
        <input value={form.asunto} onChange={(e) => cambiar('asunto', e.target.value)} required />

        <label>Mensaje</label>
        <textarea value={form.mensaje} onChange={(e) => cambiar('mensaje', e.target.value)} rows={6} required />

        <button className="btn btn-primary" disabled={cargando} type="submit">
          {cargando ? 'Creando...' : 'Crear reclamo'}
        </button>
      </form>
    </div>
  );
}
