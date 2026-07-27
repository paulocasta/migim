import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/AppLayout';
import { usersApi } from '../api/users';
import styles from './Dashboard.module.css';

function StatCard({ label, value, to }) {
  return (
    <Link to={to} className={styles.statCard}>
      <span className={styles.statValue}>{value ?? '—'}</span>
      <span className={styles.statLabel}>{label}</span>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ['users', ''],
    queryFn: () => usersApi.list(),
  });

  const alumnos = users.filter((u) => u.role === 'alumno' && u.activo).length;
  const profes = users.filter((u) => u.role === 'profesor' && u.activo).length;
  const inactivos = users.filter((u) => !u.activo).length;

  return (
    <AppLayout>
      <h1 className={styles.title}>
        Hola, {user.nombre}
      </h1>
      <p className={styles.sub}>
        {user.role === 'admin' ? 'Panel de administración' : 'Panel del profesor'}
      </p>

      <div className={styles.stats}>
        <StatCard label="Alumnos activos" value={alumnos} to="/usuarios?role=alumno" />
        {user.role === 'admin' && (
          <StatCard label="Profesores activos" value={profes} to="/usuarios?role=profesor" />
        )}
        <StatCard label="Usuarios inactivos" value={inactivos} to="/usuarios" />
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <h3>Próximamente</h3>
          <ul className={styles.upcoming}>
            <li>Catálogo de ejercicios (Fase 3)</li>
            <li>Constructor de rutinas (Fase 4)</li>
            <li>Carga de pesos por alumnos (Fase 5)</li>
            <li>Métricas y gráficos (Fase 6)</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
