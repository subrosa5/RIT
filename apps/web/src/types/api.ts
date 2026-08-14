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
  created_at: string;
  updated_at: string;
}

export interface InitiativeScoreOut {
  kpi_score: number;
  ai_summary: string;
  possible_duplicate_of: string | null;
}

export interface AnalyticsSummary {
  total_initiatives: number;
  by_status: Record<string, number>;
  by_sphere: { sphere: string; count: number }[];
  by_region: { region: string; count: number }[];
}

export interface ApiErrorBody {
  detail: string;
}
