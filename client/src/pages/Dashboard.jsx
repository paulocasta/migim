import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/AppLayout';
import { usersApi } from '../api/users';
import styles from './Dashboard.module.css';

function StatCard({ label, value }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{value ?? '—'}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
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
        <StatCard label="Alumnos activos" value={alumnos} />
        {user.role === 'admin' && (
          <StatCard label="Profesores activos" value={profes} />
        )}
        <StatCard label="Usuarios inactivos" value={inactivos} />
      </div>
    </AppLayout>
  );
}
