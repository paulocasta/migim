import { useAuth } from '../auth/AuthContext';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.logo}>Migim</span>
        <div className={styles.userInfo}>
          <span>{user.nombre}</span>
          <span className={styles.role}>{user.role}</span>
          <button className={styles.logoutBtn} onClick={logout}>Salir</button>
        </div>
      </header>
      <main className={styles.main}>
        <h2>Panel de {user.role === 'admin' ? 'Administración' : 'Profesor'}</h2>
        <p>Fase 1 completa. Las secciones de rutinas, alumnos y catálogo se agregan en las próximas fases.</p>
      </main>
    </div>
  );
}
