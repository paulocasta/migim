# Migim

App web para seguir rutinas de gimnasio. Los **profesores** arman la rutina de cada alumno y los **alumnos** la siguen desde el celular: ven los ejercicios, miran el video y cargan el peso que levantan. Con esos pesos la app genera métricas de progreso.

Se instala como app en el celular (PWA) y funciona en cualquier navegador.

---

## Índice

- [Conceptos básicos](#conceptos-básicos)
- [Roles](#roles)
- [Ingresar a la app](#ingresar-a-la-app)
- [Manual del profesor / admin](#manual-del-profesor--admin)
  - [Panel](#panel)
  - [Usuarios](#usuarios)
  - [Catálogo de ejercicios](#catálogo-de-ejercicios)
  - [Rutinas](#rutinas)
  - [Editor de rutina](#editor-de-rutina)
- [Manual del alumno](#manual-del-alumno)
  - [Mi Rutina](#mi-rutina)
  - [Cargar pesos](#cargar-pesos)
- [Métricas](#métricas)
- [Instalar en el celular](#instalar-en-el-celular)
- [Para desarrolladores](#para-desarrolladores)

---

## Conceptos básicos

Una rutina se organiza así:

```
Rutina
└── Días            (Lunes, Martes… o "Día 1", "Fase fuerza")
    └── Bloques     (Entrada en calor, Potencia, Fuerza, Accesorios, Vuelta a la calma)
        └── Ejercicios   (Sentadilla, Press banca…)
            └── Series   (1×8, 2×6, 1×4  →  series × repeticiones)
                └── Peso que carga el alumno
```

- El **profesor** define todo hasta las series: qué ejercicio, cuántas series y cuántas repeticiones.
- El **alumno** solo completa el **peso** de cada serie. No puede cambiar la estructura.

Ejemplo: si el profe prescribe `1×8  2×6  1×4` en sentadilla, el alumno ve tres filas y carga un peso para cada una.

---

## Roles

| Puede… | Admin | Profesor | Alumno |
|---|:-:|:-:|:-:|
| Crear y gestionar profesores | ✅ | — | — |
| Crear y editar alumnos | ✅ | ✅ | — |
| Gestionar el catálogo de ejercicios y categorías | ✅ | ✅ | — |
| Armar, copiar y borrar rutinas | ✅ | ✅ | — |
| Ver su propia rutina y cargar pesos | — | — | ✅ |
| Ver métricas | De cualquier alumno | De cualquier alumno | Solo las propias |

No hay auto-registro: las cuentas de los alumnos las crea un profesor o un admin.

---

## Ingresar a la app

1. Abrir la app en el navegador.
2. Ingresar **email** y **contraseña** (los da el profesor o el admin).
3. Según el rol, la app te lleva a:
   - **Admin / Profesor** → Panel.
   - **Alumno** → Mi Rutina.

El menú superior muestra solo las secciones que corresponden a tu rol.

---

## Manual del profesor / admin

Menú: **Panel · Usuarios · Catálogo · Rutinas · Métricas**

### Panel

Resumen rápido: cantidad de alumnos activos, profesores activos (solo admin) y usuarios inactivos.

### Usuarios

Lista de usuarios con nombre, email, rol y estado.

- **Nuevo usuario**: completar nombre, email y contraseña (con confirmación). El admin además elige el rol (alumno o profesor). Un profesor solo puede crear alumnos.
- **Editar**: cambiar los datos. Si dejás la contraseña vacía, no se modifica.
- **Dar de baja / Activar**: la baja no borra al usuario. El alumno deja de poder ingresar, pero su historial y sus métricas se conservan. Se puede reactivar cuando quieras.
- El admin puede filtrar por rol (Todos, Alumnos, Profesores, Admins).

### Catálogo de ejercicios

Biblioteca de ejercicios que después se usan en las rutinas, agrupados por **categoría muscular** (Piernas, Hombros, Espalda, Pecho, Brazos, Core, Glúteos, Movilidad / Elasticidad, Pliometría).

**Categorías**: se pueden crear, renombrar, reordenar y eliminar.

**Ejercicios** — pestaña *Información*:
- **Categoría** y **Nombre** (obligatorios).
- **Descripción** (opcional): indicaciones técnicas.
- **URL de video** (opcional): link de YouTube o Vimeo.
- **Requiere peso**: desmarcalo en ejercicios sin carga (movilidad, elongación, plancha…). En esos ejercicios el alumno no tiene que cargar peso, solo los marca como hechos.

**Ejercicios** — pestaña *Video*: en vez de un link, podés **subir un archivo de video** propio, o quitar el video cargado.

En la lista, `▶` indica que el ejercicio tiene video y **Sin peso** que no requiere carga.

### Rutinas

Lista de todas las rutinas, filtrable por alumno. Cada rutina muestra el alumno, el período y si está activa.

**Crear una rutina** (`+ Nueva rutina`):
1. Elegir el **alumno**.
2. Ponerle un **nombre** (ej: "Bloque Julio").
3. Elegir el **tipo de período**:
   - **Semanal** → crea automáticamente los 7 días (Lunes a Domingo) de la semana elegida, cada uno con su fecha.
   - **Mensual** → crea 4 semanas (28 días) con fecha.
   - **Personalizada** → se crea sin días; los agregás a mano en el editor.
4. Elegir la **fecha de inicio**. La semana siempre arranca el lunes; la app muestra una vista previa del rango de fechas.
5. **Crear y editar** → te lleva al editor.

**Copiar una rutina** (ícono de copiar): duplica toda la estructura (días, bloques, ejercicios y series) para el mismo alumno, con un nombre nuevo y una nueva fecha de inicio. Sirve para repetir el mes siguiente sin armar todo de nuevo. Los pesos cargados **no** se copian.

**Eliminar una rutina**: borra la rutina con todos sus días, bloques, ejercicios y los pesos cargados. Pide confirmación porque **no se puede deshacer**.

### Editor de rutina

Se abre al crear una rutina o al hacer clic en una de la lista.

- **Nombre de la rutina**: editable con ✎.
- **Días**: aparecen como pestañas arriba.
  - `+ Día` agrega un día con nombre libre (ej: "Día 1", "Fase fuerza") o eligiendo un día de la semana.
  - `⧉` **Copiar a otros días**: copia los ejercicios del día actual a los días que elijas. Ideal cuando varios días repiten el mismo trabajo.
  - `×` elimina el día.
- **Bloques** (dentro de cada día): `+ Bloque` y elegir el tipo (Entrada en calor, Potencia, Fuerza, Accesorios, Vuelta a la calma). Se puede eliminar un bloque con `×`.
- **Ejercicios** (dentro de cada bloque): agregar ejercicio abre un buscador del catálogo (por nombre o categoría). Se quita con `×`.
- **Series** (dentro de cada ejercicio): `+ Serie` e ingresar **series** y **repeticiones**. Por ejemplo `2` y `6` = 2×6. Agregá tantas filas como necesites (`1×8`, `2×6`, `1×4`). Se editan con ✎ y se borran con `×`.

Los cambios se guardan al confirmar cada acción (✓); no hay un botón "Guardar todo".

---

## Manual del alumno

Menú: **Mi Rutina · Métricas**

### Mi Rutina

- Si tenés más de una rutina, elegí cuál ver en el selector **Rutina**.
- Los **días** aparecen como pestañas, agrupados por **semana** (Semana 1, Semana 2…) con su rango de fechas.
- Dentro de cada día ves los **bloques** en orden y, en cada bloque, los **ejercicios** con sus series.
- Tocá el ícono de **video** para ver cómo se hace el ejercicio.
- Si todavía no tenés rutina asignada, la app te lo avisa: hablá con tu profe.

### Cargar pesos

Cada ejercicio muestra una fila por grupo de series (ej: `1×8`, `2×6`, `1×4`):

1. Escribí el **peso en kg** que usaste.
2. Tocá **Guardar** (o Enter). La fila muestra ✓ cuando se guardó.
3. Cuando completás todas las filas de un ejercicio, aparece **✓ Completo**.

- En ejercicios **sin peso** (movilidad, etc.) el botón dice **Marcar hecho**. El peso es opcional.
- El peso queda registrado con la **fecha del día de la rutina**, no con la fecha en que lo cargás. Si te olvidaste de cargar el martes y lo hacés el jueves, igual cuenta para el martes.
- Podés corregir un peso: escribí el nuevo valor y guardá de nuevo.

---

## Métricas

Disponibles para todos. El profesor o el admin primero eligen **de qué alumno** ver las métricas; el alumno ve directamente las suyas.

Filtro de **Período**: Todo · Semana · Mes (con selector de semana o mes).

| Pestaña | Qué muestra |
|---|---|
| **Progreso** | Elegís un ejercicio y ves en un gráfico la evolución del peso en el tiempo (máximo y promedio por fecha). |
| **Volumen** | Total de kilos cargados por sesión o por semana (*Agrupar por*). Sirve para ver la carga de entrenamiento. |
| **Records** | Peso máximo alcanzado en cada ejercicio y la fecha en que se logró. |
| **Asistencia** | Días entrenados en el período y cuántas series se registraron en cada uno. |

Las métricas se alimentan solo de los pesos que carga el alumno: si no se cargan, no hay datos.

---

## Instalar en el celular

Migim es una PWA: se instala como una app sin pasar por la tienda.

- **Android (Chrome)**: menú `⋮` → **Instalar app** / **Agregar a pantalla principal**.
- **iPhone (Safari)**: botón **Compartir** → **Agregar a inicio**.
- **PC (Chrome / Edge)**: ícono de instalar en la barra de direcciones.

---

## Para desarrolladores

Stack: React + Vite (PWA) · Node.js + Express · PostgreSQL · JWT.

```bash
# API
cd server
cp .env.example .env      # completar DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run migrate:seed      # crea tablas, categorías, tipos de bloque y el admin inicial
npm run dev               # http://localhost:3001

# Frontend
cd client
npm install
npm run dev               # Vite, con proxy a la API
```

Más documentación técnica en [`docs/`](docs/):
[Arquitectura](docs/ARCHITECTURE.md) · [Modelo de datos](docs/DATA_MODEL.md) · [API](docs/API.md) · [Roles](docs/ROLES.md) · [Roadmap](docs/ROADMAP.md) · [Deploy](docs/DEPLOY.md)
