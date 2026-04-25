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
      account_chart: {
        Row: {
          account_type: string
          active: boolean
          code: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          parent_code: string | null
        }
        Insert: {
          account_type: string
          active?: boolean
          code: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          parent_code?: string | null
        }
        Update: {
          account_type?: string
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          parent_code?: string | null
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          created_at: string
          current_number: number
          id: string
          is_closed: boolean
          journal_name: string
          year: number
        }
        Insert: {
          created_at?: string
          current_number?: number
          id?: string
          is_closed?: boolean
          journal_name?: string
          year: number
        }
        Update: {
          created_at?: string
          current_number?: number
          id?: string
          is_closed?: boolean
          journal_name?: string
          year?: number
        }
        Relationships: []
      }
      acquisition_channels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      after_sale_tickets: {
        Row: {
          created_at: string
          id: string
          request_date: string
          requested_by: string
          requested_by_name: string | null
          task_description: string
          updated_at: string
          validated_by: string | null
          validation_date: string | null
          validation_status: Database["public"]["Enums"]["validation_status"]
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_date?: string
          requested_by: string
          requested_by_name?: string | null
          task_description: string
          updated_at?: string
          validated_by?: string | null
          validation_date?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_date?: string
          requested_by?: string
          requested_by_name?: string | null
          task_description?: string
          updated_at?: string
          validated_by?: string | null
          validation_date?: string | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "after_sale_tickets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          category: string
          created_at: string
          data_source: string | null
          description: string
          estimated_impact: string | null
          id: string
          metadata: Json | null
          recommended_action: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          data_source?: string | null
          description?: string
          estimated_impact?: string | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          data_source?: string | null
          description?: string
          estimated_impact?: string | null
          id?: string
          metadata?: Json | null
          recommended_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_name: string | null
          created_at: string
          entity_type: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          summary: string | null
          table_name: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          created_at?: string
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          summary?: string | null
          table_name: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          created_at?: string
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          summary?: string | null
          table_name?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          bank_name: string
          created_at: string
          iban: string
          id: string
          initial_balance: number
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_name: string
          bank_name: string
          created_at?: string
          iban: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_name?: string
          bank_name?: string
          created_at?: string
          iban?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bank_movements: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          description: string
          id: string
          is_reconciled: boolean
          movement_date: string
          movement_type: string
          reconciled_cash_movement_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          description: string
          id?: string
          is_reconciled?: boolean
          movement_date: string
          movement_type: string
          reconciled_cash_movement_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          description?: string
          id?: string
          is_reconciled?: boolean
          movement_date?: string
          movement_type?: string
          reconciled_cash_movement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_movements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_movements_reconciled_cash_movement_id_fkey"
            columns: ["reconciled_cash_movement_id"]
            isOneToOne: false
            referencedRelation: "cash_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          acquisition_channel_id: string | null
          active: boolean
          address: string | null
          cif: string | null
          city: string | null
          client_code: string | null
          client_type: string
          company_name: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          dni: string | null
          email: string | null
          fiscal_address: string | null
          iban: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          is_buyer: boolean
          is_seller: boolean
          last_name: string | null
          name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          type_changed_at: string | null
          updated_at: string
          vat_regime: string | null
        }
        Insert: {
          acquisition_channel_id?: string | null
          active?: boolean
          address?: string | null
          cif?: string | null
          city?: string | null
          client_code?: string | null
          client_type?: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          dni?: string | null
          email?: string | null
          fiscal_address?: string | null
          iban?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_buyer?: boolean
          is_seller?: boolean
          last_name?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          type_changed_at?: string | null
          updated_at?: string
          vat_regime?: string | null
        }
        Update: {
          acquisition_channel_id?: string | null
          active?: boolean
          address?: string | null
          cif?: string | null
          city?: string | null
          client_code?: string | null
          client_type?: string
          company_name?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          dni?: string | null
          email?: string | null
          fiscal_address?: string | null
          iban?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_buyer?: boolean
          is_seller?: boolean
          last_name?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          type_changed_at?: string | null
          updated_at?: string
          vat_regime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyers_acquisition_channel_id_fkey"
            columns: ["acquisition_channel_id"]
            isOneToOne: false
            referencedRelation: "acquisition_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_categories: {
        Row: {
          active: boolean
          category_type: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          category_type: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          category_type?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          id: string
          is_system_generated: boolean
          movement_date: string
          movement_reason: string
          movement_type: string
          notes: string | null
          origin_id: string | null
          origin_type: string
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_system_generated?: boolean
          movement_date?: string
          movement_reason?: string
          movement_type: string
          notes?: string | null
          origin_id?: string | null
          origin_type: string
          payment_method: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_system_generated?: boolean
          movement_date?: string
          movement_reason?: string
          movement_type?: string
          notes?: string | null
          origin_id?: string | null
          origin_type?: string
          payment_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_session_movements: {
        Row: {
          amount: number
          category: string
          category_id: string | null
          client_id: string | null
          concept: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          movement_datetime: string
          movement_type: string
          notes: string | null
          payment_method: string
          session_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          category_id?: string | null
          client_id?: string | null
          concept: string
          created_at?: string
          created_by: string
          created_by_name?: string
          id?: string
          movement_datetime?: string
          movement_type: string
          notes?: string | null
          payment_method: string
          session_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string | null
          client_id?: string | null
          concept?: string
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          movement_datetime?: string
          movement_type?: string
          notes?: string | null
          payment_method?: string
          session_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_session_movements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cash_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          cash_expense: number | null
          cash_income: number | null
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          closing_balance: number | null
          closing_notes: string | null
          counted_balance: number | null
          created_at: string
          difference: number | null
          discrepancy_comment: string | null
          discrepancy_reason: string | null
          expected_balance: number | null
          general_review_status: string | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opened_by_name: string
          opening_balance: number
          requires_review: boolean
          review_status: string | null
          session_date: string
          settlement_status: string | null
          status: string
          total_tpv: number | null
          tpv_difference: number | null
          tpv_discrepancy_comment: string | null
          tpv_discrepancy_reason: string | null
          tpv_status: string | null
          tpv_terminal_total: number | null
          updated_at: string
        }
        Insert: {
          cash_expense?: number | null
          cash_income?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: string | null
          closing_balance?: number | null
          closing_notes?: string | null
          counted_balance?: number | null
          created_at?: string
          difference?: number | null
          discrepancy_comment?: string | null
          discrepancy_reason?: string | null
          expected_balance?: number | null
          general_review_status?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opened_by_name?: string
          opening_balance: number
          requires_review?: boolean
          review_status?: string | null
          session_date?: string
          settlement_status?: string | null
          status?: string
          total_tpv?: number | null
          tpv_difference?: number | null
          tpv_discrepancy_comment?: string | null
          tpv_discrepancy_reason?: string | null
          tpv_status?: string | null
          tpv_terminal_total?: number | null
          updated_at?: string
        }
        Update: {
          cash_expense?: number | null
          cash_income?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: string | null
          closing_balance?: number | null
          closing_notes?: string | null
          counted_balance?: number | null
          created_at?: string
          difference?: number | null
          discrepancy_comment?: string | null
          discrepancy_reason?: string | null
          expected_balance?: number | null
          general_review_status?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opened_by_name?: string
          opening_balance?: number
          requires_review?: boolean
          review_status?: string | null
          session_date?: string
          settlement_status?: string | null
          status?: string
          total_tpv?: number | null
          tpv_difference?: number | null
          tpv_discrepancy_comment?: string | null
          tpv_discrepancy_reason?: string | null
          tpv_status?: string | null
          tpv_terminal_total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      commercial_activities: {
        Row: {
          activity_date: string
          buyer_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          channel: string
          created_at: string
          demand_id: string | null
          follow_up_date: string | null
          follow_up_days: number | null
          id: string
          observations: string
          reservation_id: string | null
          result: string
          sale_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
          user_name: string
          vehicle_id: string | null
        }
        Insert: {
          activity_date?: string
          buyer_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          channel: string
          created_at?: string
          demand_id?: string | null
          follow_up_date?: string | null
          follow_up_days?: number | null
          id?: string
          observations: string
          reservation_id?: string | null
          result: string
          sale_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
          user_name?: string
          vehicle_id?: string | null
        }
        Update: {
          activity_date?: string
          buyer_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          channel?: string
          created_at?: string
          demand_id?: string | null
          follow_up_date?: string | null
          follow_up_days?: number | null
          id?: string
          observations?: string
          reservation_id?: string | null
          result?: string
          sale_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_activities_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_levels: {
        Row: {
          bonus_multiplier: number
          created_at: string | null
          created_by: string
          id: string
          lead_priority: number
          min_points: number
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          bonus_multiplier?: number
          created_at?: string | null
          created_by: string
          id?: string
          lead_priority?: number
          min_points?: number
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          bonus_multiplier?: number
          created_at?: string | null
          created_by?: string
          id?: string
          lead_priority?: number
          min_points?: number
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          created_at: string
          email: string | null
          iban: string | null
          id: string
          legal_text: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          tax_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          legal_text?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          legal_text?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      demands: {
        Row: {
          brand_preferences: string[]
          buyer_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          commercial_notes: string | null
          converted_at: string | null
          converted_sale_id: string | null
          created_at: string
          down_payment: number | null
          fuel_types: string[]
          has_trade_in: boolean
          id: string
          intention_level: string
          km_max: number | null
          max_budget: number | null
          model_preferences: string[]
          needs_financing: boolean
          preferred_color: string | null
          price_max: number | null
          price_min: number | null
          required_extras: string | null
          segment_id: string | null
          status: string
          trade_in_notes: string | null
          transmission: string | null
          updated_at: string
          user_id: string
          user_name: string
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          brand_preferences?: string[]
          buyer_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          commercial_notes?: string | null
          converted_at?: string | null
          converted_sale_id?: string | null
          created_at?: string
          down_payment?: number | null
          fuel_types?: string[]
          has_trade_in?: boolean
          id?: string
          intention_level?: string
          km_max?: number | null
          max_budget?: number | null
          model_preferences?: string[]
          needs_financing?: boolean
          preferred_color?: string | null
          price_max?: number | null
          price_min?: number | null
          required_extras?: string | null
          segment_id?: string | null
          status?: string
          trade_in_notes?: string | null
          transmission?: string | null
          updated_at?: string
          user_id: string
          user_name?: string
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          brand_preferences?: string[]
          buyer_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          commercial_notes?: string | null
          converted_at?: string | null
          converted_sale_id?: string | null
          created_at?: string
          down_payment?: number | null
          fuel_types?: string[]
          has_trade_in?: boolean
          id?: string
          intention_level?: string
          km_max?: number | null
          max_budget?: number | null
          model_preferences?: string[]
          needs_financing?: boolean
          preferred_color?: string | null
          price_max?: number | null
          price_min?: number | null
          required_extras?: string | null
          segment_id?: string | null
          status?: string
          trade_in_notes?: string | null
          transmission?: string | null
          updated_at?: string
          user_id?: string
          user_name?: string
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demands_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_converted_sale_id_fkey"
            columns: ["converted_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "vehicle_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_size: number | null
          file_url: string
          filename: string
          id: string
          mime_type: string | null
          uploaded_by: string
          uploaded_by_name: string
          vehicle_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          mime_type?: string | null
          uploaded_by: string
          uploaded_by_name?: string
          vehicle_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string
          uploaded_by_name?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          body_html: string
          body_json: Json
          created_at: string
          id: string
          list_id: string | null
          name: string
          preview_text: string
          recipient_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string
          body_json?: Json
          created_at?: string
          id?: string
          list_id?: string | null
          name: string
          preview_text?: string
          recipient_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          body_json?: Json
          created_at?: string
          id?: string
          list_id?: string | null
          name?: string
          preview_text?: string
          recipient_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contact_list_members: {
        Row: {
          added_at: string
          buyer_id: string | null
          email: string
          id: string
          list_id: string
          name: string
        }
        Insert: {
          added_at?: string
          buyer_id?: string | null
          email: string
          id?: string
          list_id: string
          name?: string
        }
        Update: {
          added_at?: string
          buyer_id?: string | null
          email?: string
          id?: string
          list_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_contact_list_members_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_contact_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contact_lists: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enhanced_images: {
        Row: {
          created_at: string
          enhanced_path: string
          id: string
          original_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enhanced_path: string
          id?: string
          original_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          enhanced_path?: string
          id?: string
          original_path?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          base_amount: number | null
          completion_date: string | null
          courtesy_delivery_date: string | null
          courtesy_return_date: string | null
          courtesy_vehicle_plate: string | null
          created_at: string
          created_by: string
          date: string
          description: string
          expense_category: Database["public"]["Enums"]["expense_category"]
          id: string
          invoice_number: string
          is_system_generated: boolean
          observations: string
          source: string | null
          supplier_id: string | null
          supplier_name: string | null
          tax_amount: number | null
          tax_inferred: boolean
          tax_rate: number | null
          tax_type: string | null
          updated_at: string
          updated_by: string
          vehicle_id: string
        }
        Insert: {
          amount?: number
          base_amount?: number | null
          completion_date?: string | null
          courtesy_delivery_date?: string | null
          courtesy_return_date?: string | null
          courtesy_vehicle_plate?: string | null
          created_at?: string
          created_by: string
          date?: string
          description?: string
          expense_category?: Database["public"]["Enums"]["expense_category"]
          id?: string
          invoice_number?: string
          is_system_generated?: boolean
          observations?: string
          source?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          tax_inferred?: boolean
          tax_rate?: number | null
          tax_type?: string | null
          updated_at?: string
          updated_by: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          base_amount?: number | null
          completion_date?: string | null
          courtesy_delivery_date?: string | null
          courtesy_return_date?: string | null
          courtesy_vehicle_plate?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          expense_category?: Database["public"]["Enums"]["expense_category"]
          id?: string
          invoice_number?: string
          is_system_generated?: boolean
          observations?: string
          source?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          tax_inferred?: boolean
          tax_rate?: number | null
          tax_type?: string | null
          updated_at?: string
          updated_by?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entities: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          simulation_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          simulation_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          simulation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_installments_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "finance_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_products: {
        Row: {
          active: boolean
          commission_percent: number
          created_at: string
          entity_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          commission_percent?: number
          created_at?: string
          entity_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          commission_percent?: number
          created_at?: string
          entity_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_products_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_rappels: {
        Row: {
          created_at: string | null
          created_by: string
          entity_id: string | null
          entity_name: string
          id: string
          period_type: string
          rappel_percent: number
          threshold_volume: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          entity_id?: string | null
          entity_name: string
          id?: string
          period_type?: string
          rappel_percent?: number
          threshold_volume?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          entity_id?: string | null
          entity_name?: string
          id?: string
          period_type?: string
          rappel_percent?: number
          threshold_volume?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_rappels_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_simulations: {
        Row: {
          additional_rate_used: number
          adjusted_capital: number
          approved_at: string | null
          approved_by: string | null
          buyer_id: string | null
          coefficient_used: number
          created_at: string
          created_by: string
          down_payment: number
          entity_name_snapshot: string
          financed_amount: number
          first_payment_date: string | null
          id: string
          monthly_payment: number
          pdf_url: string | null
          product_name_snapshot: string
          sale_id: string | null
          status: string
          term_model_id: string
          term_months_used: number
          tin_used: number
          total_estimated: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          additional_rate_used?: number
          adjusted_capital: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string | null
          coefficient_used: number
          created_at?: string
          created_by: string
          down_payment?: number
          entity_name_snapshot: string
          financed_amount: number
          first_payment_date?: string | null
          id?: string
          monthly_payment: number
          pdf_url?: string | null
          product_name_snapshot: string
          sale_id?: string | null
          status?: string
          term_model_id: string
          term_months_used: number
          tin_used: number
          total_estimated: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          additional_rate_used?: number
          adjusted_capital?: number
          approved_at?: string | null
          approved_by?: string | null
          buyer_id?: string | null
          coefficient_used?: number
          created_at?: string
          created_by?: string
          down_payment?: number
          entity_name_snapshot?: string
          financed_amount?: number
          first_payment_date?: string | null
          id?: string
          monthly_payment?: number
          pdf_url?: string | null
          product_name_snapshot?: string
          sale_id?: string | null
          status?: string
          term_model_id?: string
          term_months_used?: number
          tin_used?: number
          total_estimated?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_simulations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_simulations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_simulations_term_model_id_fkey"
            columns: ["term_model_id"]
            isOneToOne: false
            referencedRelation: "finance_term_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_simulations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_term_models: {
        Row: {
          active: boolean
          additional_rate: number
          coefficient: number
          commission_percent: number | null
          created_at: string
          id: string
          product_id: string
          term_months: number
          tin: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          additional_rate?: number
          coefficient: number
          commission_percent?: number | null
          created_at?: string
          id?: string
          product_id: string
          term_months: number
          tin: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          additional_rate?: number
          coefficient?: number
          commission_percent?: number | null
          created_at?: string
          id?: string
          product_id?: string
          term_months?: number
          tin?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_term_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "finance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_tiers: {
        Row: {
          bonus_amount: number
          category: string
          created_at: string | null
          created_by: string
          id: string
          threshold: number
          updated_at: string | null
        }
        Insert: {
          bonus_amount: number
          category: string
          created_at?: string | null
          created_by: string
          id?: string
          threshold: number
          updated_at?: string | null
        }
        Update: {
          bonus_amount?: number
          category?: string
          created_at?: string | null
          created_by?: string
          id?: string
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      insurers: {
        Row: {
          active: boolean
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      invoice_series: {
        Row: {
          active: boolean
          created_at: string
          current_number: number
          id: string
          is_default: boolean
          is_rectificativa: boolean
          name: string
          prefix: string
          updated_at: string
          year: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_number?: number
          id?: string
          is_default?: boolean
          is_rectificativa?: boolean
          name: string
          prefix: string
          updated_at?: string
          year?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          current_number?: number
          id?: string
          is_default?: boolean
          is_rectificativa?: boolean
          name?: string
          prefix?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          base_amount: number
          buyer_address: string | null
          buyer_dni: string | null
          buyer_id: string
          buyer_name: string
          created_at: string
          full_number: string | null
          hash: string | null
          hash_algorithm: string | null
          id: string
          invoice_number: number | null
          invoice_type: string
          issue_date: string
          issued_by: string
          issued_by_name: string
          notes: string | null
          payment_status: string
          previous_hash: string | null
          rectification_reason: string | null
          rectification_type: string | null
          rectifies_invoice_id: string | null
          sale_id: string | null
          series_id: string
          status: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          total_amount: number
          updated_at: string
          vehicle_brand_model: string
          vehicle_id: string
          vehicle_plate: string
          vehicle_vin: string | null
          verifactu_sent_at: string | null
          verifactu_status: string | null
        }
        Insert: {
          base_amount?: number
          buyer_address?: string | null
          buyer_dni?: string | null
          buyer_id: string
          buyer_name?: string
          created_at?: string
          full_number?: string | null
          hash?: string | null
          hash_algorithm?: string | null
          id?: string
          invoice_number?: number | null
          invoice_type?: string
          issue_date?: string
          issued_by: string
          issued_by_name?: string
          notes?: string | null
          payment_status?: string
          previous_hash?: string | null
          rectification_reason?: string | null
          rectification_type?: string | null
          rectifies_invoice_id?: string | null
          sale_id?: string | null
          series_id: string
          status?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total_amount?: number
          updated_at?: string
          vehicle_brand_model?: string
          vehicle_id: string
          vehicle_plate?: string
          vehicle_vin?: string | null
          verifactu_sent_at?: string | null
          verifactu_status?: string | null
        }
        Update: {
          base_amount?: number
          buyer_address?: string | null
          buyer_dni?: string | null
          buyer_id?: string
          buyer_name?: string
          created_at?: string
          full_number?: string | null
          hash?: string | null
          hash_algorithm?: string | null
          id?: string
          invoice_number?: number | null
          invoice_type?: string
          issue_date?: string
          issued_by?: string
          issued_by_name?: string
          notes?: string | null
          payment_status?: string
          previous_hash?: string | null
          rectification_reason?: string | null
          rectification_type?: string | null
          rectifies_invoice_id?: string | null
          sale_id?: string | null
          series_id?: string
          status?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total_amount?: number
          updated_at?: string
          vehicle_brand_model?: string
          vehicle_id?: string
          vehicle_plate?: string
          vehicle_vin?: string | null
          verifactu_sent_at?: string | null
          verifactu_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_rectifies_invoice_id_fkey"
            columns: ["rectifies_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "invoice_series"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string
          description: string
          entry_date: string
          entry_number: string
          id: string
          origin_id: string | null
          origin_type: string
          period_id: string
          status: string
          total_credit: number
          total_debit: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          entry_date?: string
          entry_number: string
          id?: string
          origin_id?: string | null
          origin_type: string
          period_id: string
          status?: string
          total_credit?: number
          total_debit?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          origin_id?: string | null
          origin_type?: string
          period_id?: string
          status?: string
          total_credit?: number
          total_debit?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_code: string
          created_at: string
          credit: number
          debit: number
          description: string
          entry_id: string
          id: string
        }
        Insert: {
          account_code: string
          created_at?: string
          credit?: number
          debit?: number
          description: string
          entry_id: string
          id?: string
        }
        Update: {
          account_code?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          assigned_to: string
          assignment_mode: string
          created_at: string
          created_by: string
          demand_id: string
          id: string
          is_automatic: boolean
          reason: string | null
        }
        Insert: {
          assigned_to: string
          assignment_mode?: string
          created_at?: string
          created_by: string
          demand_id: string
          id?: string
          is_automatic?: boolean
          reason?: string | null
        }
        Update: {
          assigned_to?: string
          assignment_mode?: string
          created_at?: string
          created_by?: string
          demand_id?: string
          id?: string
          is_automatic?: boolean
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      market_comparisons: {
        Row: {
          appraisal_id: string | null
          comparables: Json
          competencia: string
          created_at: string
          id: string
          mediana: number
          percentil_25: number
          percentil_75: number
          precio_medio: number
          search_criteria: Json
          total_comparables: number
          valor_final_aplicado: number | null
          valor_sugerido: number
          vehicle_id: string
        }
        Insert: {
          appraisal_id?: string | null
          comparables?: Json
          competencia?: string
          created_at?: string
          id?: string
          mediana?: number
          percentil_25?: number
          percentil_75?: number
          precio_medio?: number
          search_criteria: Json
          total_comparables?: number
          valor_final_aplicado?: number | null
          valor_sugerido?: number
          vehicle_id: string
        }
        Update: {
          appraisal_id?: string | null
          comparables?: Json
          competencia?: string
          created_at?: string
          id?: string
          mediana?: number
          percentil_25?: number
          percentil_75?: number
          precio_medio?: number
          search_criteria?: Json
          total_comparables?: number
          valor_final_aplicado?: number | null
          valor_sugerido?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_comparisons_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      master_brands: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          is_validated: boolean
          name: string
          normalized_name: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          is_validated?: boolean
          name: string
          normalized_name: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          is_validated?: boolean
          name?: string
          normalized_name?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      master_models: {
        Row: {
          active: boolean
          body_type: string
          brand_id: string
          created_at: string
          created_by: string
          id: string
          is_validated: boolean
          name: string
          normalized_name: string
          segment_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          active?: boolean
          body_type: string
          brand_id: string
          created_at?: string
          created_by: string
          id?: string
          is_validated?: boolean
          name: string
          normalized_name: string
          segment_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          active?: boolean
          body_type?: string
          brand_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_validated?: boolean
          name?: string
          normalized_name?: string
          segment_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "master_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_models_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "vehicle_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      master_versions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          is_validated: boolean
          master_model_id: string
          name: string
          normalized_name: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          is_validated?: boolean
          master_model_id: string
          name: string
          normalized_name: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          is_validated?: boolean
          master_model_id?: string
          name?: string
          normalized_name?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_versions_master_model_id_fkey"
            columns: ["master_model_id"]
            isOneToOne: false
            referencedRelation: "master_models"
            referencedColumns: ["id"]
          },
        ]
      }
      module_requests: {
        Row: {
          budget_max: number
          budget_min: number
          complexity: string
          conversation: Json
          created_at: string
          id: string
          requested_by: string
          requested_by_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string
          timeline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number
          budget_min?: number
          complexity?: string
          conversation?: Json
          created_at?: string
          id?: string
          requested_by: string
          requested_by_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary: string
          timeline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number
          budget_min?: number
          complexity?: string
          conversation?: Json
          created_at?: string
          id?: string
          requested_by?: string
          requested_by_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          timeline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          vehicle_id: string
        }
        Insert: {
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          vehicle_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          reference_id: string | null
          seen: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          reference_id?: string | null
          seen?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          reference_id?: string | null
          seen?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      objective_change_log: {
        Row: {
          changed_at: string | null
          changed_by: string
          field_name: string
          id: string
          new_value: string | null
          objective_id: string
          old_value: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          field_name: string
          id?: string
          new_value?: string | null
          objective_id: string
          old_value?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          field_name?: string
          id?: string
          new_value?: string | null
          objective_id?: string
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_change_log_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "sales_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          created_by: string
          id: string
          invoice_id: string | null
          is_refund: boolean
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          reservation_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          created_by: string
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_type: string
          reservation_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          created_by?: string
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          reservation_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_tickets: {
        Row: {
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          report_params: Json
          report_type: string
          ticket: string
          user_id: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          report_params?: Json
          report_type: string
          ticket?: string
          user_id: string
        }
        Update: {
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          report_params?: Json
          report_type?: string
          ticket?: string
          user_id?: string
        }
        Relationships: []
      }
      point_rules: {
        Row: {
          action: string
          created_at: string | null
          created_by: string
          id: string
          points: number
          threshold: number
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by: string
          id?: string
          points?: number
          threshold?: number
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string
          id?: string
          points?: number
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          branch: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          branch?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          branch?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          buyer_iban: string | null
          buyer_id: string | null
          buyer_name: string
          commission_estimated: number | null
          created_at: string
          created_by: string
          created_by_name: string
          down_payment: number | null
          finance_term_model_id: string | null
          financed_amount: number | null
          id: string
          internal_flag: string | null
          monthly_payment: number | null
          proposal_type: string
          total_amount: number
          total_financed: number | null
          vehicle_id: string
        }
        Insert: {
          buyer_iban?: string | null
          buyer_id?: string | null
          buyer_name?: string
          commission_estimated?: number | null
          created_at?: string
          created_by: string
          created_by_name?: string
          down_payment?: number | null
          finance_term_model_id?: string | null
          financed_amount?: number | null
          id?: string
          internal_flag?: string | null
          monthly_payment?: number | null
          proposal_type?: string
          total_amount?: number
          total_financed?: number | null
          vehicle_id: string
        }
        Update: {
          buyer_iban?: string | null
          buyer_id?: string | null
          buyer_name?: string
          commission_estimated?: number | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          down_payment?: number | null
          finance_term_model_id?: string | null
          financed_amount?: number | null
          id?: string
          internal_flag?: string | null
          monthly_payment?: number | null
          proposal_type?: string
          total_amount?: number
          total_financed?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_finance_term_model_id_fkey"
            columns: ["finance_term_model_id"]
            isOneToOne: false
            referencedRelation: "finance_term_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          ai_tone: string | null
          caption: string | null
          created_at: string | null
          generated_image_id: string | null
          hashtags: string | null
          id: string
          image_url: string | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          ai_tone?: string | null
          caption?: string | null
          created_at?: string | null
          generated_image_id?: string | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          ai_tone?: string | null
          caption?: string | null
          created_at?: string | null
          generated_image_id?: string | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_generated_image_id_fkey"
            columns: ["generated_image_id"]
            isOneToOne: false
            referencedRelation: "enhanced_images"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      pv_claims: {
        Row: {
          assigned_to: string
          assigned_to_name: string
          buyer_id: string
          claim_type: Database["public"]["Enums"]["pv_claim_type"]
          closed_at: string | null
          compensation_amount: number | null
          created_at: string
          created_by: string
          description: string
          id: string
          opened_at: string
          resolution: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["pv_claim_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_to: string
          assigned_to_name?: string
          buyer_id: string
          claim_type?: Database["public"]["Enums"]["pv_claim_type"]
          closed_at?: string | null
          compensation_amount?: number | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          opened_at?: string
          resolution?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["pv_claim_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_to?: string
          assigned_to_name?: string
          buyer_id?: string
          claim_type?: Database["public"]["Enums"]["pv_claim_type"]
          closed_at?: string | null
          compensation_amount?: number | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          opened_at?: string
          resolution?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["pv_claim_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_claims_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_claims_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_finance_incidents: {
        Row: {
          assigned_to: string
          assigned_to_name: string
          buyer_id: string
          created_at: string
          created_by: string
          description: string
          finance_entity_name: string
          id: string
          internal_notes: string | null
          problem_type: string
          resolution: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["pv_finance_incident_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_to: string
          assigned_to_name?: string
          buyer_id: string
          created_at?: string
          created_by: string
          description?: string
          finance_entity_name?: string
          id?: string
          internal_notes?: string | null
          problem_type?: string
          resolution?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["pv_finance_incident_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_to?: string
          assigned_to_name?: string
          buyer_id?: string
          created_at?: string
          created_by?: string
          description?: string
          finance_entity_name?: string
          id?: string
          internal_notes?: string | null
          problem_type?: string
          resolution?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["pv_finance_incident_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_finance_incidents_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_finance_incidents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_finance_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_followups: {
        Row: {
          assigned_to: string
          assigned_to_name: string
          buyer_id: string
          completed_date: string | null
          created_at: string
          created_by: string
          followup_type: Database["public"]["Enums"]["pv_followup_type"]
          id: string
          is_auto_generated: boolean
          next_action: string | null
          next_followup_date: string | null
          notes: string | null
          result: string | null
          sale_id: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["pv_followup_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to: string
          assigned_to_name?: string
          buyer_id: string
          completed_date?: string | null
          created_at?: string
          created_by: string
          followup_type: Database["public"]["Enums"]["pv_followup_type"]
          id?: string
          is_auto_generated?: boolean
          next_action?: string | null
          next_followup_date?: string | null
          notes?: string | null
          result?: string | null
          sale_id?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["pv_followup_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string
          assigned_to_name?: string
          buyer_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string
          followup_type?: Database["public"]["Enums"]["pv_followup_type"]
          id?: string
          is_auto_generated?: boolean
          next_action?: string | null
          next_followup_date?: string | null
          notes?: string | null
          result?: string | null
          sale_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["pv_followup_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pv_followups_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_followups_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_followups_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_incidents: {
        Row: {
          assigned_to: string
          assigned_to_name: string
          buyer_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          incident_type: Database["public"]["Enums"]["pv_incident_type"]
          internal_notes: string | null
          opened_at: string
          repair_id: string | null
          sale_id: string | null
          severity: Database["public"]["Enums"]["pv_severity"]
          status: Database["public"]["Enums"]["pv_incident_status"]
          updated_at: string
          vehicle_id: string
          warranty_covered: boolean | null
          warranty_id: string | null
        }
        Insert: {
          assigned_to: string
          assigned_to_name?: string
          buyer_id: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          incident_type?: Database["public"]["Enums"]["pv_incident_type"]
          internal_notes?: string | null
          opened_at?: string
          repair_id?: string | null
          sale_id?: string | null
          severity?: Database["public"]["Enums"]["pv_severity"]
          status?: Database["public"]["Enums"]["pv_incident_status"]
          updated_at?: string
          vehicle_id: string
          warranty_covered?: boolean | null
          warranty_id?: string | null
        }
        Update: {
          assigned_to?: string
          assigned_to_name?: string
          buyer_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          incident_type?: Database["public"]["Enums"]["pv_incident_type"]
          internal_notes?: string | null
          opened_at?: string
          repair_id?: string | null
          sale_id?: string | null
          severity?: Database["public"]["Enums"]["pv_severity"]
          status?: Database["public"]["Enums"]["pv_incident_status"]
          updated_at?: string
          vehicle_id?: string
          warranty_covered?: boolean | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pv_incidents_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_incidents_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "pv_repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_incidents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_incidents_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "pv_warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_repair_parts: {
        Row: {
          created_at: string
          id: string
          observations: string | null
          part_name: string
          quantity: number
          repair_id: string
          supplier_id: string | null
          total_cost: number
          unit_cost: number
          warranty_months: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          observations?: string | null
          part_name: string
          quantity?: number
          repair_id: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
          warranty_months?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          observations?: string | null
          part_name?: string
          quantity?: number
          repair_id?: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pv_repair_parts_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "pv_repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_repair_parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_repairs: {
        Row: {
          buyer_id: string
          cost_client: number | null
          cost_company: number | null
          cost_warranty: number | null
          created_at: string
          created_by: string
          diagnosis: string | null
          entry_date: string | null
          estimated_cost: number | null
          exit_date: string | null
          final_cost: number | null
          id: string
          incident_id: string | null
          observations: string | null
          status: Database["public"]["Enums"]["pv_repair_status"]
          supplier_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          buyer_id: string
          cost_client?: number | null
          cost_company?: number | null
          cost_warranty?: number | null
          created_at?: string
          created_by: string
          diagnosis?: string | null
          entry_date?: string | null
          estimated_cost?: number | null
          exit_date?: string | null
          final_cost?: number | null
          id?: string
          incident_id?: string | null
          observations?: string | null
          status?: Database["public"]["Enums"]["pv_repair_status"]
          supplier_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          buyer_id?: string
          cost_client?: number | null
          cost_company?: number | null
          cost_warranty?: number | null
          created_at?: string
          created_by?: string
          diagnosis?: string | null
          entry_date?: string | null
          estimated_cost?: number | null
          exit_date?: string | null
          final_cost?: number | null
          id?: string
          incident_id?: string | null
          observations?: string | null
          status?: Database["public"]["Enums"]["pv_repair_status"]
          supplier_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_repairs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_repairs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "pv_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_repairs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_reviews: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          buyer_id: string
          company_assumed: boolean
          cost: number | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          review_date: string
          review_type: string
          sale_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          buyer_id: string
          company_assumed?: boolean
          cost?: number | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          review_date: string
          review_type?: string
          sale_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          buyer_id?: string
          company_assumed?: boolean
          cost?: number | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          review_date?: string
          review_type?: string
          sale_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_reviews_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_reviews_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_warranties: {
        Row: {
          buyer_id: string
          coverage_description: string | null
          created_at: string
          created_by: string
          end_date: string
          exclusions: string | null
          id: string
          policy_document_url: string | null
          provider: string | null
          sale_id: string | null
          start_date: string
          updated_at: string
          vehicle_id: string
          warranty_type: string
        }
        Insert: {
          buyer_id: string
          coverage_description?: string | null
          created_at?: string
          created_by: string
          end_date: string
          exclusions?: string | null
          id?: string
          policy_document_url?: string | null
          provider?: string | null
          sale_id?: string | null
          start_date: string
          updated_at?: string
          vehicle_id: string
          warranty_type?: string
        }
        Update: {
          buyer_id?: string
          coverage_description?: string | null
          created_at?: string
          created_by?: string
          end_date?: string
          exclusions?: string | null
          id?: string
          policy_document_url?: string | null
          provider?: string | null
          sale_id?: string | null
          start_date?: string
          updated_at?: string
          vehicle_id?: string
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_warranties_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_warranties_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_warranties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_order_categories: {
        Row: {
          category_type: string
          created_at: string
          description: string
          estimated_amount: number
          id: string
          repair_order_id: string
        }
        Insert: {
          category_type: string
          created_at?: string
          description?: string
          estimated_amount?: number
          id?: string
          repair_order_id: string
        }
        Update: {
          category_type?: string
          created_at?: string
          description?: string
          estimated_amount?: number
          id?: string
          repair_order_id?: string
        }
        Relationships: []
      }
      repair_orders: {
        Row: {
          actual_end_date: string | null
          cancellation_reason: string | null
          created_at: string
          created_by: string
          estimated_end_date: string | null
          estimated_total: number
          id: string
          observations: string
          previous_vehicle_status: string | null
          purchase_id: string | null
          source_id: string | null
          source_module: string | null
          source_type: string | null
          status: string
          supplier_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_end_date?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by: string
          estimated_end_date?: string | null
          estimated_total?: number
          id?: string
          observations?: string
          previous_vehicle_status?: string | null
          purchase_id?: string | null
          source_id?: string | null
          source_module?: string | null
          source_type?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_end_date?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string
          estimated_end_date?: string | null
          estimated_total?: number
          id?: string
          observations?: string
          previous_vehicle_status?: string | null
          purchase_id?: string | null
          source_id?: string | null
          source_module?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      reservation_clauses: {
        Row: {
          body: string
          clause_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          clause_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          clause_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reservation_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_number: string | null
          document_type: string
          generated_at: string | null
          html_content: string | null
          id: string
          reservation_id: string
          snapshot_json: Json
          status: string | null
          template_version: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_number?: string | null
          document_type: string
          generated_at?: string | null
          html_content?: string | null
          id?: string
          reservation_id: string
          snapshot_json?: Json
          status?: string | null
          template_version?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_number?: string | null
          document_type?: string
          generated_at?: string | null
          html_content?: string | null
          id?: string
          reservation_id?: string
          snapshot_json?: Json
          status?: string | null
          template_version?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_documents_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_timeline: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          reservation_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          reservation_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_timeline_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          applied_to_invoice: boolean
          buyer_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          contract_generated_at: string | null
          contract_pdf_url: string | null
          contract_signed: boolean
          contract_template_id: string | null
          converted_sale_id: string | null
          converted_to_sale_at: string | null
          created_at: string
          created_by: string
          delivered_at: string | null
          deposit_amount_source: string
          deposit_paid: boolean
          deposit_payment_method: string | null
          expiration_date: string
          id: string
          notes: string | null
          paid_at: string | null
          passed_to_signature_at: string | null
          payment_method: string | null
          receipt_number: string | null
          reminder_24h_sent: boolean
          reminder_24h_sent_at: string | null
          reminder_same_day_sent: boolean
          reminder_same_day_sent_at: string | null
          reservation_amount: number
          reservation_date: string
          reservation_number: string | null
          reservation_status: string
          signature_snapshot: Json | null
          signed_at: string | null
          status: string
          updated_at: string
          vehicle_id: string
          vehicle_pvp_snapshot: number
        }
        Insert: {
          applied_to_invoice?: boolean
          buyer_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contract_generated_at?: string | null
          contract_pdf_url?: string | null
          contract_signed?: boolean
          contract_template_id?: string | null
          converted_sale_id?: string | null
          converted_to_sale_at?: string | null
          created_at?: string
          created_by: string
          delivered_at?: string | null
          deposit_amount_source?: string
          deposit_paid?: boolean
          deposit_payment_method?: string | null
          expiration_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          passed_to_signature_at?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          reminder_24h_sent?: boolean
          reminder_24h_sent_at?: string | null
          reminder_same_day_sent?: boolean
          reminder_same_day_sent_at?: string | null
          reservation_amount?: number
          reservation_date?: string
          reservation_number?: string | null
          reservation_status?: string
          signature_snapshot?: Json | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          vehicle_pvp_snapshot?: number
        }
        Update: {
          applied_to_invoice?: boolean
          buyer_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contract_generated_at?: string | null
          contract_pdf_url?: string | null
          contract_signed?: boolean
          contract_template_id?: string | null
          converted_sale_id?: string | null
          converted_to_sale_at?: string | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          deposit_amount_source?: string
          deposit_paid?: boolean
          deposit_payment_method?: string | null
          expiration_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          passed_to_signature_at?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          reminder_24h_sent?: boolean
          reminder_24h_sent_at?: string | null
          reminder_same_day_sent?: boolean
          reminder_same_day_sent_at?: string | null
          reservation_amount?: number
          reservation_date?: string
          reservation_number?: string | null
          reservation_status?: string
          signature_snapshot?: Json | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_pvp_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          base_amount: number
          buyer_id: string
          created_at: string
          created_by: string
          discount: number
          discount_condition: string | null
          finance_entity: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_series: string | null
          invoice_status: string
          notes: string | null
          payment_breakdown: Json | null
          payment_method: string
          sale_date: string
          sale_price: number
          seller_id: string
          seller_name: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          total_amount: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          base_amount?: number
          buyer_id: string
          created_at?: string
          created_by: string
          discount?: number
          discount_condition?: string | null
          finance_entity?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_series?: string | null
          invoice_status?: string
          notes?: string | null
          payment_breakdown?: Json | null
          payment_method?: string
          sale_date?: string
          sale_price: number
          seller_id: string
          seller_name?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total_amount?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          base_amount?: number
          buyer_id?: string
          created_at?: string
          created_by?: string
          discount?: number
          discount_condition?: string | null
          finance_entity?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_series?: string | null
          invoice_status?: string
          notes?: string | null
          payment_breakdown?: Json | null
          payment_method?: string
          sale_date?: string
          sale_price?: number
          seller_id?: string
          seller_name?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total_amount?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      sales_objectives: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          period: string
          scope: string
          target_financed: number
          target_margin: number
          target_role: string | null
          target_sales: number
          target_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          period: string
          scope: string
          target_financed?: number
          target_margin?: number
          target_role?: string | null
          target_sales?: number
          target_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          period?: string
          scope?: string
          target_financed?: number
          target_margin?: number
          target_role?: string | null
          target_sales?: number
          target_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seller_monthly_stats: {
        Row: {
          bonus_financed: number | null
          bonus_margin: number | null
          bonus_sales: number | null
          bonus_total: number | null
          created_at: string | null
          id: string
          last_recalc_at: string | null
          level_name: string | null
          period: string
          total_financed: number | null
          total_margin: number | null
          total_points: number | null
          total_sales: number | null
          user_id: string
        }
        Insert: {
          bonus_financed?: number | null
          bonus_margin?: number | null
          bonus_sales?: number | null
          bonus_total?: number | null
          created_at?: string | null
          id?: string
          last_recalc_at?: string | null
          level_name?: string | null
          period: string
          total_financed?: number | null
          total_margin?: number | null
          total_points?: number | null
          total_sales?: number | null
          user_id: string
        }
        Update: {
          bonus_financed?: number | null
          bonus_margin?: number | null
          bonus_sales?: number | null
          bonus_total?: number | null
          created_at?: string | null
          id?: string
          last_recalc_at?: string | null
          level_name?: string | null
          period?: string
          total_financed?: number | null
          total_margin?: number | null
          total_points?: number | null
          total_sales?: number | null
          user_id?: string
        }
        Relationships: []
      }
      smart_documents: {
        Row: {
          confirmed_at: string | null
          created_at: string
          document_type: string
          extracted_data: Json
          extraction_meta: Json
          file_name: string
          file_path: string
          file_size: number
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          linked_vehicle_id: string | null
          status: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          document_type: string
          extracted_data?: Json
          extraction_meta?: Json
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          linked_vehicle_id?: string | null
          status?: string
          uploaded_by: string
          uploaded_by_name?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          document_type?: string
          extracted_data?: Json
          extraction_meta?: Json
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          linked_vehicle_id?: string | null
          status?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string | null
          avatar_url: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          platform: string
          platform_user_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          platform: string
          platform_user_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          platform?: string
          platform_user_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      supplier_invoices: {
        Row: {
          base_amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          id: string
          invoice_date: string
          invoice_number: string
          linked_expense_id: string | null
          pdf_path: string | null
          rectifies_invoice_id: string | null
          repair_order_id: string
          status: string
          supplier_id: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          total_amount: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          base_amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_date: string
          invoice_number: string
          linked_expense_id?: string | null
          pdf_path?: string | null
          rectifies_invoice_id?: string | null
          repair_order_id: string
          status?: string
          supplier_id: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total_amount?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          base_amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          linked_expense_id?: string | null
          pdf_path?: string | null
          rectifies_invoice_id?: string | null
          repair_order_id?: string
          status?: string
          supplier_id?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          total_amount?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          supplier_invoice_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          supplier_invoice_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          supplier_invoice_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_internal: boolean
          name: string
          phone: string
          specialty: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_internal?: boolean
          name: string
          phone?: string
          specialty?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_internal?: boolean
          name?: string
          phone?: string
          specialty?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          buyer_id: string | null
          buyer_label: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          purchase_id: string | null
          source_id: string | null
          source_module: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          vehicle_id: string | null
          vehicle_label: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          buyer_id?: string | null
          buyer_label?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          purchase_id?: string | null
          source_id?: string | null
          source_module?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          buyer_id?: string | null
          buyer_label?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          purchase_id?: string | null
          source_id?: string | null
          source_module?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_model_periods: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          presented_at: string | null
          quarter: number | null
          status: string
          tax_model_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          presented_at?: string | null
          quarter?: number | null
          status?: string
          tax_model_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          presented_at?: string | null
          quarter?: number | null
          status?: string
          tax_model_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_model_periods_tax_model_id_fkey"
            columns: ["tax_model_id"]
            isOneToOne: false
            referencedRelation: "tax_models"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_models: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          model_code: string
          period_type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          display_order?: number
          id?: string
          is_active?: boolean
          model_code: string
          period_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          model_code?: string
          period_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_appraisals: {
        Row: {
          appraisal_date: string
          appraiser_id: string
          appraiser_name: string
          created_at: string
          electrical_notes: string
          electrical_score: number
          exterior_notes: string
          exterior_score: number
          id: string
          interior_notes: string
          interior_score: number
          internal_notes: string
          market_value: number
          mechanical_notes: string
          mechanical_score: number
          offer_price: number
          overall_score: number
          status: string
          tires_notes: string
          tires_score: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          appraisal_date?: string
          appraiser_id: string
          appraiser_name?: string
          created_at?: string
          electrical_notes?: string
          electrical_score?: number
          exterior_notes?: string
          exterior_score?: number
          id?: string
          interior_notes?: string
          interior_score?: number
          internal_notes?: string
          market_value?: number
          mechanical_notes?: string
          mechanical_score?: number
          offer_price?: number
          overall_score?: number
          status?: string
          tires_notes?: string
          tires_score?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          appraisal_date?: string
          appraiser_id?: string
          appraiser_name?: string
          created_at?: string
          electrical_notes?: string
          electrical_score?: number
          exterior_notes?: string
          exterior_score?: number
          id?: string
          interior_notes?: string
          interior_score?: number
          internal_notes?: string
          market_value?: number
          mechanical_notes?: string
          mechanical_score?: number
          offer_price?: number
          overall_score?: number
          status?: string
          tires_notes?: string
          tires_score?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_appraisals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_images: {
        Row: {
          alt_text: string
          created_at: string
          file_size: number
          id: string
          is_primary: boolean
          is_public: boolean
          mime_type: string | null
          order_index: number
          original_url: string
          thumbnail_url: string | null
          uploaded_by: string
          vehicle_id: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          file_size?: number
          id?: string
          is_primary?: boolean
          is_public?: boolean
          mime_type?: string | null
          order_index?: number
          original_url: string
          thumbnail_url?: string | null
          uploaded_by: string
          vehicle_id: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          file_size?: number
          id?: string
          is_primary?: boolean
          is_public?: boolean
          mime_type?: string | null
          order_index?: number
          original_url?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_insurances: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          insurance_type: string
          insurer_name: string
          observations: string | null
          pdf_document_id: string | null
          policy_number: string
          start_date: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          insurance_type?: string
          insurer_name: string
          observations?: string | null
          pdf_document_id?: string | null
          policy_number: string
          start_date: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          insurance_type?: string
          insurer_name?: string
          observations?: string | null
          pdf_document_id?: string | null
          policy_number?: string
          start_date?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_insurances_pdf_document_id_fkey"
            columns: ["pdf_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_insurances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_preparation_items: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          execution_type: string
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          linked_repair_order_id: string | null
          linked_task_id: string | null
          notes: string | null
          purchase_id: string
          responsible_role: string
          responsible_user_id: string | null
          sort_order: number | null
          step_key: string
          step_label: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          execution_type?: string
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          linked_repair_order_id?: string | null
          linked_task_id?: string | null
          notes?: string | null
          purchase_id: string
          responsible_role?: string
          responsible_user_id?: string | null
          sort_order?: number | null
          step_key: string
          step_label: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          execution_type?: string
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          linked_repair_order_id?: string | null
          linked_task_id?: string | null
          notes?: string | null
          purchase_id?: string
          responsible_role?: string
          responsible_user_id?: string | null
          sort_order?: number | null
          step_key?: string
          step_label?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_preparation_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "vehicle_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_preparation_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_purchase_contracts: {
        Row: {
          company_snapshot: Json
          contract_number: string | null
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          html_content: string | null
          id: string
          notes: string | null
          pricing_snapshot: Json
          purchase_id: string
          seller_snapshot: Json
          status: string
          updated_at: string | null
          vehicle_id: string
          vehicle_snapshot: Json
        }
        Insert: {
          company_snapshot?: Json
          contract_number?: string | null
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          html_content?: string | null
          id?: string
          notes?: string | null
          pricing_snapshot?: Json
          purchase_id: string
          seller_snapshot?: Json
          status?: string
          updated_at?: string | null
          vehicle_id: string
          vehicle_snapshot?: Json
        }
        Update: {
          company_snapshot?: Json
          contract_number?: string | null
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          html_content?: string | null
          id?: string
          notes?: string | null
          pricing_snapshot?: Json
          purchase_id?: string
          seller_snapshot?: Json
          status?: string
          updated_at?: string | null
          vehicle_id?: string
          vehicle_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_purchase_contracts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "vehicle_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_purchase_contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_purchases: {
        Row: {
          agreed_price: number | null
          appraisal_id: string | null
          appraised_market_value: number | null
          created_at: string | null
          created_by: string
          id: string
          internal_notes: string | null
          notes: string | null
          offered_price: number | null
          payment_method: string | null
          payment_status: string | null
          purchase_date: string | null
          purchase_invoice_date: string | null
          purchase_invoice_number: string | null
          requested_price: number | null
          seller_id: string
          source_type: string
          status: string
          suggested_offer_price: number | null
          updated_at: string | null
          updated_by: string
          vehicle_id: string
        }
        Insert: {
          agreed_price?: number | null
          appraisal_id?: string | null
          appraised_market_value?: number | null
          created_at?: string | null
          created_by: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          offered_price?: number | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_date?: string | null
          purchase_invoice_date?: string | null
          purchase_invoice_number?: string | null
          requested_price?: number | null
          seller_id: string
          source_type?: string
          status?: string
          suggested_offer_price?: number | null
          updated_at?: string | null
          updated_by: string
          vehicle_id: string
        }
        Update: {
          agreed_price?: number | null
          appraisal_id?: string | null
          appraised_market_value?: number | null
          created_at?: string | null
          created_by?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          offered_price?: number | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_date?: string | null
          purchase_invoice_date?: string | null
          purchase_invoice_number?: string | null
          requested_price?: number | null
          seller_id?: string
          source_type?: string
          status?: string
          suggested_offer_price?: number | null
          updated_at?: string | null
          updated_by?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_purchases_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_purchases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_segments: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          examples: string
          id: string
          name: string
          size_range: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string
          examples?: string
          id?: string
          name: string
          size_range?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          examples?: string
          id?: string
          name?: string
          size_range?: string
        }
        Relationships: []
      }
      vehicle_transfers: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          destination_branch: string
          id: string
          observations: string | null
          origin_branch: string
          received_at: string | null
          received_by: string | null
          requested_by: string
          requesting_branch: string
          sent_at: string | null
          sent_by: string | null
          status: string
          updated_at: string
          vehicle_center_at_request: string
          vehicle_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          destination_branch: string
          id?: string
          observations?: string | null
          origin_branch: string
          received_at?: string | null
          received_by?: string | null
          requested_by: string
          requesting_branch: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          vehicle_center_at_request: string
          vehicle_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          destination_branch?: string
          id?: string
          observations?: string | null
          origin_branch?: string
          received_at?: string | null
          received_by?: string | null
          requested_by?: string
          requesting_branch?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          vehicle_center_at_request?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_transfers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: string | null
          brand: string
          buyer_id: string | null
          center: string
          color: string
          created_at: string
          created_by: string
          created_from: string | null
          delivery_date: string | null
          discount: number
          displacement: number
          engine_type: Database["public"]["Enums"]["engine_type"]
          expo_date: string
          first_registration: string
          has_circulation_permit: boolean
          has_manual: boolean
          has_second_key: boolean
          has_technical_sheet: boolean
          horsepower: number
          id: string
          insurer_id: string | null
          irpf_rate: number
          is_deregistered: boolean
          itv_date: string | null
          km_entry: number
          km_exit: number | null
          lot: string | null
          master_brand_id: string | null
          master_model_id: string | null
          master_version_id: string | null
          model: string
          needs_review: boolean | null
          net_profit: number
          owner_client_id: string | null
          plate: string
          policy_amount: number | null
          policy_date: string | null
          preparation_status: string | null
          price_cash: number
          price_financed: number
          price_professionals: number
          purchase_date: string
          purchase_price: number
          pvp_base: number
          real_sale_price: number | null
          sale_date: string | null
          second_registration: string | null
          segment_auto_assigned: boolean | null
          segment_id: string | null
          sold_by: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          status_change_reason: string | null
          tax_rate: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          total_cost: number
          total_expenses: number
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
          updated_by: string
          vehicle_class: Database["public"]["Enums"]["vehicle_class"]
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          version: string
          vin: string
          warranty_date: string | null
        }
        Insert: {
          body_type?: string | null
          brand: string
          buyer_id?: string | null
          center?: string
          color?: string
          created_at?: string
          created_by: string
          created_from?: string | null
          delivery_date?: string | null
          discount?: number
          displacement?: number
          engine_type?: Database["public"]["Enums"]["engine_type"]
          expo_date?: string
          first_registration?: string
          has_circulation_permit?: boolean
          has_manual?: boolean
          has_second_key?: boolean
          has_technical_sheet?: boolean
          horsepower?: number
          id?: string
          insurer_id?: string | null
          irpf_rate?: number
          is_deregistered?: boolean
          itv_date?: string | null
          km_entry?: number
          km_exit?: number | null
          lot?: string | null
          master_brand_id?: string | null
          master_model_id?: string | null
          master_version_id?: string | null
          model: string
          needs_review?: boolean | null
          net_profit?: number
          owner_client_id?: string | null
          plate: string
          policy_amount?: number | null
          policy_date?: string | null
          preparation_status?: string | null
          price_cash?: number
          price_financed?: number
          price_professionals?: number
          purchase_date?: string
          purchase_price?: number
          pvp_base?: number
          real_sale_price?: number | null
          sale_date?: string | null
          second_registration?: string | null
          segment_auto_assigned?: boolean | null
          segment_id?: string | null
          sold_by?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          status_change_reason?: string | null
          tax_rate?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          total_cost?: number
          total_expenses?: number
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          updated_by: string
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"]
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          version?: string
          vin?: string
          warranty_date?: string | null
        }
        Update: {
          body_type?: string | null
          brand?: string
          buyer_id?: string | null
          center?: string
          color?: string
          created_at?: string
          created_by?: string
          created_from?: string | null
          delivery_date?: string | null
          discount?: number
          displacement?: number
          engine_type?: Database["public"]["Enums"]["engine_type"]
          expo_date?: string
          first_registration?: string
          has_circulation_permit?: boolean
          has_manual?: boolean
          has_second_key?: boolean
          has_technical_sheet?: boolean
          horsepower?: number
          id?: string
          insurer_id?: string | null
          irpf_rate?: number
          is_deregistered?: boolean
          itv_date?: string | null
          km_entry?: number
          km_exit?: number | null
          lot?: string | null
          master_brand_id?: string | null
          master_model_id?: string | null
          master_version_id?: string | null
          model?: string
          needs_review?: boolean | null
          net_profit?: number
          owner_client_id?: string | null
          plate?: string
          policy_amount?: number | null
          policy_date?: string | null
          preparation_status?: string | null
          price_cash?: number
          price_financed?: number
          price_professionals?: number
          purchase_date?: string
          purchase_price?: number
          pvp_base?: number
          real_sale_price?: number | null
          sale_date?: string | null
          second_registration?: string | null
          segment_auto_assigned?: boolean | null
          segment_id?: string | null
          sold_by?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          status_change_reason?: string | null
          tax_rate?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          total_cost?: number
          total_expenses?: number
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          updated_by?: string
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"]
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          version?: string
          vin?: string
          warranty_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_master_brand_id_fkey"
            columns: ["master_brand_id"]
            isOneToOne: false
            referencedRelation: "master_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_master_model_id_fkey"
            columns: ["master_model_id"]
            isOneToOne: false
            referencedRelation: "master_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_master_version_id_fkey"
            columns: ["master_version_id"]
            isOneToOne: false
            referencedRelation: "master_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_client_id_fkey"
            columns: ["owner_client_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "vehicle_segments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_close_accounting_year: {
        Args: { p_created_by: string; p_year: number }
        Returns: string
      }
      fn_create_journal_entry: {
        Args: {
          p_created_by: string
          p_description: string
          p_entry_date: string
          p_lines: Json
          p_origin_id: string
          p_origin_type: string
          p_status?: string
        }
        Returns: string
      }
      fn_generate_finance_installments: {
        Args: { p_simulation_id: string }
        Returns: undefined
      }
      fn_get_or_create_accounting_period: {
        Args: { p_year: number }
        Returns: string
      }
      fn_open_accounting_year: {
        Args: { p_created_by: string; p_year: number }
        Returns: string
      }
      fn_recalc_seller_monthly_stats: {
        Args: { p_period: string; p_user_id: string }
        Returns: undefined
      }
      fn_supplier_invoice_cancel_reverse: {
        Args: { p_invoice_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "vendedor" | "postventa" | "administrador" | "contabilidad"
      engine_type: "gasolina" | "diesel" | "hibrido" | "electrico"
      expense_category:
        | "mecanica"
        | "pintura"
        | "transporte"
        | "gestoria"
        | "seguro"
        | "itv"
        | "garantia"
        | "limpieza"
        | "publicidad"
        | "otros"
      pv_claim_status: "abierta" | "en_revision" | "resuelta" | "rechazada"
      pv_claim_type:
        | "garantia"
        | "documentacion"
        | "comercial"
        | "financiacion"
        | "publicidad"
        | "atencion_cliente"
        | "otro"
      pv_finance_incident_status:
        | "abierta"
        | "en_gestion"
        | "resuelta"
        | "cerrada"
      pv_followup_status: "pendiente" | "realizado" | "en_espera" | "cerrado"
      pv_followup_type:
        | "llamada"
        | "whatsapp"
        | "email"
        | "revision_satisfaccion"
        | "recordatorio"
        | "gestion_documental"
        | "incidencia"
        | "reclamacion"
        | "financiacion"
        | "revision_mantenimiento"
      pv_incident_status:
        | "abierta"
        | "en_revision"
        | "diagnosticando"
        | "en_reparacion"
        | "pendiente_cliente"
        | "cerrada"
      pv_incident_type:
        | "averia"
        | "ruido"
        | "fallo_electronico"
        | "problema_documental"
        | "problema_comercial"
        | "incidencia_entrega"
        | "mantenimiento"
        | "otro"
      pv_repair_status:
        | "pendiente"
        | "en_curso"
        | "esperando_piezas"
        | "finalizada"
        | "cancelada"
      pv_severity: "leve" | "media" | "alta" | "urgente"
      task_priority: "baja" | "media" | "alta" | "urgente"
      task_status: "pendiente" | "en_curso" | "completada" | "cancelada"
      tax_type: "igic" | "iva"
      transmission_type: "manual" | "automatico"
      validation_status: "pendiente" | "validado" | "rechazado"
      vehicle_class: "turismo" | "mixto" | "industrial"
      vehicle_status: "disponible" | "reservado" | "vendido" | "entregado"
      vehicle_type: "nuevo" | "ocasion" | "usado"
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
      app_role: ["vendedor", "postventa", "administrador", "contabilidad"],
      engine_type: ["gasolina", "diesel", "hibrido", "electrico"],
      expense_category: [
        "mecanica",
        "pintura",
        "transporte",
        "gestoria",
        "seguro",
        "itv",
        "garantia",
        "limpieza",
        "publicidad",
        "otros",
      ],
      pv_claim_status: ["abierta", "en_revision", "resuelta", "rechazada"],
      pv_claim_type: [
        "garantia",
        "documentacion",
        "comercial",
        "financiacion",
        "publicidad",
        "atencion_cliente",
        "otro",
      ],
      pv_finance_incident_status: [
        "abierta",
        "en_gestion",
        "resuelta",
        "cerrada",
      ],
      pv_followup_status: ["pendiente", "realizado", "en_espera", "cerrado"],
      pv_followup_type: [
        "llamada",
        "whatsapp",
        "email",
        "revision_satisfaccion",
        "recordatorio",
        "gestion_documental",
        "incidencia",
        "reclamacion",
        "financiacion",
        "revision_mantenimiento",
      ],
      pv_incident_status: [
        "abierta",
        "en_revision",
        "diagnosticando",
        "en_reparacion",
        "pendiente_cliente",
        "cerrada",
      ],
      pv_incident_type: [
        "averia",
        "ruido",
        "fallo_electronico",
        "problema_documental",
        "problema_comercial",
        "incidencia_entrega",
        "mantenimiento",
        "otro",
      ],
      pv_repair_status: [
        "pendiente",
        "en_curso",
        "esperando_piezas",
        "finalizada",
        "cancelada",
      ],
      pv_severity: ["leve", "media", "alta", "urgente"],
      task_priority: ["baja", "media", "alta", "urgente"],
      task_status: ["pendiente", "en_curso", "completada", "cancelada"],
      tax_type: ["igic", "iva"],
      transmission_type: ["manual", "automatico"],
      validation_status: ["pendiente", "validado", "rechazado"],
      vehicle_class: ["turismo", "mixto", "industrial"],
      vehicle_status: ["disponible", "reservado", "vendido", "entregado"],
      vehicle_type: ["nuevo", "ocasion", "usado"],
    },
  },
} as const
