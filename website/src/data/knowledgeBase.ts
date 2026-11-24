import { KnowledgeDisease, KnowledgeNutrient, RipenessStage } from '../types/cermattani';
import {
  DATASET_DISEASES,
  DATASET_NUTRIENTS,
  DATASET_RIPENESS,
} from './agronomyDataset';

/* Re-ekspor dataset agronomi resmi CermatTani v2.1 (sumber tunggal output scan & chat) */
export const RIPENESS_REFERENCE: Record<
  RipenessStage,
  {
    label: string;
    color: string;
    minDays: number;
    maxDays: number;
    anjuran: 'Panen sekarang' | 'Tunggu';
    ciriVisual: string;
    ringkasan: string;
    penangananPascaPanen: string;
    sumber: string;
  }
> = DATASET_RIPENESS;

export const KNOWLEDGE_DISEASES: Record<string, KnowledgeDisease> = DATASET_DISEASES;

export const KNOWLEDGE_NUTRIENTS: Record<string, KnowledgeNutrient> = DATASET_NUTRIENTS;
