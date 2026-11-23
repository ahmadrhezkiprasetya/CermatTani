import { KnowledgeDisease, KnowledgeNutrient, RipenessStage } from '../types/cermattani';
import {
  DATASET_DISEASES,
  DATASET_NUTRIENTS,
  DATASET_RIPENESS,
} from './agronomyDataset';

/* Re-ekspor dataset agronomi resmi CermatTani (tanpa preset foto dummy SVG) */
export const RIPENESS_REFERENCE: Record<
  RipenessStage,
  {
    label: string;
    color: string;
    minDays: number;
    maxDays: number;
    anjuran: 'Panen sekarang' | 'Tunggu';
    ringkasan: string;
    sumber: string;
  }
> = DATASET_RIPENESS;

export const KNOWLEDGE_DISEASES: Record<string, KnowledgeDisease> = DATASET_DISEASES;

export const KNOWLEDGE_NUTRIENTS: Record<string, KnowledgeNutrient> = DATASET_NUTRIENTS;
