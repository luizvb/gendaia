export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          description: string | null;
          logo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          description?: string | null;
          logo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          description?: string | null;
          logo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      professionals: {
        Row: {
          id: string;
          name: string;
          specialty: string | null;
          color: string;
          user_id: string | null;
          business_id: string;
          created_at: string;
          updated_at: string;
          email: string | null;
          whatsapp: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          specialty?: string | null;
          color?: string;
          user_id?: string | null;
          business_id: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          specialty?: string | null;
          color?: string;
          user_id?: string | null;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          whatsapp?: string | null;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          duration: number;
          price: number;
          business_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          duration: number;
          price: number;
          business_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          duration?: number;
          price?: number;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_hours: {
        Row: {
          id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_open: boolean;
          business_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_open?: boolean;
          business_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          is_open?: boolean;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          start_time: string;
          end_time: string;
          status: string;
          notes: string | null;
          client_id: string;
          professional_id: string;
          service_id: string;
          business_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          start_time: string;
          end_time: string;
          status?: string;
          notes?: string | null;
          client_id: string;
          professional_id: string;
          service_id: string;
          business_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          notes?: string | null;
          client_id?: string;
          professional_id?: string;
          service_id?: string;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          plan: string;
          status: string;
          start_date: string;
          end_date: string | null;
          trial_end_date: string | null;
          business_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan: string;
          status?: string;
          start_date?: string;
          end_date?: string | null;
          trial_end_date?: string | null;
          business_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan?: string;
          status?: string;
          start_date?: string;
          end_date?: string | null;
          trial_end_date?: string | null;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          avatar_url: string | null;
          role: string;
          business_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          avatar_url?: string | null;
          role?: string;
          business_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: string;
          business_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          business_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          business_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
