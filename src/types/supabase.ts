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
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_variant_id: string
          quantity: number | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_variant_id: string
          quantity?: number | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_variant_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          active_org_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_org_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_org_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_active_org_id_fkey"
            columns: ["active_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          expires_at: string
          id: string
          is_active: boolean | null
          max_uses: number
          org_id: string
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent: number
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_uses?: number
          org_id: string
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number
          org_id?: string
          times_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      global_categories: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_at_purchase: number
          product_variant_id: string | null
          quantity: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_at_purchase: number
          product_variant_id?: string | null
          quantity?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_variant_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string | null
          created_at: string
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id: string
          shipping_address_id: string | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id?: string
          shipping_address_id?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          id?: string
          shipping_address_id?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          member_role: Database["public"]["Enums"]["org_member_role"] | null
          org_id: string
          profile_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_role?: Database["public"]["Enums"]["org_member_role"] | null
          org_id: string
          profile_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_role?: Database["public"]["Enums"]["org_member_role"] | null
          org_id?: string
          profile_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_city: string | null
          address_district: string | null
          address_postal_code: string | null
          address_street: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          rejection_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"] | null
          tiktok_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_city?: string | null
          address_district?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          rejection_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"] | null
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_city?: string | null
          address_district?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          rejection_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"] | null
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          midtrans_transaction_id: string | null
          order_id: string
          payment_type: string | null
          snap_token: string | null
          transaction_status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          midtrans_transaction_id?: string | null
          order_id: string
          payment_type?: string | null
          snap_token?: string | null
          transaction_status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          midtrans_transaction_id?: string | null
          order_id?: string
          payment_type?: string | null
          snap_token?: string | null
          transaction_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: number
          is_maintenance_mode: boolean
          platform_name: string
          support_email: string
          transaction_fee_percent: number
          updated_at: string | null
        }
        Insert: {
          id?: number
          is_maintenance_mode?: boolean
          platform_name?: string
          support_email?: string
          transaction_fee_percent?: number
          updated_at?: string | null
        }
        Update: {
          id?: number
          is_maintenance_mode?: boolean
          platform_name?: string
          support_email?: string
          transaction_fee_percent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          price_override: number | null
          product_id: string
          stock: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          price_override?: number | null
          product_id: string
          stock?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          price_override?: number | null
          product_id?: string
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          created_at: string
          deleted_at: string | null
          description: string | null
          global_category_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          org_id: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          base_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          global_category_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          org_id: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          base_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          global_category_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          org_id?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_global_category_id_fkey"
            columns: ["global_category_id"]
            isOneToOne: false
            referencedRelation: "global_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          image_url: string | null
          order_id: string
          product_id: string
          rating: number
          replied_at: string | null
          reply_comment: string | null
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          order_id: string
          product_id: string
          rating: number
          replied_at?: string | null
          reply_comment?: string | null
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string
          rating?: number
          replied_at?: string | null
          reply_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          postal_code: string
          street_address: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          postal_code: string
          street_address: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          postal_code?: string
          street_address?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          account_holder: string
          account_number: string
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          org_id: string
          proof_image_url: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
        }
        Insert: {
          account_holder: string
          account_number: string
          admin_note?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          org_id: string
          proof_image_url?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
        }
        Update: {
          account_holder?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          org_id?: string
          proof_image_url?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_is_org_admin_v2: {
        Args: { lookup_org_id: string }
        Returns: boolean
      }
      get_my_org_ids: { Args: never; Returns: string[] }
      get_my_org_ids_v2: { Args: never; Returns: string[] }
      is_org_admin: { Args: { lookup_org_id: string }; Returns: boolean }
      register_merchant_transaction: {
        Args: {
          p_email: string
          p_full_name: string
          p_store_desc: string
          p_store_name: string
          p_store_slug: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      delivery_method: "pickup" | "shipping"
      order_status:
        | "pending"
        | "paid"
        | "packed"
        | "shipped"
        | "completed"
        | "cancelled"
      org_member_role: "owner" | "admin" | "staff"
      org_status: "pending" | "active" | "rejected"
      user_role: "buyer" | "merchant" | "super_admin"
      withdrawal_status: "requested" | "approved" | "rejected"
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
      delivery_method: ["pickup", "shipping"],
      order_status: [
        "pending",
        "paid",
        "packed",
        "shipped",
        "completed",
        "cancelled",
      ],
      org_member_role: ["owner", "admin", "staff"],
      org_status: ["pending", "active", "rejected"],
      user_role: ["buyer", "merchant", "super_admin"],
      withdrawal_status: ["requested", "approved", "rejected"],
    },
  },
} as const
