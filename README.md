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

- `miembro`: solo lectura.
- `editor`: edita todo el calendario.
- `admin`: además cambia roles de usuarios.
- Sin sesión: no ve nada.

## Puesta en marcha

1. **Supabase → SQL Editor:** pega y corre `supabase/instalar_todo.sql` (migraciones + seed), una sola vez.
2. **Auth → URL Configuration:** Site URL = tu dominio (o `http://localhost:3000`).
3. **Auth → Email Templates:**
   - *Confirm signup:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - *Reset password:* `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
4. Regístrate en `/registro` y hazte admin:
   ```sql
   update perfiles set rol = 'admin'
   where id = (select id from auth.users where email = 'tu@correo.com');
   ```
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

## Pendiente

- [ ] CRUD de miembros, actividades, reglas y rotaciones en `/admin`
- [ ] Editar, cancelar y mover eventos sueltos (excepciones)
- [ ] Exportar a PDF para el pizarrón y `.ics` para el calendario del celular
- [ ] Avisos (push o WhatsApp) un día antes del turno
