import { useEffect, useMemo, useState } from 'react';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import { actualizarUsuario, crearUsuario, eliminarUsuario, listarUsuarios } from '../services/authService.js';
import { obtenerRol } from '../utils/auth.js';
import { puedeAdministrarUsuarios } from '../utils/roles.js';

const ROLES = ['ADMINISTRADOR', 'TRABAJADOR', 'VISOR'];
const PERFILES = ['GERENCIA', 'ATENCION_CLIENTE', 'POSTVENTA', 'OPERACIONES', 'SOPORTE_TECNICO'];

const FORM_INICIAL = {
  nombre: '',
  correo: '',
  password: '',
  rol: 'TRABAJADOR',
  perfil: 'ATENCION_CLIENTE',
  activo: true,
};

function leer(obj, nombres, fallback = '') {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

function normalizarUsuarioParaForm(usuario) {
  return {
    nombre: leer(usuario, ['nombre'], ''),
    correo: leer(usuario, ['correo'], ''),
    password: '',
    rol: leer(usuario, ['rol', 'rolNombre', 'nombreRol'], 'TRABAJADOR'),
    perfil: leer(usuario, ['perfil', 'perfilNombre', 'nombrePerfil'], 'ATENCION_CLIENTE'),
    activo: Boolean(leer(usuario, ['activo'], true)),
  };
}

function construirPayload(form) {
  return {
    nombre: form.nombre.trim(),
    correo: form.correo.trim(),
    password: form.password || undefined,
    rol: form.rol,
    rolNombre: form.rol,
    perfil: form.perfil,
    perfilNombre: form.perfil,
    activo: Boolean(form.activo),
  };
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState(FORM_INICIAL);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState('');

  async function cargar() {
    setCargando(true);
    setError(null);

    try {
      const data = await listarUsuarios();
      setUsuarios(Array.isArray(data) ? data : data?.usuarios || data?.content || []);
    } catch (err) {
      setError(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;

    return usuarios.filter((usuario) => [
      leer(usuario, ['nombre']),
      leer(usuario, ['correo']),
      leer(usuario, ['rol', 'rolNombre', 'nombreRol']),
      leer(usuario, ['perfil', 'perfilNombre', 'nombrePerfil']),
    ].join(' ').toLowerCase().includes(q));
  }, [usuarios, busqueda]);

  function abrirCrear() {
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);
    setMensaje('');
    setMostrarFormulario(true);
  }

  function abrirEditar(usuario) {
    setUsuarioEditando(usuario);
    setForm(normalizarUsuarioParaForm(usuario));
    setMensaje('');
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);
    setMensaje('');
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setMensaje('');

    try {
      const payload = construirPayload(form);

      if (usuarioEditando?.id) {
        await actualizarUsuario(usuarioEditando.id, payload);
        setMensaje('Usuario actualizado correctamente.');
      } else {
        await crearUsuario(payload);
        setMensaje('Usuario creado correctamente.');
      }

      await cargar();
      cerrarFormulario();
    } catch (err) {
      setError(err);
      setMensaje('No se pudo guardar. Verifica que el backend tenga habilitado POST/PUT para usuarios.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(usuario) {
    const id = usuario?.id;
    if (!id) return;

    if (!window.confirm(`¿Eliminar o desactivar a ${leer(usuario, ['nombre'], 'este usuario')}?`)) {
      return;
    }

    setGuardando(true);
    setError(null);
    setMensaje('');

    try {
      await eliminarUsuario(id);
      setMensaje('Usuario eliminado correctamente.');
      await cargar();
    } catch (err) {
      setError(err);
      setMensaje('No se pudo eliminar. Verifica que el backend tenga habilitado DELETE para usuarios.');
    } finally {
      setGuardando(false);
    }
  }

  if (!puedeAdministrarUsuarios(obtenerRol())) {
    return (
      <div className="page">
        <div className="panel">
          <h2>No autorizado</h2>
          <p>Solo el rol Administrador puede consultar la gestión de usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-compact">
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
          <p>Gestión interna de usuarios, roles y perfiles funcionales para la revisión de reclamos.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={cargar}>Actualizar</button>
          <button className="btn btn-primary" onClick={abrirCrear}>Nuevo usuario</button>
        </div>
      </div>

      <ErrorBox error={error} />
      {mensaje && <div className="notice-box">{mensaje}</div>}

      {mostrarFormulario && (
        <section className="panel compact-panel form-card">
          <div className="form-title-row">
            <div>
              <h3>{usuarioEditando ? 'Editar usuario' : 'Crear usuario'}</h3>
              <p>Define rol, perfil funcional y estado activo del usuario.</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={cerrarFormulario}>Cerrar</button>
          </div>

          <form className="user-form-grid" onSubmit={guardar}>
            <label>
              Nombre
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label>
              Correo
              <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
            </label>
            <label>
              Contraseña {usuarioEditando && <small>(dejar vacía para no cambiar)</small>}
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <label>
              Rol
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
              </select>
            </label>
            <label>
              Perfil
              <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
                {PERFILES.map((perfil) => <option key={perfil} value={perfil}>{perfil}</option>)}
              </select>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              Usuario activo
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={guardando} type="submit">
                {usuarioEditando ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={cerrarFormulario}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel filters-panel one-line compact-panel">
        <div>
          <label>Buscar usuario</label>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: correo, rol, perfil, nombre"
          />
        </div>
      </section>

      {cargando ? <Loading /> : (
        <div className="table-wrap dense-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Perfil</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id || usuario.correo}>
                  <td>{usuario.id}</td>
                  <td><strong>{leer(usuario, ['nombre'])}</strong></td>
                  <td>{leer(usuario, ['correo'])}</td>
                  <td><span className="badge badge-role">{leer(usuario, ['rol', 'rolNombre', 'nombreRol'])}</span></td>
                  <td><span className="badge badge-profile">{leer(usuario, ['perfil', 'perfilNombre', 'nombrePerfil'])}</span></td>
                  <td>{leer(usuario, ['activo'], false) ? <span className="badge badge-ok">Sí</span> : <span className="badge badge-off">No</span>}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-secondary btn-small" onClick={() => abrirEditar(usuario)}>Editar</button>
                      <button className="btn btn-danger btn-small" onClick={() => eliminar(usuario)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!usuariosFiltrados.length && <div className="empty-box">No hay usuarios con ese filtro.</div>}
        </div>
      )}
    </div>
  );
}
