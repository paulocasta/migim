import { useAuth } from '../auth/AuthContext';
import styles from './Dashboard.module.css';

export default function RutinaAlumno() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.logo}>Migim</span>
        <div className={styles.userInfo}>
          <span>{user.nombre}</span>
          <button className={styles.logoutBtn} onClick={logout}>Salir</button>
        </div>
      </header>
      <main className={styles.main}>
        <h2>Mi Rutina</h2>
        <p>Acá verás tu rutina del día y podrás cargar los pesos. Disponible en Fase 5.</p>
      </main>
    </div>
  );
}
