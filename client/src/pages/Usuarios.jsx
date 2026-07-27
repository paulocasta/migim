import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/AppLayout';
import { usersApi } from '../api/users';
import styles from './Usuarios.module.css';

const ROLE_LABELS = { admin: 'Admin', profesor: 'Profesor', alumno: 'Alumno' };
const ROLE_COLORS = { admin: styles.tagAdmin, profesor: styles.tagProfe, alumno: styles.tagAlumno };

const EMPTY_FORM = { nombre: '', email: '', password: '', role: 'alumno' };

export default function Usuarios() {
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const [filterRole, setFilterRole] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', user?: {} }
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', filterRole],
    queryFn: () => usersApi.list(filterRole || undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const createMut = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Error al guardar'),
  });

  const activoMut = useMutation({
    mutationFn: ({ id, activo }) => usersApi.setActivo(id, activo),
    onSuccess: invalidate,
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal({ mode: 'create' });
  }

  function openEdit(u) {
    setForm({ nombre: u.nombre, email: u.email, password: '', role: u.role });
    setFormError('');
    setModal({ mode: 'edit', user: u });
  }

  function closeModal() { setModal(null); }

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (modal.mode === 'create') {
      createMut.mutate(form);
    } else {
      const data = { nombre: form.nombre, email: form.email };
      if (form.password) data.password = form.password;
      updateMut.mutate({ id: modal.user.id, data });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const FILTERS =
    me.role === 'admin'
      ? [
          { value: '', label: 'Todos' },
          { value: 'alumno', label: 'Alumnos' },
          { value: 'profesor', label: 'Profesores' },
          { value: 'admin', label: 'Admins' },
        ]
      : [{ value: '', label: 'Alumnos' }];

  return (
    <AppLayout>
      <div className={styles.header}>
        <h1 className={styles.title}>Usuarios</h1>
        <button className={styles.btnPrimary} onClick={openCreate}>
          + Nuevo usuario
        </button>
      </div>

      {FILTERS.length > 1 && (
        <div className={styles.tabs}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.tab} ${filterRole === f.value ? styles.tabActive : ''}`}
              onClick={() => setFilterRole(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className={styles.msg}>Cargando...</p>}
      {error && <p className={styles.msgError}>Error al cargar usuarios.</p>}

      {!isLoading && users.length === 0 && (
        <p className={styles.msg}>No hay usuarios{filterRole ? ` con rol "${filterRole}"` : ''}.</p>
      )}

      {users.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td className={styles.email}>{u.email}</td>
                  <td>
                    <span className={`${styles.tag} ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.tag} ${u.activo ? styles.tagActivo : styles.tagInactivo}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button className={styles.btnSecondary} onClick={() => openEdit(u)}>
                      Editar
                    </button>
                    <button
                      className={`${styles.btnSecondary} ${u.activo ? styles.btnDanger : styles.btnSuccess}`}
                      onClick={() => activoMut.mutate({ id: u.id, activo: !u.activo })}
                      disabled={activoMut.isPending}
                    >
                      {u.activo ? 'Dar de baja' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2>{modal.mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                Nombre
                <input
                  className={styles.input}
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  minLength={2}
                />
              </label>
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className={styles.label}>
                {modal.mode === 'create' ? 'Contraseña' : 'Contraseña (dejar vacío para no cambiar)'}
                <input
                  className={styles.input}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required={modal.mode === 'create'}
                  minLength={modal.mode === 'create' ? 6 : 0}
                  autoComplete="new-password"
                />
              </label>
              {modal.mode === 'create' && me.role === 'admin' && (
                <label className={styles.label}>
                  Rol
                  <select className={styles.input} name="role" value={form.role} onChange={handleChange}>
                    <option value="alumno">Alumno</option>
                    <option value="profesor">Profesor</option>
                  </select>
                </label>
              )}
              {formError && <p className={styles.formError}>{formError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isPending}>
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
