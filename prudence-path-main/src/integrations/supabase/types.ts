export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_comments: {
        Row: {
          activity_id: string
          author_user_id: string
          comment: string
          created_at: string
          id: string
          office_id: string
        }
        Insert: {
          activity_id: string
          author_user_id: string
          comment: string
          created_at?: string
          id?: string
          office_id: string
        }
        Update: {
          activity_id?: string
          author_user_id?: string
          comment?: string
          created_at?: string
          id?: string
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "daily_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_section_verifications: {
        Row: {
          activity_id: string
          feedback: string | null
          id: string
          office_id: string
          section: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          activity_id: string
          feedback?: string | null
          id?: string
          office_id: string
          section: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          activity_id?: string
          feedback?: string | null
          id?: string
          office_id?: string
          section?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_section_verifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "daily_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_section_verifications_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activities: {
        Row: {
          account_country: string | null
          account_creation_date: string | null
          account_links: string[] | null
          account_notes: string | null
          account_platform: string | null
          account_proof_images: string[] | null
          account_service: string | null
          accounts_created: number | null
          activity_date: string
          cancelled_order_amount_received: number | null
          cancelled_orders_count: number | null
          created_at: string
          daily_contacts: number | null
          delivery_days: number | null
          expected_conversions: number | null
          fiverr_fee: number | null
          follow_ups: number | null
          gig_link: string | null
          gig_links: string[] | null
          gig_notes: string | null
          gig_platform: string | null
          gig_proof_images: string[] | null
          gig_service: string | null
          gigs_created: number | null
          gross_income: number | null
          id: string
          income_platform: string | null
          is_practical: boolean | null
          is_theory: boolean | null
          is_verified: boolean | null
          net_income: number | null
          new_things_learned: string | null
          office_id: string
          order_type: string | null
          other_activities: string | null
          other_activities_proof_image: string | null
          other_activities_proof_images: string[] | null
          outside_payment_method: string | null
          outside_payment_method_other: string | null
          pages_read: number | null
          payment_type: string | null
          prospecting_proof_images: string[] | null
          reading_notes: string | null
          reading_proof_image: string | null
          reading_proof_images: string[] | null
          skill_description: string | null
          skill_learned: string | null
          skill_proof_image: string | null
          skill_proof_images: string[] | null
          skill_taught: string | null
          students_trained: number | null
          submission_tags: string[] | null
          submissions_reviewed: number | null
          submitted_at: string | null
          training_duration_minutes: number | null
          updated_at: string
          user_id: string
          verification_feedback: string | null
          verified_at: string | null
          verified_by: string | null
          work_type: string | null
        }
        Insert: {
          account_country?: string | null
          account_creation_date?: string | null
          account_links?: string[] | null
          account_notes?: string | null
          account_platform?: string | null
          account_proof_images?: string[] | null
          account_service?: string | null
          accounts_created?: number | null
          activity_date?: string
          cancelled_order_amount_received?: number | null
          cancelled_orders_count?: number | null
          created_at?: string
          daily_contacts?: number | null
          delivery_days?: number | null
          expected_conversions?: number | null
          fiverr_fee?: number | null
          follow_ups?: number | null
          gig_link?: string | null
          gig_links?: string[] | null
          gig_notes?: string | null
          gig_platform?: string | null
          gig_proof_images?: string[] | null
          gig_service?: string | null
          gigs_created?: number | null
          gross_income?: number | null
          id?: string
          income_platform?: string | null
          is_practical?: boolean | null
          is_theory?: boolean | null
          is_verified?: boolean | null
          net_income?: number | null
          new_things_learned?: string | null
          office_id: string
          order_type?: string | null
          other_activities?: string | null
          other_activities_proof_image?: string | null
          other_activities_proof_images?: string[] | null
          outside_payment_method?: string | null
          outside_payment_method_other?: string | null
          pages_read?: number | null
          payment_type?: string | null
          prospecting_proof_images?: string[] | null
          reading_notes?: string | null
          reading_proof_image?: string | null
          reading_proof_images?: string[] | null
          skill_description?: string | null
          skill_learned?: string | null
          skill_proof_image?: string | null
          skill_proof_images?: string[] | null
          skill_taught?: string | null
          students_trained?: number | null
          submission_tags?: string[] | null
          submissions_reviewed?: number | null
          submitted_at?: string | null
          training_duration_minutes?: number | null
          updated_at?: string
          user_id: string
          verification_feedback?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_type?: string | null
        }
        Update: {
          account_country?: string | null
          account_creation_date?: string | null
          account_links?: string[] | null
          account_notes?: string | null
          account_platform?: string | null
          account_proof_images?: string[] | null
          account_service?: string | null
          accounts_created?: number | null
          activity_date?: string
          cancelled_order_amount_received?: number | null
          cancelled_orders_count?: number | null
          created_at?: string
          daily_contacts?: number | null
          delivery_days?: number | null
          expected_conversions?: number | null
          fiverr_fee?: number | null
          follow_ups?: number | null
          gig_link?: string | null
          gig_links?: string[] | null
          gig_notes?: string | null
          gig_platform?: string | null
          gig_proof_images?: string[] | null
          gig_service?: string | null
          gigs_created?: number | null
          gross_income?: number | null
          id?: string
          income_platform?: string | null
          is_practical?: boolean | null
          is_theory?: boolean | null
          is_verified?: boolean | null
          net_income?: number | null
          new_things_learned?: string | null
          office_id?: string
          order_type?: string | null
          other_activities?: string | null
          other_activities_proof_image?: string | null
          other_activities_proof_images?: string[] | null
          outside_payment_method?: string | null
          outside_payment_method_other?: string | null
          pages_read?: number | null
          payment_type?: string | null
          prospecting_proof_images?: string[] | null
          reading_notes?: string | null
          reading_proof_image?: string | null
          reading_proof_images?: string[] | null
          skill_description?: string | null
          skill_learned?: string | null
          skill_proof_image?: string | null
          skill_proof_images?: string[] | null
          skill_taught?: string | null
          students_trained?: number | null
          submission_tags?: string[] | null
          submissions_reviewed?: number | null
          submitted_at?: string | null
          training_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
          verification_feedback?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_activities_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_todo_logs: {
        Row: {
          created_at: string
          daily_todo_id: string | null
          id: string
          office_id: string
          plan: string
          todo_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_todo_id?: string | null
          id?: string
          office_id: string
          plan: string
          todo_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_todo_id?: string | null
          id?: string
          office_id?: string
          plan?: string
          todo_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_todo_logs_daily_todo_id_fkey"
            columns: ["daily_todo_id"]
            isOneToOne: false
            referencedRelation: "daily_todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_todo_logs_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_todos: {
        Row: {
          created_at: string
          id: string
          office_id: string
          plan: string
          todo_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_id: string
          plan?: string
          todo_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          office_id?: string
          plan?: string
          todo_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_todos_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          office_id: string
          trainer_id: string | null
          trainer_ids: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          office_id: string
          trainer_id?: string | null
          trainer_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          office_id?: string
          trainer_id?: string | null
          trainer_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          actual_accounts: number | null
          actual_contacts: number | null
          actual_conversions: number | null
          actual_gigs: number | null
          actual_income: number | null
          actual_pages: number | null
          actual_tags: number | null
          actual_things_learned: string | null
          consistency_score: number | null
          created_at: string
          goal_book_image: string | null
          goal_book_images: string[]
          goals_submitted_at: string | null
          id: string
          income_summary: string | null
          month_year: string
          office_id: string
          skill_progress_notes: string | null
          target_accounts: number | null
          target_contacts: number | null
          target_conversions: number | null
          target_gigs: number | null
          target_income: number | null
          target_pages: number | null
          target_tags: number | null
          things_to_learn: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_accounts?: number | null
          actual_contacts?: number | null
          actual_conversions?: number | null
          actual_gigs?: number | null
          actual_income?: number | null
          actual_pages?: number | null
          actual_tags?: number | null
          actual_things_learned?: string | null
          consistency_score?: number | null
          created_at?: string
          goal_book_image?: string | null
          goal_book_images?: string[]
          goals_submitted_at?: string | null
          id?: string
          income_summary?: string | null
          month_year: string
          office_id: string
          skill_progress_notes?: string | null
          target_accounts?: number | null
          target_contacts?: number | null
          target_conversions?: number | null
          target_gigs?: number | null
          target_income?: number | null
          target_pages?: number | null
          target_tags?: number | null
          things_to_learn?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_accounts?: number | null
          actual_contacts?: number | null
          actual_conversions?: number | null
          actual_gigs?: number | null
          actual_income?: number | null
          actual_pages?: number | null
          actual_tags?: number | null
          actual_things_learned?: string | null
          consistency_score?: number | null
          created_at?: string
          goal_book_image?: string | null
          goal_book_images?: string[]
          goals_submitted_at?: string | null
          id?: string
          income_summary?: string | null
          month_year?: string
          office_id?: string
          skill_progress_notes?: string | null
          target_accounts?: number | null
          target_contacts?: number | null
          target_conversions?: number | null
          target_gigs?: number | null
          target_income?: number | null
          target_pages?: number | null
          target_tags?: number | null
          things_to_learn?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_goals_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          office_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          office_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          office_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_applications: {
        Row: {
          admin_notes: string | null
          contact_email: string
          contact_name: string
          country: string
          created_at: string
          id: string
          organization_name: string
          provisioned_office_id: string | null
          status: string
          team_size: string
          updated_at: string
          use_case: string
        }
        Insert: {
          admin_notes?: string | null
          contact_email: string
          contact_name: string
          country?: string
          created_at?: string
          id?: string
          organization_name: string
          provisioned_office_id?: string | null
          status?: string
          team_size: string
          updated_at?: string
          use_case: string
        }
        Update: {
          admin_notes?: string | null
          contact_email?: string
          contact_name?: string
          country?: string
          created_at?: string
          id?: string
          organization_name?: string
          provisioned_office_id?: string | null
          status?: string
          team_size?: string
          updated_at?: string
          use_case?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_applications_provisioned_office_id_fkey"
            columns: ["provisioned_office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_content_meta: {
        Row: {
          extra: Json
          footer_text: string | null
          notice_text: string | null
          office_id: string
          page: string
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          extra?: Json
          footer_text?: string | null
          notice_text?: string | null
          office_id: string
          page: string
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          extra?: Json
          footer_text?: string | null
          notice_text?: string | null
          office_id?: string
          page?: string
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_content_meta_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_pro_requirements: {
        Row: {
          created_at: string
          description: string | null
          details: string[]
          icon_key: string
          id: string
          office_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          details?: string[]
          icon_key?: string
          id?: string
          office_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          details?: string[]
          icon_key?: string
          id?: string
          office_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_pro_requirements_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_rule_sections: {
        Row: {
          category: string
          created_at: string
          id: string
          items: string[]
          office_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          items?: string[]
          office_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          items?: string[]
          office_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_rule_sections_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_timetable_slots: {
        Row: {
          activity: string
          created_at: string
          description: string | null
          id: string
          office_id: string
          sort_order: number
          time_label: string
          updated_at: string
        }
        Insert: {
          activity: string
          created_at?: string
          description?: string | null
          id?: string
          office_id: string
          sort_order?: number
          time_label: string
          updated_at?: string
        }
        Update: {
          activity?: string
          created_at?: string
          description?: string | null
          id?: string
          office_id?: string
          sort_order?: number
          time_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_timetable_slots_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          assigned_group_id: string | null
          assigned_trainer_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          office_id: string
          sponsor_username: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assigned_group_id?: string | null
          assigned_trainer_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          office_id: string
          sponsor_username?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assigned_group_id?: string | null
          assigned_trainer_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          office_id?: string
          sponsor_username?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_image_hashes: {
        Row: {
          activity_date: string
          activity_id: string | null
          content_hash: string
          created_at: string
          hash_algorithm: string
          id: string
          office_id: string
          perceptual_hash: string | null
          proof_type: string
          storage_path: string
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_id?: string | null
          content_hash: string
          created_at?: string
          hash_algorithm?: string
          id?: string
          office_id: string
          perceptual_hash?: string | null
          proof_type: string
          storage_path: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_id?: string | null
          content_hash?: string
          created_at?: string
          hash_algorithm?: string
          id?: string
          office_id?: string
          perceptual_hash?: string | null
          proof_type?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_image_hashes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "daily_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_image_hashes_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          name: string
          office_id: string
          outcomes: string | null
          overview: string | null
          practical: string | null
          theory: string | null
          tools: string | null
          trainers: string[] | null
          training_plan_pdf_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          name: string
          office_id: string
          outcomes?: string | null
          overview?: string | null
          practical?: string | null
          theory?: string | null
          tools?: string | null
          trainers?: string[] | null
          training_plan_pdf_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          name?: string
          office_id?: string
          outcomes?: string | null
          overview?: string | null
          practical?: string | null
          theory?: string | null
          tools?: string | null
          trainers?: string[] | null
          training_plan_pdf_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          id: string
          image_paths: string[] | null
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_paths?: string[] | null
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_paths?: string[] | null
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          office_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          office_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string
          id: string
          office_id: string
          skill_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          office_id: string
          skill_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          office_id?: string
          skill_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          challenges: string | null
          consistency_score: number | null
          created_at: string
          goals_next_week: string | null
          id: string
          lessons_learned: string | null
          office_id: string
          submission_count: number | null
          things_learned_summary: string | null
          total_accounts_created: number | null
          total_contacts: number | null
          total_expected_conversions: number | null
          total_follow_ups: number | null
          total_gigs_created: number | null
          total_gross_income: number | null
          total_net_income: number | null
          total_pages_read: number | null
          total_tags: number | null
          trainer_feedback: string | null
          trainer_id: string | null
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          consistency_score?: number | null
          created_at?: string
          goals_next_week?: string | null
          id?: string
          lessons_learned?: string | null
          office_id: string
          submission_count?: number | null
          things_learned_summary?: string | null
          total_accounts_created?: number | null
          total_contacts?: number | null
          total_expected_conversions?: number | null
          total_follow_ups?: number | null
          total_gigs_created?: number | null
          total_gross_income?: number | null
          total_net_income?: number | null
          total_pages_read?: number | null
          total_tags?: number | null
          trainer_feedback?: string | null
          trainer_id?: string | null
          updated_at?: string
          user_id: string
          week_end_date: string
          week_start_date: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          consistency_score?: number | null
          created_at?: string
          goals_next_week?: string | null
          id?: string
          lessons_learned?: string | null
          office_id?: string
          submission_count?: number | null
          things_learned_summary?: string | null
          total_accounts_created?: number | null
          total_contacts?: number | null
          total_expected_conversions?: number | null
          total_follow_ups?: number | null
          total_gigs_created?: number | null
          total_gross_income?: number | null
          total_net_income?: number | null
          total_pages_read?: number | null
          total_tags?: number | null
          trainer_feedback?: string | null
          trainer_id?: string | null
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_start_date?: string
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_can_access_user: {
        Args: { p_admin_id: string; p_target_user_id: string }
        Returns: boolean
      }
      calculate_monthly_actuals: {
        Args: { p_month_year: string; p_user_id: string }
        Returns: string
      }
      can_view_activity: {
        Args: { _activity_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_proof_image_hash: {
        Args: { p_content_hash: string }
        Returns: {
          activity_date: string
          is_duplicate: boolean
          proof_type: string
        }[]
      }
      cleanup_stale_unconfirmed_users: {
        Args: { p_max_age_hours?: number }
        Returns: number
      }
      clone_office_content: {
        Args: { p_source_office_id: string; p_target_office_id: string }
        Returns: undefined
      }
      create_system_sponsor: { Args: never; Returns: undefined }
      generate_weekly_report: {
        Args: { p_user_id: string; p_week_start_date: string }
        Returns: string
      }
      get_audit_events: {
        Args: {
          p_actor_user_id?: string
          p_limit?: number
          p_operation?: string
          p_since?: string
          p_table_name?: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "event_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_office_id_by_slug: { Args: { p_slug: string }; Returns: string }
      get_or_generate_monthly_goal: {
        Args: { p_month_year?: string; p_user_id: string }
        Returns: {
          actual_accounts: number
          actual_contacts: number
          actual_conversions: number
          actual_gigs: number
          actual_income: number
          actual_pages: number
          actual_tags: number
          actual_things_learned: string
          consistency_score: number
          created_at: string
          goal_book_image: string
          goal_book_images: string[]
          goals_submitted_at: string
          id: string
          income_summary: string
          month_year: string
          skill_progress_notes: string
          target_accounts: number
          target_contacts: number
          target_conversions: number
          target_gigs: number
          target_income: number
          target_pages: number
          target_tags: number
          things_to_learn: string
          updated_at: string
          user_id: string
        }[]
      }
      get_or_generate_weekly_report: {
        Args: { p_user_id: string }
        Returns: {
          challenges: string
          consistency_score: number
          created_at: string
          goals_next_week: string
          id: string
          lessons_learned: string
          submission_count: number
          total_accounts_created: number
          total_contacts: number
          total_follow_ups: number
          total_gigs_created: number
          total_gross_income: number
          total_net_income: number
          total_pages_read: number
          trainer_feedback: string
          trainer_id: string
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
          wins: string
        }[]
      }
      get_or_generate_weekly_report_for_week: {
        Args: { p_user_id: string; p_week_start_date: string }
        Returns: {
          challenges: string
          consistency_score: number
          created_at: string
          goals_next_week: string
          id: string
          lessons_learned: string
          submission_count: number
          things_learned_summary: string
          total_accounts_created: number
          total_contacts: number
          total_expected_conversions: number
          total_follow_ups: number
          total_gigs_created: number
          total_gross_income: number
          total_net_income: number
          total_pages_read: number
          total_tags: number
          trainer_feedback: string
          trainer_id: string
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
          wins: string
        }[]
      }
      get_sponsor_downlines: {
        Args: { p_sponsor_user_id: string }
        Returns: {
          depth: number
          sponsor_username: string
          user_id: string
          username: string
        }[]
      }
      get_user_office_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_sponsor_in_office: {
        Args: { p_office_id: string; p_sponsor_username: string }
        Returns: boolean
      }
      is_submission_locked: {
        Args: { p_activity_date: string }
        Returns: boolean
      }
      is_today_submission_locked: { Args: never; Returns: boolean }
      is_todo_date_editable: { Args: { p_todo_date: string }; Returns: boolean }
      is_username_available: {
        Args: { p_office_id?: string; p_username: string }
        Returns: boolean
      }
      nigeria_week_start: { Args: { p_date: string }; Returns: string }
      pro_can_access_user: {
        Args: { _pro_id: string; _target_user_id: string }
        Returns: boolean
      }
      promote_to_super_admin: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      provision_office_from_application: {
        Args: { p_application_id: string; p_slug?: string }
        Returns: Json
      }
      slugify_office_name: { Args: { p_name: string }; Returns: string }
      sponsor_can_access_user: {
        Args: { _sponsor_user_id: string; _target_user_id: string }
        Returns: boolean
      }
      user_can_access_office: {
        Args: { p_office_id: string }
        Returns: boolean
      }
      user_is_office_admin: {
        Args: { p_office_id?: string; p_user_id: string }
        Returns: boolean
      }
      user_is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      users_share_office: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "trainer"
        | "pro"
        | "sponsor"
        | "member"
        | "office_admin"
      approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "trainer",
        "pro",
        "sponsor",
        "member",
        "office_admin",
      ],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
