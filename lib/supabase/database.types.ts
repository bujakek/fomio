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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          event_date: string | null
          event_name: string
          gallery_hidden_at: string | null
          id: string
          owner_id: string
          slug: string
          uploads_close_at: string | null
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_name: string
          gallery_hidden_at?: string | null
          id?: string
          owner_id: string
          slug: string
          uploads_close_at?: string | null
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_name?: string
          gallery_hidden_at?: string | null
          id?: string
          owner_id?: string
          slug?: string
          uploads_close_at?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          byte_size: number | null
          created_at: string
          event_id: string
          height: number | null
          hidden_at: string | null
          id: string
          mime_type: string | null
          storage_path: string
          taken_at: string | null
          thumb_path: string
          uploader_name: string | null
          view_path: string | null
          width: number | null
        }
        Insert: {
          byte_size?: number | null
          created_at?: string
          event_id: string
          height?: number | null
          hidden_at?: string | null
          id?: string
          mime_type?: string | null
          storage_path: string
          taken_at?: string | null
          thumb_path: string
          uploader_name?: string | null
          view_path?: string | null
          width?: number | null
        }
        Update: {
          byte_size?: number | null
          created_at?: string
          event_id?: string
          height?: number | null
          hidden_at?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          taken_at?: string | null
          thumb_path?: string
          uploader_name?: string | null
          view_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_minor: number | null
          created_at: string
          currency: string | null
          event_id: string
          id: string
          owner_id: string
          paid_at: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          stripe_checkout_session_id: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          event_id: string
          id?: string
          owner_id: string
          paid_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_checkout_session_id: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          event_id?: string
          id?: string
          owner_id?: string
          paid_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_checkout_session_id?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_accepts_uploads: { Args: { p_event_id: string }; Returns: boolean }
      event_by_slug: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          event_date: string
          event_name: string
          gallery_private: boolean
          id: string
          slug: string
          uploads_close_at: string
        }[]
      }
      event_folder_accepts_uploads: {
        Args: { p_folder: string }
        Returns: boolean
      }
      event_gallery_by_slug: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          height: number
          id: string
          storage_path: string
          thumb_path: string
          uploader_name: string
          view_path: string
          width: number
        }[]
      }
      event_has_unlimited_uploads: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      event_page_by_slug: {
        Args: { p_slug: string }
        Returns: {
          contributor_count: number
          created_at: string
          event_date: string
          event_name: string
          gallery_private: boolean
          has_named_contributors: boolean
          id: string
          photo_count: number
          slug: string
          uploads_close_at: string
        }[]
      }
      event_photo_count_capped: {
        Args: { p_cap: number; p_event_id: string }
        Returns: number
      }
      event_photos: {
        Args: { p_event_id: string }
        Returns: {
          created_at: string
          height: number
          id: string
          storage_path: string
          thumb_path: string
          uploader_name: string
          view_path: string
          width: number
        }[]
      }
      event_upload_quota: {
        Args: { p_event_id: string }
        Returns: {
          photo_limit: number
          remaining: number
          unlimited: boolean
        }[]
      }
      event_within_photo_limit: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      free_photo_limit: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      owned_events_with_previews: {
        Args: never
        Returns: {
          created_at: string
          event_date: string
          event_name: string
          gallery_hidden_at: string
          id: string
          photo_count: number
          previews: string[]
          slug: string
          uploads_close_at: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin"
      purchase_status: "pending" | "paid" | "refunded"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["user", "admin"],
      purchase_status: ["pending", "paid", "refunded"],
    },
  },
} as const
