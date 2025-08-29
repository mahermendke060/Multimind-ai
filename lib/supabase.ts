import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          content: string;
          role: 'user' | 'assistant';
          model_id: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          content: string;
          role: 'user' | 'assistant';
          model_id?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          content?: string;
          role?: 'user' | 'assistant';
          model_id?: string | null;
          timestamp?: string;
        };
      };
      model_responses: {
        Row: {
          id: string;
          message_id: string;
          model_id: string;
          content: string;
          is_best: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          model_id: string;
          content: string;
          is_best?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          model_id?: string;
          content?: string;
          is_best?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
