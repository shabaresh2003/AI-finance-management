export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          card_number: string | null
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          balance?: number
          card_number?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          balance?: number
          card_number?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_alert_logs: {
        Row: {
          budget_id: string
          category: string
          created_at: string | null
          email_sent_to: string
          id: string
          percentage_used: number
          user_id: string
        }
        Insert: {
          budget_id: string
          category: string
          created_at?: string | null
          email_sent_to: string
          id?: string
          percentage_used: number
          user_id: string
        }
        Update: {
          budget_id?: string
          category?: string
          created_at?: string | null
          email_sent_to?: string
          id?: string
          percentage_used?: number
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          spent: number
          total: number
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          spent?: number
          total: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          spent?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      credit_scores: {
        Row: {
          account_age: string | null
          created_at: string
          credit_utilization: string | null
          id: string
          payment_history: string | null
          score: number
          user_id: string
        }
        Insert: {
          account_age?: string | null
          created_at?: string
          credit_utilization?: string | null
          id?: string
          payment_history?: string | null
          score: number
          user_id: string
        }
        Update: {
          account_age?: string | null
          created_at?: string
          credit_utilization?: string | null
          id?: string
          payment_history?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          content: string
          email_to: string
          email_type: string
          id: string
          sent_at: string
          subject: string
          user_id: string
        }
        Insert: {
          content: string
          email_to: string
          email_type: string
          id?: string
          sent_at?: string
          subject: string
          user_id: string
        }
        Update: {
          content?: string
          email_to?: string
          email_type?: string
          id?: string
          sent_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          currency: string | null
          id: string
          report_frequency: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          currency?: string | null
          id: string
          report_frequency?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          currency?: string | null
          id?: string
          report_frequency?: string | null
          username?: string | null
        }
        Relationships: []
      }
      report_history: {
        Row: {
          email_sent_to: string
          frequency: string
          id: string
          report_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_sent_to: string
          frequency: string
          id?: string
          report_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_sent_to?: string
          frequency?: string
          id?: string
          report_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          id?: string
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
