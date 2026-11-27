export type DirectoryStatusCell = {
  present: boolean;
  card: string;
  face: number;
  fingerprint: number;
};

export type DirectoryStatusRow = {
  serverCard: string;
  serverSlots: number[];
  devices: Record<string, DirectoryStatusCell>;
};

export type BioStatusQuery = {
  missingFace?: string;
  missingFinger?: string;
  differs?: string;
};

function enabled(value?: string): boolean {
  return value === '1';
}

export function faceSlot(slot: number): boolean {
  return slot === 50 || slot === 51 || (slot >= 20 && slot <= 27);
}

export function faceTemplateSlot(slot: number): boolean {
  return slot === 50 || slot === 51 || (slot >= 20 && slot <= 27);
}

function serverFace(slots: number[]): number {
  return slots.some(faceTemplateSlot) ? 1 : 0;
}

function cardValue(value: string): string {
  const trimmed = value.trim();
  return trimmed && trimmed !== '0' ? trimmed : '';
}

function cellDiffers(row: DirectoryStatusRow, cell: DirectoryStatusCell): boolean {
  if (!cell.present) return false;
  if (cardValue(cell.card) !== cardValue(row.serverCard)) return true;
  const serverHasFace = serverFace(row.serverSlots) > 0;
  const deviceHasFace = (cell.face ?? 0) > 0;
  return serverHasFace && !deviceHasFace;
}

export function matchesBioStatus(row: DirectoryStatusRow, query?: BioStatusQuery): boolean {
  const missingFace = enabled(query?.missingFace);
  const differs = enabled(query?.differs);
  if (!missingFace && !differs) return true;
  const noFace = serverFace(row.serverSlots) === 0;
  const different = Object.values(row.devices).some((cell) => cellDiffers(row, cell));
  return (missingFace && noFace) || (differs && different);
}
