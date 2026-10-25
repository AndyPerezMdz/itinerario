export type RolApp = "admin" | "editor" | "miembro";
export type EstadoEvento = "programado" | "modificado" | "cancelado";

export type EventoConDetalle = {
  id: string;
  fecha: string;
  hora: string | null;
  titulo: string | null;
  notas: string | null;
  estado: EstadoEvento;
  actividad: { nombre: string; color: string; es_especial: boolean } | null;
  asignaciones: { miembro: { id: string; nombre: string } | null; rol: { nombre: string } | null }[];
};

export const SELECT_EVENTO = `
  id, fecha, hora, titulo, notas, estado,
  actividad:actividades ( nombre, color, es_especial ),
  asignaciones ( miembro:miembros ( id, nombre ), rol:roles ( nombre ) )
`;

export const puedeEditar = (rol?: string | null) => rol === "admin" || rol === "editor";
