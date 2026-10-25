# Itinerario

Calendario de actividades de la congregación. Reemplaza al `CALENDARIO_LLDM.xlsx`
(y a quien copiaba "FOTOGRAFÍA DINA Y JAEL" 52 veces al año).

**Stack:** Next.js 16 (App Router) · Supabase (Auth + Postgres + RLS) · Tailwind 4

## Cómo funciona

| Concepto | Tabla | Ejemplo |
|---|---|---|
| Tipo de actividad | `actividades` | Servicio, Dominical, Jornada de evangelización |
| Regla recurrente | `reglas` | "Cada sábado", "Día 14 de cada mes", "Último jueves" |
| Rotación | `rotaciones` + `rotacion_turnos` + `rotacion_turno_miembros` | Dominical: Horeb y Eva → Andrés y Eva → … |
| Evento concreto | `eventos` | Domingo 3 oct 2027 · Dominical |
| Quién hace qué | `asignaciones` | Eva · Maestro(a) dominical |

`generar_eventos(desde, hasta)` recorre los días, aplica reglas, respeta reemplazos
(Servicio de niños sustituye al Servicio del último jueves) y asigna el turno que toca.
Es idempotente: si ya existe un evento de esa actividad ese día, no lo duplica.

**Permisos (RLS):**

- `admin`: hace todo (calendario, miembros, reglas, rotaciones, cuentas). Los correos de
  `correos_admin` entran como admin automáticamente.
- `miembro`: ve el calendario completo o filtrado por persona ("Solo yo"), y sus turnos.
- Sin sesión: no ve nada.

Cada miembro tiene **roles** (Fotografía, Maestro(a) dominical…) en `miembro_roles`.

## Puesta en marcha

1. **Supabase → SQL Editor:** pega y corre `supabase/instalar_todo.sql` (migraciones + seed), una sola vez.
2. **Auth → URL Configuration:** Site URL = tu dominio (o `http://localhost:3000`).
3. **Auth → Email Templates:**
   - *Confirm signup:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - *Reset password:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
4. Regístrate en `/registro`. Si tu correo está en `correos_admin`, ya entras como admin.
5. Local:
   ```bash
   cp .env.example .env.local   # pon URL y publishable key
   npm install
   npm run dev
   ```

## Cuentas

- El registro es abierto: quien crea cuenta (y confirma su correo) queda como `miembro` y puede ver el calendario.
- `editor` y `admin` se asignan desde la tabla `perfiles` (solo un admin puede cambiar roles).
- Si el correo del usuario ya está en `miembros.email`, su cuenta se liga sola a esa ficha y ve sus turnos en "Mis turnos".

## Regenerar el seed desde el Excel

```bash
pip install openpyxl
python scripts/generar_seed.py ruta/CALENDARIO_LLDM.xlsx > supabase/seed.sql
```

Las reglas del seed arrancan el mes siguiente al último del Excel, para que "Generar mes"
no se meta con lo importado.

## Panel de admin (`/admin`)

| Sección | Qué hace |
|---|---|
| Resumen | Números rápidos, "Generar mes", nuevo evento especial |
| Miembros | Alta/edición de fichas, correo (liga la cuenta), roles, activo/inactivo |
| Actividades y roles | Catálogo con color; marcar actividades especiales |
| Reglas | Crear, pausar y borrar reglas recurrentes |
| Rotaciones | Turnos en orden (subir, quitar, agregar) |
| Cuentas | Hacer admin o miembro, ligar cuenta con ficha |

En el calendario, el admin le da clic a cualquier evento para editarlo o al **+** de un día para crear uno.

## Pendiente

- [ ] Exportar a PDF para el pizarrón y `.ics` para el calendario del celular
- [ ] Avisos (push o WhatsApp) un día antes del turno
