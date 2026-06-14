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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          date_added: string
          email: string | null
          full_name: string
          id: string
          insurance_on_file: boolean
          license_expiry: string | null
          license_number: string | null
          notes: string | null
          phone: string | null
          rideshare_platform:
            | Database["public"]["Enums"]["rideshare_platform"]
            | null
          status: Database["public"]["Enums"]["driver_status"]
          user_id: string | null
        }
        Insert: {
          date_added?: string
          email?: string | null
          full_name: string
          id?: string
          insurance_on_file?: boolean
          license_expiry?: string | null
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          rideshare_platform?:
            | Database["public"]["Enums"]["rideshare_platform"]
            | null
          status?: Database["public"]["Enums"]["driver_status"]
          user_id?: string | null
        }
        Update: {
          date_added?: string
          email?: string | null
          full_name?: string
          id?: string
          insurance_on_file?: boolean
          license_expiry?: string | null
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          rideshare_platform?:
            | Database["public"]["Enums"]["rideshare_platform"]
            | null
          status?: Database["public"]["Enums"]["driver_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          id: string
          notes: string | null
          receipt_url: string | null
          staff_id: string | null
          vehicle_id: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          staff_id?: string | null
          vehicle_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          staff_id?: string | null
          vehicle_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
      inspections: {
        Row: {
          checklist_items: Json
          completed_by: string | null
          damage_noted: boolean
          damage_photos: string[] | null
          date: string
          fuel_level: string | null
          id: string
          inspector_name: string | null
          job_type: string | null
          mileage: number | null
          notes: string | null
          ready_to_rent: boolean | null
          rental_id: string | null
          submitted_at: string
          type: Database["public"]["Enums"]["inspection_type"]
          vehicle_id: string
        }
        Insert: {
          checklist_items?: Json
          completed_by?: string | null
          damage_noted?: boolean
          damage_photos?: string[] | null
          date?: string
          fuel_level?: string | null
          id?: string
          inspector_name?: string | null
          job_type?: string | null
          mileage?: number | null
          notes?: string | null
          ready_to_rent?: boolean | null
          rental_id?: string | null
          submitted_at?: string
          type: Database["public"]["Enums"]["inspection_type"]
          vehicle_id: string
        }
        Update: {
          checklist_items?: Json
          completed_by?: string | null
          damage_noted?: boolean
          damage_photos?: string[] | null
          date?: string
          fuel_level?: string | null
          id?: string
          inspector_name?: string | null
          job_type?: string | null
          mileage?: number | null
          notes?: string | null
          ready_to_rent?: boolean | null
          rental_id?: string | null
          submitted_at?: string
          type?: Database["public"]["Enums"]["inspection_type"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance: {
        Row: {
          cost: number | null
          created_at: string
          date_completed: string
          down_payment: number | null
          estimated_return_at: string | null
          id: string
          line_items: Json
          mileage_at_service: number | null
          next_service_due: string | null
          notes: string | null
          problem_type: string | null
          service_type: string
          source_inspection_id: string | null
          vehicle_id: string
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          date_completed: string
          down_payment?: number | null
          estimated_return_at?: string | null
          id?: string
          line_items?: Json
          mileage_at_service?: number | null
          next_service_due?: string | null
          notes?: string | null
          problem_type?: string | null
          service_type: string
          source_inspection_id?: string | null
          vehicle_id: string
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          date_completed?: string
          down_payment?: number | null
          estimated_return_at?: string | null
          id?: string
          line_items?: Json
          mileage_at_service?: number | null
          next_service_due?: string | null
          notes?: string | null
          problem_type?: string | null
          service_type?: string
          source_inspection_id?: string | null
          vehicle_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_source_inspection_id_fkey"
            columns: ["source_inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          driver_id: string
          due_date: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_date: string | null
          rental_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id: string
          due_date: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_date?: string | null
          rental_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string
          due_date?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_date?: string | null
          rental_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_line_items: {
        Row: {
          deductions: number | null
          gross_pay: number | null
          hours_worked: number | null
          id: string
          net_pay: number | null
          payroll_id: string
          staff_id: string
          status: Database["public"]["Enums"]["line_status"]
          stripe_transfer_id: string | null
          vehicles_handled: number | null
        }
        Insert: {
          deductions?: number | null
          gross_pay?: number | null
          hours_worked?: number | null
          id?: string
          net_pay?: number | null
          payroll_id: string
          staff_id: string
          status?: Database["public"]["Enums"]["line_status"]
          stripe_transfer_id?: string | null
          vehicles_handled?: number | null
        }
        Update: {
          deductions?: number | null
          gross_pay?: number | null
          hours_worked?: number | null
          id?: string
          net_pay?: number | null
          payroll_id?: string
          staff_id?: string
          status?: Database["public"]["Enums"]["line_status"]
          stripe_transfer_id?: string | null
          vehicles_handled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_line_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          run_date: string | null
          status: Database["public"]["Enums"]["payroll_status"]
          total_payout: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          run_date?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          total_payout?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          run_date?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          total_payout?: number | null
        }
        Relationships: []
      }
      pnl_snapshots: {
        Row: {
          created_at: string
          end_date: string
          id: string
          margin_pct: number | null
          net_profit: number | null
          payroll_total: number | null
          period: string
          start_date: string
          total_expenses: number | null
          total_revenue: number | null
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          margin_pct?: number | null
          net_profit?: number | null
          payroll_total?: number | null
          period: string
          start_date: string
          total_expenses?: number | null
          total_revenue?: number | null
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          margin_pct?: number | null
          net_profit?: number | null
          payroll_total?: number | null
          period?: string
          start_date?: string
          total_expenses?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      rentals: {
        Row: {
          created_at: string
          deposit_paid: number
          driver_id: string
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          payment_status: Database["public"]["Enums"]["rental_payment_status"]
          return_condition: string | null
          start_date: string
          updated_at: string
          vehicle_id: string
          weekly_rate: number
        }
        Insert: {
          created_at?: string
          deposit_paid?: number
          driver_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["rental_payment_status"]
          return_condition?: string | null
          start_date: string
          updated_at?: string
          vehicle_id: string
          weekly_rate: number
        }
        Update: {
          created_at?: string
          deposit_paid?: number
          driver_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["rental_payment_status"]
          return_condition?: string | null
          start_date?: string
          updated_at?: string
          vehicle_id?: string
          weekly_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "rentals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          rental_id: string | null
          source: Database["public"]["Enums"]["revenue_source"]
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          rental_id?: string | null
          source: Database["public"]["Enums"]["revenue_source"]
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          rental_id?: string | null
          source?: Database["public"]["Enums"]["revenue_source"]
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          pay_rate: number | null
          pay_type: Database["public"]["Enums"]["staff_pay_type"] | null
          phone: string | null
          role: string | null
          status: Database["public"]["Enums"]["staff_status"]
          stripe_account_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          pay_rate?: number | null
          pay_type?: Database["public"]["Enums"]["staff_pay_type"] | null
          phone?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          stripe_account_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          pay_rate?: number | null
          pay_type?: Database["public"]["Enums"]["staff_pay_type"] | null
          phone?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          stripe_account_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          completed_by_name: string | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          notes: string | null
          plate: string | null
          priority: number
          priority_level: string
          runner_name: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          completed_at?: string | null
          completed_by_name?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          plate?: string | null
          priority?: number
          priority_level?: string
          runner_name?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          completed_at?: string | null
          completed_by_name?: string | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          plate?: string | null
          priority?: number
          priority_level?: string
          runner_name?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          daily_rate: number | null
          has_open_issues: boolean
          id: string
          make: string
          mileage: number
          model: string
          notes: string | null
          plate: string
          risk_tier: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vin: string | null
          weekly_rate: number | null
          year: number
        }
        Insert: {
          created_at?: string
          daily_rate?: number | null
          has_open_issues?: boolean
          id?: string
          make: string
          mileage?: number
          model: string
          notes?: string | null
          plate: string
          risk_tier?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vin?: string | null
          weekly_rate?: number | null
          year: number
        }
        Update: {
          created_at?: string
          daily_rate?: number | null
          has_open_issues?: boolean
          id?: string
          make?: string
          mileage?: number
          model?: string
          notes?: string | null
          plate?: string
          risk_tier?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vin?: string | null
          weekly_rate?: number | null
          year?: number
        }
        Relationships: []
      }
      violations: {
        Row: {
          amount: number | null
          created_at: string
          date_issued: string
          driver_id: string | null
          id: string
          location: string | null
          notes: string | null
          plate_text: string | null
          raw: Json | null
          rental_id: string | null
          source: string
          status: Database["public"]["Enums"]["violation_status"]
          time_issued: string | null
          type: Database["public"]["Enums"]["violation_type"]
          vehicle_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          date_issued: string
          driver_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          plate_text?: string | null
          raw?: Json | null
          rental_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["violation_status"]
          time_issued?: string | null
          type: Database["public"]["Enums"]["violation_type"]
          vehicle_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          date_issued?: string
          driver_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          plate_text?: string | null
          raw?: Json | null
          rental_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["violation_status"]
          time_issued?: string | null
          type?: Database["public"]["Enums"]["violation_type"]
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "violations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "driver" | "staff"
      driver_status: "active" | "suspended" | "pending"
      expense_category:
        | "payroll"
        | "maintenance"
        | "fuel"
        | "insurance"
        | "registration"
        | "impound"
        | "misc"
      inspection_type: "check-in" | "check-out"
      line_status: "pending" | "sent" | "failed"
      payment_method: "cash" | "zelle" | "card" | "stripe"
      payment_status: "paid" | "late" | "missed"
      payroll_status: "draft" | "approved" | "paid"
      rental_payment_status: "current" | "late" | "defaulted"
      revenue_source: "rental" | "late_fee" | "deposit_kept" | "damage_charge"
      rideshare_platform: "uber" | "lyft" | "both"
      staff_pay_type: "hourly" | "salary" | "per-vehicle"
      staff_status: "active" | "inactive"
      task_status: "pending" | "done"
      vehicle_status: "available" | "rented" | "maintenance" | "impound"
      violation_status:
        | "pending"
        | "paid"
        | "contested"
        | "unmatched"
        | "matched"
        | "not_our_vehicle"
      violation_type: "PPA" | "ticket" | "impound"
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
      app_role: ["admin", "driver", "staff"],
      driver_status: ["active", "suspended", "pending"],
      expense_category: [
        "payroll",
        "maintenance",
        "fuel",
        "insurance",
        "registration",
        "impound",
        "misc",
      ],
      inspection_type: ["check-in", "check-out"],
      line_status: ["pending", "sent", "failed"],
      payment_method: ["cash", "zelle", "card", "stripe"],
      payment_status: ["paid", "late", "missed"],
      payroll_status: ["draft", "approved", "paid"],
      rental_payment_status: ["current", "late", "defaulted"],
      revenue_source: ["rental", "late_fee", "deposit_kept", "damage_charge"],
      rideshare_platform: ["uber", "lyft", "both"],
      staff_pay_type: ["hourly", "salary", "per-vehicle"],
      staff_status: ["active", "inactive"],
      task_status: ["pending", "done"],
      vehicle_status: ["available", "rented", "maintenance", "impound"],
      violation_status: [
        "pending",
        "paid",
        "contested",
        "unmatched",
        "matched",
        "not_our_vehicle",
      ],
      violation_type: ["PPA", "ticket", "impound"],
    },
  },
} as const
