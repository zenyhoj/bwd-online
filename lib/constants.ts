import type { DocumentType } from "@/types/domain";

export const seminarModules = [
  { key: "overview", title: "Water Service Orientation" },
  { key: "requirements", title: "Document Requirements" },
  { key: "inspection", title: "Inspection Guidelines" },
  { key: "payments", title: "Payment Scheduling" }
] as const;

export const applicationDocumentTypes = [
  "owner_valid_id",
  "representative_authorization_letter",
  "representative_valid_id",
  "organization_spa",
  "lot_title",
  "tax_declaration",
  "deed_of_sale",
  "lot_owner_authorization",
  "lot_owner_valid_id",
  "water_permit_receipt"
] as const satisfies readonly DocumentType[];

export type ApplicationDocumentType = (typeof applicationDocumentTypes)[number];

export const documentTypeLabels: Record<ApplicationDocumentType, string> = {
  owner_valid_id: "Photocopy of Valid ID (Owner)",
  representative_authorization_letter: "Authorization Letter from Applicant (Authorized Representative)",
  representative_valid_id: "Photocopy of Valid ID (Authorized Representative)",
  organization_spa: "Special Power of Attorney (SPA for Organization/Establishment Accounts)",
  lot_title: "Lot Title",
  tax_declaration: "Tax Declaration",
  deed_of_sale: "Deed of Sale (if title is not under applicant name)",
  lot_owner_authorization: "Authorization from the Lot and House Owner (If Not Lot Owner)",
  lot_owner_valid_id: "ID of Lot Owner",
  water_permit_receipt: "Official Receipt of Water Permit"
};
