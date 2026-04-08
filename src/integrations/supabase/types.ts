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
      captain_selections: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          manager_id: string
          race_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          manager_id: string
          race_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          manager_id?: string
          race_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captain_selections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_selections_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_selections_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_selections_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          bio: string | null
          car_number: number
          club: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          price: number
          quote: string | null
          team: string
          tier: string | null
          withdrawn: boolean
        }
        Insert: {
          bio?: string | null
          car_number: number
          club?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          price?: number
          quote?: string | null
          team: string
          tier?: string | null
          withdrawn?: boolean
        }
        Update: {
          bio?: string | null
          car_number?: number
          club?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          price?: number
          quote?: string | null
          team?: string
          tier?: string | null
          withdrawn?: boolean
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      manager_drivers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          manager_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          manager_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_drivers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_drivers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          budget_remaining: number
          created_at: string
          email: string
          id: string
          name: string
          slug: string | null
          team_name: string
          total_points: number
          user_id: string | null
        }
        Insert: {
          budget_remaining?: number
          created_at?: string
          email: string
          id?: string
          name: string
          slug?: string | null
          team_name: string
          total_points?: number
          user_id?: string | null
        }
        Update: {
          budget_remaining?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          slug?: string | null
          team_name?: string
          total_points?: number
          user_id?: string | null
        }
        Relationships: []
      }
      prediction_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean | null
          manager_id: string
          question_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          manager_id: string
          question_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          manager_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_answers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_answers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_categories: {
        Row: {
          created_at: string
          id: string
          is_duel: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_duel?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_duel?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      prediction_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          id: string
          option_a: string | null
          option_b: string | null
          prediction_deadline: string | null
          published: boolean
          question_text: string
          question_type: string
          race_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          option_a?: string | null
          option_b?: string | null
          prediction_deadline?: string | null
          published?: boolean
          question_text: string
          question_type: string
          race_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          option_a?: string | null
          option_b?: string | null
          prediction_deadline?: string | null
          published?: boolean
          question_text?: string
          question_type?: string
          race_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_questions_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          created_at: string
          description: string | null
          drawn_at: string | null
          id: string
          name: string
          prize_category: string
          winner_manager_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          drawn_at?: string | null
          id?: string
          name: string
          prize_category?: string
          winner_manager_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          drawn_at?: string | null
          id?: string
          name?: string
          prize_category?: string
          winner_manager_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prizes_winner_manager_id_fkey"
            columns: ["winner_manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prizes_winner_manager_id_fkey"
            columns: ["winner_manager_id"]
            isOneToOne: false
            referencedRelation: "managers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      race_results: {
        Row: {
          created_at: string
          dnf: boolean
          driver_id: string
          fastest_lap: boolean
          id: string
          points: number
          pole_position: boolean
          position: number | null
          race_id: string
          session_type: string
        }
        Insert: {
          created_at?: string
          dnf?: boolean
          driver_id: string
          fastest_lap?: boolean
          id?: string
          points?: number
          pole_position?: boolean
          position?: number | null
          race_id: string
          session_type?: string
        }
        Update: {
          created_at?: string
          dnf?: boolean
          driver_id?: string
          fastest_lap?: boolean
          id?: string
          points?: number
          pole_position?: boolean
          position?: number | null
          race_id?: string
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_results_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          address: string | null
          captain_deadline: string | null
          created_at: string
          id: string
          links: Json | null
          location: string | null
          name: string
          race_date: string | null
          round_number: number
        }
        Insert: {
          address?: string | null
          captain_deadline?: string | null
          created_at?: string
          id?: string
          links?: Json | null
          location?: string | null
          name: string
          race_date?: string | null
          round_number: number
        }
        Update: {
          address?: string | null
          captain_deadline?: string | null
          created_at?: string
          id?: string
          links?: Json | null
          location?: string | null
          name?: string
          race_date?: string | null
          round_number?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          sort_order: number
          tagline: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          sort_order?: number
          tagline?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          sort_order?: number
          tagline?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string
          id: string
          is_free: boolean
          manager_id: string
          new_driver_id: string
          old_driver_id: string
          point_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_free?: boolean
          manager_id: string
          new_driver_id: string
          old_driver_id: string
          point_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_free?: boolean
          manager_id?: string
          new_driver_id?: string
          old_driver_id?: string
          point_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_new_driver_id_fkey"
            columns: ["new_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_old_driver_id_fkey"
            columns: ["old_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
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
      voucher_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      managers_public: {
        Row: {
          budget_remaining: number | null
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
          team_name: string | null
          total_points: number | null
        }
        Insert: {
          budget_remaining?: number | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          team_name?: string | null
          total_points?: number | null
        }
        Update: {
          budget_remaining?: number | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          team_name?: string | null
          total_points?: number | null
        }
        Relationships: []
      }
      prediction_questions_public: {
        Row: {
          created_at: string | null
          id: string | null
          option_a: string | null
          option_b: string | null
          prediction_deadline: string | null
          published: boolean | null
          question_text: string | null
          question_type: string | null
          race_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          option_a?: string | null
          option_b?: string | null
          prediction_deadline?: string | null
          published?: boolean | null
          question_text?: string | null
          question_type?: string | null
          race_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          option_a?: string | null
          option_b?: string | null
          prediction_deadline?: string | null
          published?: boolean | null
          question_text?: string | null
          question_type?: string | null
          race_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_questions_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
