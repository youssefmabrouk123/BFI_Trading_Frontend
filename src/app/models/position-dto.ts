// src/app/models/position-dto.ts
export interface PositionDTO {
    pk: number;
    identifier: string;
    mntDev: number; // BigDecimal est reçu comme string dans JSON
    besoinDev: number; // BigDecimal est reçu comme string dans JSON
  }