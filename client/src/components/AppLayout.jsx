import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './AppLayout.module.css';

const NAV = [
  { to: '/dashboard', label: 'Panel', roles: ['admin', 'profesor'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['admin', 'profesor'] },
  { to: '/catalogo', label: 'Catálogo', roles: ['admin', 'profesor'], soon: true },
  { to: '/rutinas', label: 'Rutinas', roles: ['admin', 'profesor'], soon: true },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.logo}>Migim</span>
        <nav className={styles.nav}>
          {NAV.filter((n) => n.roles.includes(user?.role)).map((n) =>
            n.soon ? (
              <span key={n.to} className={`${styles.navLink} ${styles.soon}`}>
                {n.label}
              </span>
            ) : (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                {n.label}
              </NavLink>
            )
          )}
        </nav>
        <div className={styles.user}>
          <span className={styles.userName}>{user?.nombre}</span>
          <span className={styles.userRole}>{user?.role}</span>
          <button className={styles.logoutBtn} onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
