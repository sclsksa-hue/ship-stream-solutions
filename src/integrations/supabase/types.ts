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
      activity_logs: {
        Row: {
          action: string | null
          created_at: string
          id: string
          metadata: Json | null
          page_visited: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          page_visited?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          page_visited?: string | null
          user_id?: string
        }
        Relationships: []
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_requests: {
        Row: {
          assigned_to: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          customer_id: string
          destination: string | null
          details: string | null
          id: string
          internal_notes: string | null
          origin: string | null
          priority: Database["public"]["Enums"]["client_request_priority"]
          quotation_id: string | null
          request_number: string
          required_date: string | null
          service_type: string | null
          status: Database["public"]["Enums"]["client_request_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string | null
          customer_id: string
          destination?: string | null
          details?: string | null
          id?: string
          internal_notes?: string | null
          origin?: string | null
          priority?: Database["public"]["Enums"]["client_request_priority"]
          quotation_id?: string | null
          request_number?: string
          required_date?: string | null
          service_type?: string | null
          status?: Database["public"]["Enums"]["client_request_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string
          destination?: string | null
          details?: string | null
          id?: string
          internal_notes?: string | null
          origin?: string | null
          priority?: Database["public"]["Enums"]["client_request_priority"]
          quotation_id?: string | null
          request_number?: string
          required_date?: string | null
          service_type?: string | null
          status?: Database["public"]["Enums"]["client_request_status"]
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
          category: Database["public"]["Enums"]["customer_category"]
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
          category?: Database["public"]["Enums"]["customer_category"]
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
          category?: Database["public"]["Enums"]["customer_category"]
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
      customs_declarations: {
        Row: {
          broker_contact: string | null
          cleared_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customs_broker: string | null
          declaration_number: string | null
          declaration_type: Database["public"]["Enums"]["customs_declaration_type"]
          declared_value: number | null
          duties_amount: number | null
          hs_code: string | null
          id: string
          notes: string | null
          regulatory_checks: Json | null
          shipment_id: string
          status: Database["public"]["Enums"]["customs_status"]
          submitted_at: string | null
          taxes_amount: number | null
          updated_at: string
        }
        Insert: {
          broker_contact?: string | null
          cleared_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customs_broker?: string | null
          declaration_number?: string | null
          declaration_type?: Database["public"]["Enums"]["customs_declaration_type"]
          declared_value?: number | null
          duties_amount?: number | null
          hs_code?: string | null
          id?: string
          notes?: string | null
          regulatory_checks?: Json | null
          shipment_id: string
          status?: Database["public"]["Enums"]["customs_status"]
          submitted_at?: string | null
          taxes_amount?: number | null
          updated_at?: string
        }
        Update: {
          broker_contact?: string | null
          cleared_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customs_broker?: string | null
          declaration_number?: string | null
          declaration_type?: Database["public"]["Enums"]["customs_declaration_type"]
          declared_value?: number | null
          duties_amount?: number | null
          hs_code?: string | null
          id?: string
          notes?: string | null
          regulatory_checks?: Json | null
          shipment_id?: string
          status?: Database["public"]["Enums"]["customs_status"]
          submitted_at?: string | null
          taxes_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customs_declarations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
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
          avatar_url: string | null
          bio: string | null
          created_at: string
          customer_id: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          manager_id: string | null
          phone: string | null
          position: string | null
          updated_at: string
          work_schedule: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          customer_id?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          manager_id?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          work_schedule?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          customer_id?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
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
          invoiced: boolean
          invoiced_at: string | null
          invoiced_by: string | null
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
          invoiced?: boolean
          invoiced_at?: string | null
          invoiced_by?: string | null
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
          invoiced?: boolean
          invoiced_at?: string | null
          invoiced_by?: string | null
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
      shipment_exceptions: {
        Row: {
          created_at: string
          description: string | null
          exception_type: string
          id: string
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          shipment_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exception_type?: string
          id?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          shipment_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exception_type?: string
          id?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          shipment_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_exceptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
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
      warehouse_orders: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json | null
          notes: string | null
          order_type: Database["public"]["Enums"]["warehouse_order_type"]
          reference_number: string | null
          scheduled_date: string | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["warehouse_order_status"]
          total_cbm: number | null
          total_packages: number | null
          total_weight_kg: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_type?: Database["public"]["Enums"]["warehouse_order_type"]
          reference_number?: string | null
          scheduled_date?: string | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["warehouse_order_status"]
          total_cbm?: number | null
          total_packages?: number | null
          total_weight_kg?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_type?: Database["public"]["Enums"]["warehouse_order_type"]
          reference_number?: string | null
          scheduled_date?: string | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["warehouse_order_status"]
          total_cbm?: number | null
          total_packages?: number | null
          total_weight_kg?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          capacity_cbm: number | null
          city: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          notes: string | null
          updated_at: string
          used_cbm: number | null
          warehouse_type: string | null
        }
        Insert: {
          capacity_cbm?: number | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          used_cbm?: number | null
          warehouse_type?: string | null
        }
        Update: {
          capacity_cbm?: number | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          used_cbm?: number | null
          warehouse_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_record: {
        Args: { _assigned_to: string; _created_by?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_name: { Args: { _role: string; _uid: string }; Returns: boolean }
      is_manager_of: {
        Args: { _employee: string; _manager: string }
        Returns: boolean
      }
      notify_role: {
        Args: {
          _message: string
          _priority?: string
          _reference_id?: string
          _reference_type?: string
          _role: Database["public"]["Enums"]["app_role"]
          _title: string
          _type?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_type: "call" | "meeting" | "email"
      app_role:
        | "admin"
        | "sales"
        | "operations"
        | "viewer"
        | "manager"
        | "accountant"
        | "customer"
        | "super_admin"
        | "sales_manager"
        | "sales_agent"
        | "marketing"
        | "finance"
      client_request_priority: "normal" | "urgent" | "critical"
      client_request_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      container_type:
        | "20ft"
        | "40ft"
        | "40hc"
        | "45ft"
        | "reefer_20"
        | "reefer_40"
      customer_category: "vip" | "regular" | "lead"
      customer_status: "active" | "inactive" | "blacklisted"
      customer_type: "shipper" | "consignee" | "both"
      customs_declaration_type: "import" | "export" | "transit"
      customs_status:
        | "pending"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "released"
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
      warehouse_order_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      warehouse_order_type:
        | "receive"
        | "put_away"
        | "pick"
        | "pack"
        | "dispatch"
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
      app_role: [
        "admin",
        "sales",
        "operations",
        "viewer",
        "manager",
        "accountant",
        "customer",
        "super_admin",
        "sales_manager",
        "sales_agent",
        "marketing",
        "finance",
      ],
      client_request_priority: ["normal", "urgent", "critical"],
      client_request_status: [
        "new",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      container_type: [
        "20ft",
        "40ft",
        "40hc",
        "45ft",
        "reefer_20",
        "reefer_40",
      ],
      customer_category: ["vip", "regular", "lead"],
      customer_status: ["active", "inactive", "blacklisted"],
      customer_type: ["shipper", "consignee", "both"],
      customs_declaration_type: ["import", "export", "transit"],
      customs_status: [
        "pending",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "released",
      ],
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
      warehouse_order_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      warehouse_order_type: ["receive", "put_away", "pick", "pack", "dispatch"],
    },
  },
} as const
