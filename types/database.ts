export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          last_document_export_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          last_document_export_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          last_document_export_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applicants: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          full_name: string;
          gender: string | null;
          age: number | null;
          address: string | null;
          email_address: string | null;
          cellphone_number: string | null;
          purpose_of_seminar: Database["public"]["Enums"]["seminar_purpose"] | null;
          number_of_users: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          full_name: string;
          gender?: string | null;
          age?: number | null;
          address?: string | null;
          email_address?: string | null;
          cellphone_number?: string | null;
          purpose_of_seminar?: Database["public"]["Enums"]["seminar_purpose"] | null;
          number_of_users?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          profile_id?: string;
          full_name?: string;
          gender?: string | null;
          age?: number | null;
          address?: string | null;
          email_address?: string | null;
          cellphone_number?: string | null;
          purpose_of_seminar?: Database["public"]["Enums"]["seminar_purpose"] | null;
          number_of_users?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applicants_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applicants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          customer_type: Database["public"]["Enums"]["customer_type"] | null;
          full_name: string;
          phone: string | null;
          gender: string | null;
          age: number | null;
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          customer_type?: Database["public"]["Enums"]["customer_type"] | null;
          full_name: string;
          phone?: string | null;
          gender?: string | null;
          age?: number | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          customer_type?: Database["public"]["Enums"]["customer_type"] | null;
          full_name?: string;
          phone?: string | null;
          gender?: string | null;
          age?: number | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      seminar_items: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string;
          media_type: string;
          media_url: string | null;
          media_urls: string[] | null;
          display_order: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description: string;
          media_type?: string;
          media_url?: string | null;
          media_urls?: string[] | null;
          display_order?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string;
          media_type?: string;
          media_url?: string | null;
          media_urls?: string[] | null;
          display_order?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seminar_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seminar_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      applicant_seminar_progress: {
        Row: {
          id: string;
          organization_id: string;
          applicant_id: string;
          seminar_item_id: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          applicant_id: string;
          seminar_item_id: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          applicant_id?: string;
          seminar_item_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applicant_seminar_progress_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applicant_seminar_progress_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applicant_seminar_progress_seminar_item_id_fkey";
            columns: ["seminar_item_id"];
            isOneToOne: false;
            referencedRelation: "seminar_items";
            referencedColumns: ["id"];
          }
        ];
      };
      applications: {
        Row: {
          id: string;
          organization_id: string;
          applicant_id: string;
          accredited_plumber_id: string | null;
          cellphone_number: string | null;
          email_address: string | null;
          service_type: Database["public"]["Enums"]["application_service_type"];
          status: Database["public"]["Enums"]["application_status"];
          full_name: string;
          gender: string;
          age: number;
          address: string;
            number_of_users: number;
          concessionaire_classification: Database["public"]["Enums"]["concessionaire_classification"] | null;
            inhouse_installation_scheduled_at: string | null;
          inhouse_installation_scheduled_by: string | null;
          inhouse_installation_completed: boolean;
          inhouse_installation_completed_at: string | null;
          document_submission_mode: string;
          optional_document_types: Database["public"]["Enums"]["document_type"][];
          classified_document_types: Database["public"]["Enums"]["document_type"][];
          document_review_note: string | null;
          inhouse_installation_proof_image_url: string | null;
          inhouse_installation_signed_at: string | null;
          inhouse_installation_updated_by: string | null;
          seminar_completed: boolean;
          submitted_at: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          applicant_id: string;
          accredited_plumber_id?: string | null;
          cellphone_number?: string | null;
          email_address?: string | null;
          service_type: Database["public"]["Enums"]["application_service_type"];
          status?: Database["public"]["Enums"]["application_status"];
          full_name: string;
          gender: string;
          age: number;
          address: string;
            number_of_users: number;
            concessionaire_classification?: Database["public"]["Enums"]["concessionaire_classification"] | null;
            inhouse_installation_scheduled_at?: string | null;
          inhouse_installation_scheduled_by?: string | null;
          inhouse_installation_completed?: boolean;
          inhouse_installation_completed_at?: string | null;
          document_submission_mode?: string;
          optional_document_types?: Database["public"]["Enums"]["document_type"][];
          classified_document_types?: Database["public"]["Enums"]["document_type"][];
          document_review_note?: string | null;
          inhouse_installation_proof_image_url?: string | null;
          inhouse_installation_signed_at?: string | null;
          inhouse_installation_updated_by?: string | null;
          seminar_completed?: boolean;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          applicant_id?: string;
          accredited_plumber_id?: string | null;
          cellphone_number?: string | null;
          email_address?: string | null;
          service_type?: Database["public"]["Enums"]["application_service_type"];
          status?: Database["public"]["Enums"]["application_status"];
          full_name?: string;
          gender?: string;
          age?: number;
          address?: string;
            number_of_users?: number;
            concessionaire_classification?: Database["public"]["Enums"]["concessionaire_classification"] | null;
            inhouse_installation_scheduled_at?: string | null;
          inhouse_installation_scheduled_by?: string | null;
          inhouse_installation_completed?: boolean;
          inhouse_installation_completed_at?: string | null;
          document_submission_mode?: string;
          optional_document_types?: Database["public"]["Enums"]["document_type"][];
          classified_document_types?: Database["public"]["Enums"]["document_type"][];
          document_review_note?: string | null;
          inhouse_installation_proof_image_url?: string | null;
          inhouse_installation_signed_at?: string | null;
          inhouse_installation_updated_by?: string | null;
          seminar_completed?: boolean;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_accredited_plumber_id_fkey";
            columns: ["accredited_plumber_id"];
            isOneToOne: false;
            referencedRelation: "accredited_plumbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_inhouse_installation_scheduled_by_fkey";
            columns: ["inhouse_installation_scheduled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_inhouse_installation_updated_by_fkey";
            columns: ["inhouse_installation_updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      accredited_plumbers: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          license_number: string | null;
          phone: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          license_number?: string | null;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          license_number?: string | null;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accredited_plumbers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accredited_plumbers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      inspectors: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          phone: string | null;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspectors_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspectors_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      seminar_progress: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string;
          applicant_id: string;
          module_key: string;
          module_title: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_id: string;
          applicant_id: string;
          module_key: string;
          module_title: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          application_id?: string;
          applicant_id?: string;
          module_key?: string;
          module_title?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seminar_progress_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seminar_progress_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seminar_progress_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      inspections: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string;
          scheduled_by: string | null;
          registry_inspector_id: string | null;
          inspector_name: string | null;
          scheduled_at: string | null;
          inspected_at: string | null;
          status: Database["public"]["Enums"]["inspection_status"];
          plumbing_approved: boolean | null;
          remarks: string | null;
          material_list: string | null;
          latitude: number | null;
          longitude: number | null;
          plumber_name: string | null;
          reference_account_number: string | null;
          reference_account_name: string | null;
          account_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_id: string;
          scheduled_by?: string | null;
          registry_inspector_id?: string | null;
          inspector_name?: string | null;
          scheduled_at?: string | null;
          inspected_at?: string | null;
          status?: Database["public"]["Enums"]["inspection_status"];
          plumbing_approved?: boolean | null;
          remarks?: string | null;
          material_list?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          plumber_name?: string | null;
          reference_account_number?: string | null;
          reference_account_name?: string | null;
          account_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          application_id?: string;
          scheduled_by?: string | null;
          registry_inspector_id?: string | null;
          inspector_name?: string | null;
          scheduled_at?: string | null;
          inspected_at?: string | null;
          status?: Database["public"]["Enums"]["inspection_status"];
          plumbing_approved?: boolean | null;
          remarks?: string | null;
          material_list?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          plumber_name?: string | null;
          reference_account_number?: string | null;
          reference_account_name?: string | null;
          account_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_registry_inspector_id_fkey";
            columns: ["registry_inspector_id"];
            isOneToOne: false;
            referencedRelation: "inspectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_scheduled_by_fkey";
            columns: ["scheduled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string;
          applicant_id: string;
          document_type: Database["public"]["Enums"]["document_type"];
          file_path: string;
          file_url: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["document_status"];
          reviewer_id: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_id: string;
          applicant_id: string;
          document_type: Database["public"]["Enums"]["document_type"];
          file_path: string;
          file_url: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["document_status"];
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          application_id?: string;
          applicant_id?: string;
          document_type?: Database["public"]["Enums"]["document_type"];
          file_path?: string;
          file_url?: string;
          file_name?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["document_status"];
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      document_verification_audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string;
          applicant_id: string;
          applicant_name: string;
          admin_account_id: string;
          admin_account_name: string;
          date_verified: string;
          list_of_verified_documents: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_id: string;
          applicant_id: string;
          applicant_name: string;
          admin_account_id: string;
          admin_account_name: string;
          date_verified?: string;
          list_of_verified_documents?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          application_id?: string;
          applicant_id?: string;
          applicant_name?: string;
          admin_account_id?: string;
          admin_account_name?: string;
          date_verified?: string;
          list_of_verified_documents?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_verification_audit_logs_admin_account_id_fkey";
            columns: ["admin_account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_verification_audit_logs_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_verification_audit_logs_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_verification_audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string;
          scheduled_by: string | null;
          payment_type: Database["public"]["Enums"]["payment_type"];
          amount: number;
          due_date: string;
          office_payment_at: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          paid_at: string | null;
          official_receipt_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_id: string;
          scheduled_by?: string | null;
          payment_type: Database["public"]["Enums"]["payment_type"];
          amount: number;
          due_date: string;
          office_payment_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          paid_at?: string | null;
          official_receipt_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          application_id?: string;
          scheduled_by?: string | null;
          payment_type?: Database["public"]["Enums"]["payment_type"];
          amount?: number;
          due_date?: string;
          office_payment_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          paid_at?: string | null;
          official_receipt_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_scheduled_by_fkey";
            columns: ["scheduled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      concessionaires: {
        Row: {
          id: string;
          organization_id: string;
          application_id: string | null;
          applicant_id: string | null;
          concessionaire_number: string;
          connection_date: string;
          meter_number: string | null;
          account_status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_id: string | null;
          applicant_id: string | null;
          concessionaire_number: string;
          connection_date: string;
          meter_number?: string | null;
          account_status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          application_id?: string;
          applicant_id?: string;
          concessionaire_number?: string;
          connection_date?: string;
          meter_number?: string | null;
          account_status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "concessionaires_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: true;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "concessionaires_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "concessionaires_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "concessionaires_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "applicants";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    
      water_bills: {
        Row: {
          id: string;
          organization_id: string;
          concessionaire_id: string;
          account_number: string;
          account_name: string;
          address: string | null;
          amount: number;
          amount_after_duedate: number | null;
          due_date: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          concessionaire_id: string;
          account_number: string;
          account_name: string;
          address?: string | null;
          amount: number;
          amount_after_duedate?: number | null;
          due_date: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          concessionaire_id?: string;
          account_number?: string;
          account_name?: string;
          address?: string | null;
          amount?: number;
          amount_after_duedate?: number | null;
          due_date?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "water_bills_concessionaire_id_fkey";
            columns: ["concessionaire_id"];
            isOneToOne: false;
            referencedRelation: "concessionaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "water_bills_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "applicant" | "admin" | "inspector";
      concessionaire_classification:
        | "residential"
        | "commercial_c"
        | "industrial"
        | "commercial_b"
        | "commercial_c_1"
        | "commercial"
        | "commercial_a"
        | "government"
        | "special"
        | "bulksale"
        | "unbilled"
        | "special_2"
        | "government_2";
      customer_type: "residential" | "commercial" | "government" | "industrial" | "others";
      application_service_type: "new_connection" | "reconnection";
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "inspection_scheduled"
        | "inspection_completed"
        | "documents_verified"
        | "payment_scheduled"
        | "approved"
        | "rejected"
        | "converted";
      inspection_status: "scheduled" | "in_progress" | "approved" | "rejected" | "rescheduled";
      document_type:
        | "tax_declaration_title"
        | "authorization_letter"
        | "water_permit"
        | "valid_id"
        | "authorized_representative"
        | "proof_of_ownership"
        | "owner_valid_id"
        | "representative_authorization_letter"
        | "representative_valid_id"
        | "organization_spa"
        | "lot_title"
        | "tax_declaration"
        | "deed_of_sale"
        | "lot_owner_authorization"
        | "lot_owner_valid_id"
        | "water_permit_receipt";
      document_status: "pending" | "verified" | "rejected";
      payment_status: "scheduled" | "paid" | "overdue" | "cancelled";
      payment_type: "inspection_fee" | "connection_fee" | "materials" | "other";
      seminar_purpose: "new_service" | "reconnection" | "change_name" | "others";
    };
    CompositeTypes: Record<string, never>;
  };
};
