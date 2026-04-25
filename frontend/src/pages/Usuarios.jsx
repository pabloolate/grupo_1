import { useEffect, useState } from 'react';
import ErrorBox from '../components/ui/ErrorBox.jsx';
import Loading from '../components/ui/Loading.jsx';
import { listarUsuarios } from '../services/authService.js';
import { obtenerRol } from '../utils/auth.js';
import { puedeAdministrarUsuarios } from '../utils/roles.js';

function leer(obj, nombres, fallback = '') {
  for (const nombre of nombres) {
    if (obj?.[nombre] !== undefined && obj?.[nombre] !== null) return obj[nombre];
  }
  return fallback;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const data = await listarUsuarios();
        setUsuarios(Array.isArray(data) ? data : data?.usuarios || data?.content || []);
      } catch (err) {
        setError(err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

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
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
          <p>Usuarios internos, roles y perfiles funcionales.</p>
        </div>
      </div>

      <ErrorBox error={error} />
      {cargando ? <Loading /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Perfil</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id || usuario.correo}>
                  <td>{usuario.id}</td>
                  <td>{leer(usuario, ['nombre'])}</td>
                  <td>{leer(usuario, ['correo'])}</td>
                  <td>{leer(usuario, ['rol', 'rolNombre', 'nombreRol'])}</td>
                  <td>{leer(usuario, ['perfil', 'perfilNombre', 'nombrePerfil'])}</td>
                  <td>{leer(usuario, ['activo'], false) ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
