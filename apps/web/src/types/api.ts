export type Role = "analyst" | "curator" | "admin";
export type InitiativeStatus = "draft" | "in_review" | "recommended" | "rejected";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Region {
  id: string;
  name: string;
  federal_district: string | null;
}

export interface ScoreFactor {
  label: string;
  detail: string;
  points: number;
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  sphere: string;
  status: InitiativeStatus;
  region: Region;
  author: User;
  kpi_score: number | null;
  ai_summary: string | null;
  score_factors: ScoreFactor[] | null;
  created_at: string;
  updated_at: string;
}

export interface InitiativeScoreOut {
  kpi_score: number;
  ai_summary: string;
  factors: ScoreFactor[];
  possible_duplicate_of: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor_name: string;
  detail: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_initiatives: number;
  scored_count: number;
  avg_kpi_score: number | null;
  by_status: Record<string, number>;
  by_sphere: { sphere: string; count: number }[];
  by_region: { region: string; count: number }[];
  score_distribution: { bucket: string; count: number }[];
}

export interface ApiErrorBody {
  detail: string;
}
