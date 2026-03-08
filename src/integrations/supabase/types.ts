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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["activity_type"]
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_name: string
          agent_type: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          agent_name: string
          agent_type?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agent_name?: string
          agent_type?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          position: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          position?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      containers: {
        Row: {
          cbm: number | null
          commodity: string | null
          container_number: string | null
          container_type: Database["public"]["Enums"]["container_type"]
          created_at: string
          id: string
          packages: number | null
          seal_number: string | null
          shipment_id: string
          weight_kg: number | null
        }
        Insert: {
          cbm?: number | null
          commodity?: string | null
          container_number?: string | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          id?: string
          packages?: number | null
          seal_number?: string | null
          shipment_id: string
          weight_kg?: number | null
        }
        Update: {
          cbm?: number | null
          commodity?: string | null
          container_number?: string | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          id?: string
          packages?: number | null
          seal_number?: string | null
          shipment_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "containers_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          id: string
          industry: string | null
          lead_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          id?: string
          industry?: string | null
          lead_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          id?: string
          industry?: string | null
          lead_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          shipment_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          shipment_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          shipment_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_name: string
          contact_name: string
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          industry: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          contact_name: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          contact_name?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          assigned_to: string | null
          created_at: string
          currency: string
          customer_id: string
          description: string | null
          estimated_value: number | null
          expected_close: string | null
          id: string
          mode: Database["public"]["Enums"]["shipment_mode"] | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          title: string
          trade_lane: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          description?: string | null
          estimated_value?: number | null
          expected_close?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["shipment_mode"] | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          title: string
          trade_lane?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          description?: string | null
          estimated_value?: number | null
          expected_close?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["shipment_mode"] | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          title?: string
          trade_lane?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          carrier_cost: number | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          destination: string | null
          id: string
          line_items: Json | null
          margin: number | null
          notes: string | null
          opportunity_id: string | null
          origin: string | null
          quote_number: string
          selling_price: number | null
          shipment_type: Database["public"]["Enums"]["shipment_mode"] | null
          status: Database["public"]["Enums"]["quotation_status"]
          terms: Json | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          carrier_cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          destination?: string | null
          id?: string
          line_items?: Json | null
          margin?: number | null
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          quote_number?: string
          selling_price?: number | null
          shipment_type?: Database["public"]["Enums"]["shipment_mode"] | null
          status?: Database["public"]["Enums"]["quotation_status"]
          terms?: Json | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          carrier_cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          destination?: string | null
          id?: string
          line_items?: Json | null
          margin?: number | null
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          quote_number?: string
          selling_price?: number | null
          shipment_type?: Database["public"]["Enums"]["shipment_mode"] | null
          status?: Database["public"]["Enums"]["quotation_status"]
          terms?: Json | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          agent_id: string | null
          assigned_to: string | null
          carrier: string | null
          created_at: string
          customer_id: string
          destination: string | null
          eta: string | null
          etd: string | null
          id: string
          mode: Database["public"]["Enums"]["shipment_mode"]
          notes: string | null
          opportunity_id: string | null
          origin: string | null
          profit: number | null
          quotation_id: string | null
          shipment_number: string
          status: Database["public"]["Enums"]["shipment_status"]
          total_cost: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          assigned_to?: string | null
          carrier?: string | null
          created_at?: string
          customer_id: string
          destination?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["shipment_mode"]
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          profit?: number | null
          quotation_id?: string | null
          shipment_number?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          total_cost?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          assigned_to?: string | null
          carrier?: string | null
          created_at?: string
          customer_id?: string
          destination?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["shipment_mode"]
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          profit?: number | null
          quotation_id?: string | null
          shipment_number?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          total_cost?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string
          due_date: string | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description: string
          due_date?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          location: string | null
          milestone: Database["public"]["Enums"]["tracking_milestone"]
          notes: string | null
          shipment_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          location?: string | null
          milestone: Database["public"]["Enums"]["tracking_milestone"]
          notes?: string | null
          shipment_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          location?: string | null
          milestone?: Database["public"]["Enums"]["tracking_milestone"]
          notes?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
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
    }
    Enums: {
      activity_type: "call" | "meeting" | "email"
      app_role: "admin" | "sales" | "operations" | "viewer"
      container_type:
        | "20ft"
        | "40ft"
        | "40hc"
        | "45ft"
        | "reefer_20"
        | "reefer_40"
      customer_status: "active" | "inactive" | "blacklisted"
      customer_type: "shipper" | "consignee" | "both"
      document_type:
        | "bill_of_lading"
        | "invoice"
        | "packing_list"
        | "customs_declaration"
        | "certificate_of_origin"
        | "other"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
      opportunity_stage:
        | "prospecting"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      shipment_mode: "fcl" | "lcl" | "air" | "land" | "multimodal"
      shipment_status:
        | "booked"
        | "in_transit"
        | "at_port"
        | "customs"
        | "delivered"
        | "cancelled"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      tracking_milestone:
        | "booking_confirmed"
        | "cargo_received"
        | "loaded_on_vessel"
        | "departed_origin"
        | "in_transit"
        | "arrived_destination"
        | "customs_clearance"
        | "out_for_delivery"
        | "delivered"
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
      activity_type: ["call", "meeting", "email"],
      app_role: ["admin", "sales", "operations", "viewer"],
      container_type: [
        "20ft",
        "40ft",
        "40hc",
        "45ft",
        "reefer_20",
        "reefer_40",
      ],
      customer_status: ["active", "inactive", "blacklisted"],
      customer_type: ["shipper", "consignee", "both"],
      document_type: [
        "bill_of_lading",
        "invoice",
        "packing_list",
        "customs_declaration",
        "certificate_of_origin",
        "other",
      ],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
      opportunity_stage: [
        "prospecting",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      shipment_mode: ["fcl", "lcl", "air", "land", "multimodal"],
      shipment_status: [
        "booked",
        "in_transit",
        "at_port",
        "customs",
        "delivered",
        "cancelled",
      ],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      tracking_milestone: [
        "booking_confirmed",
        "cargo_received",
        "loaded_on_vessel",
        "departed_origin",
        "in_transit",
        "arrived_destination",
        "customs_clearance",
        "out_for_delivery",
        "delivered",
      ],
    },
  },
} as const
