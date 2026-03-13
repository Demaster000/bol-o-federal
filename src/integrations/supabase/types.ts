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
      lottery_types: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          pool_id: string | null
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pool_id?: string | null
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pool_id?: string | null
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payments: {
        Row: {
          created_at: string
          efi_charge_id: string | null
          expires_at: string
          id: string
          loc_id: string | null
          paid_at: string | null
          pool_id: string
          qr_code: string | null
          qr_code_image: string | null
          quantity: number
          status: string
          total_amount: number
          txid: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          efi_charge_id?: string | null
          expires_at?: string
          id?: string
          loc_id?: string | null
          paid_at?: string | null
          pool_id: string
          qr_code?: string | null
          qr_code_image?: string | null
          quantity?: number
          status?: string
          total_amount: number
          txid?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          efi_charge_id?: string | null
          expires_at?: string
          id?: string
          loc_id?: string | null
          paid_at?: string | null
          pool_id?: string
          qr_code?: string | null
          qr_code_image?: string | null
          quantity?: number
          status?: string
          total_amount?: number
          txid?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_payments_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_purchases: {
        Row: {
          created_at: string | null
          id: string
          pool_id: string
          quantity: number
          total_paid: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pool_id: string
          quantity?: number
          total_paid: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pool_id?: string
          quantity?: number
          total_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_purchases_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          created_at: string | null
          description: string | null
          draw_date: string | null
          id: string
          lottery_type_id: string
          numbers: Json | null
          price_per_quota: number
          prize_amount: number | null
          result: Json | null
          sold_quotas: number | null
          status: string | null
          title: string
          total_quotas: number
          unlimited_quotas: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          draw_date?: string | null
          id?: string
          lottery_type_id: string
          numbers?: Json | null
          price_per_quota: number
          prize_amount?: number | null
          result?: Json | null
          sold_quotas?: number | null
          status?: string | null
          title: string
          total_quotas?: number
          unlimited_quotas?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          draw_date?: string | null
          id?: string
          lottery_type_id?: string
          numbers?: Json | null
          price_per_quota?: number
          prize_amount?: number | null
          result?: Json | null
          sold_quotas?: number | null
          status?: string | null
          title?: string
          total_quotas?: number
          unlimited_quotas?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pools_lottery_type_id_fkey"
            columns: ["lottery_type_id"]
            isOneToOne: false
            referencedRelation: "lottery_types"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_claims: {
        Row: {
          accepted_terms: boolean
          amount: number
          cpf: string
          created_at: string
          full_name: string
          id: string
          pix_key: string
          pool_id: string
          purchase_id: string | null
          rejection_reason: string | null
          signed_contract: Json | null
          status: string
          user_id: string
        }
        Insert: {
          accepted_terms?: boolean
          amount: number
          cpf: string
          created_at?: string
          full_name?: string
          id?: string
          pix_key: string
          pool_id: string
          purchase_id?: string | null
          rejection_reason?: string | null
          signed_contract?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          accepted_terms?: boolean
          amount?: number
          cpf?: string
          created_at?: string
          full_name?: string
          id?: string
          pix_key?: string
          pool_id?: string
          purchase_id?: string | null
          rejection_reason?: string | null
          signed_contract?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_claims_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_claims_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "pool_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          pool_id: string
          purchase_id: string | null
          referral_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pool_id: string
          purchase_id?: string | null
          referral_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pool_id?: string
          purchase_id?: string | null
          referral_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "pool_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_settings: {
        Row: {
          api_key: string | null
          api_url: string | null
          broadcast_interval_minutes: number | null
          broadcast_open_pools: boolean | null
          channel_id: string | null
          created_at: string | null
          enabled: boolean | null
          group_id: string | null
          id: string
          instance_name: string | null
          notify_new_pool: boolean | null
          notify_result: boolean | null
          send_to_channel: boolean | null
          site_url: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          broadcast_interval_minutes?: number | null
          broadcast_open_pools?: boolean | null
          channel_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          group_id?: string | null
          id?: string
          instance_name?: string | null
          notify_new_pool?: boolean | null
          notify_result?: boolean | null
          send_to_channel?: boolean | null
          site_url?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          broadcast_interval_minutes?: number | null
          broadcast_open_pools?: boolean | null
          channel_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          group_id?: string | null
          id?: string
          instance_name?: string | null
          notify_new_pool?: boolean | null
          notify_result?: boolean | null
          send_to_channel?: boolean | null
          site_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_referral_code: { Args: { _code: string }; Returns: string }
      trigger_whatsapp_broadcast: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
