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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          listing_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["category_status"]
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["category_status"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["category_status"]
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          idempotency_key: string | null
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["credit_ledger_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["credit_ledger_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["credit_ledger_type"]
          user_id?: string
        }
        Relationships: []
      }
      daily_allocations: {
        Row: {
          amount_cents: number
          first_allocated_at: string
          listing_id: string
          utc_date: string
        }
        Insert: {
          amount_cents?: number
          first_allocated_at?: string
          listing_id: string
          utc_date: string
        }
        Update: {
          amount_cents?: number
          first_allocated_at?: string
          listing_id?: string
          utc_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_allocations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rank_snapshots: {
        Row: {
          allocation_cents: number
          frozen_at: string
          listing_id: string
          rank: number
          shares: number
          unique_views: number
          utc_date: string
        }
        Insert: {
          allocation_cents: number
          frozen_at?: string
          listing_id: string
          rank: number
          shares?: number
          unique_views?: number
          utc_date: string
        }
        Update: {
          allocation_cents?: number
          frozen_at?: string
          listing_id?: string
          rank?: number
          shares?: number
          unique_views?: number
          utc_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_rank_snapshots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          listing_id: string
          visitor_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["event_kind"]
          listing_id: string
          visitor_key: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          listing_id?: string
          visitor_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          allocation_cents: number
          allocation_set_at: string | null
          approved_at: string | null
          category_id: string
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          rejection_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          tagline: string
          updated_at: string
          url: string
        }
        Insert: {
          allocation_cents?: number
          allocation_set_at?: string | null
          approved_at?: string | null
          category_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id: string
          rejection_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          tagline: string
          updated_at?: string
          url: string
        }
        Update: {
          allocation_cents?: number
          allocation_set_at?: string | null
          approved_at?: string | null
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          rejection_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          tagline?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rankings: {
        Row: {
          computed_at: string
          listing_id: string
          previous_rank: number | null
          rank: number
          score: number
          shares: number
          unique_views: number
        }
        Insert: {
          computed_at?: string
          listing_id: string
          previous_rank?: number | null
          rank: number
          score?: number
          shares?: number
          unique_views?: number
        }
        Update: {
          computed_at?: string
          listing_id?: string
          previous_rank?: number | null
          rank?: number
          score?: number
          shares?: number
          unique_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "rankings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      today_rankings: {
        Row: {
          computed_at: string
          listing_id: string
          previous_rank: number | null
          rank: number
          score: number
          shares: number
          unique_views: number
        }
        Insert: {
          computed_at?: string
          listing_id: string
          previous_rank?: number | null
          rank: number
          score?: number
          shares?: number
          unique_views?: number
        }
        Update: {
          computed_at?: string
          listing_id?: string
          previous_rank?: number | null
          rank?: number
          score?: number
          shares?: number
          unique_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "today_rankings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_cents?: number
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_credits: {
        Args: {
          _cents: number
          _idempotency_key?: string
          _reason?: string
          _user_id: string
        }
        Returns: Json
      }
      freeze_daily_board: {
        Args: { _utc_date?: string }
        Returns: undefined
      }
      recompute_rankings: { Args: never; Returns: undefined }
      record_event: {
        Args: {
          _kind: Database["public"]["Enums"]["event_kind"]
          _listing_id: string
          _visitor_key: string
        }
        Returns: boolean
      }
      set_allocation: {
        Args: {
          _listing_id: string
          _new_cents: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      category_status: "active" | "hidden"
      credit_ledger_type:
        | "admin_grant"
        | "allocation"
        | "allocation_release"
        | "topup"
        | "points_conversion"
        | "adjustment"
      event_kind: "view" | "share"
      listing_status: "pending" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      category_status: ["active", "hidden"],
      credit_ledger_type: [
        "admin_grant",
        "allocation",
        "allocation_release",
        "topup",
        "points_conversion",
        "adjustment",
      ],
      event_kind: ["view", "share"],
      listing_status: ["pending", "approved", "rejected"],
    },
  },
} as const
