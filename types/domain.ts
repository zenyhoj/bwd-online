import type { Database } from "@/types/database";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type ApplicationServiceType = Database["public"]["Enums"]["application_service_type"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentStatus = Database["public"]["Enums"]["document_status"];
export type DocumentType = Database["public"]["Enums"]["document_type"];
export type Inspection = Database["public"]["Tables"]["inspections"]["Row"];
export type InspectionStatus = Database["public"]["Enums"]["inspection_status"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PaymentType = Database["public"]["Enums"]["payment_type"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AccreditedPlumber = Database["public"]["Tables"]["accredited_plumbers"]["Row"];
export type InspectorRecord = Database["public"]["Tables"]["inspectors"]["Row"];
export type SeminarItem = Database["public"]["Tables"]["seminar_items"]["Row"];
export type ApplicantSeminarProgress = Database["public"]["Tables"]["applicant_seminar_progress"]["Row"];
export type SeminarProgress = Database["public"]["Tables"]["seminar_progress"]["Row"];
export type Concessionaire = Database["public"]["Tables"]["concessionaires"]["Row"];

export type ApplicationWithRelations = Application & {
  inspections?: Inspection[];
  documents?: Document[];
  payments?: Payment[];
  concessionaires?: Concessionaire[];
  water_meter_installation_scheduled_at?: string | null;
  water_meter_installed_at?: string | null;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
