// Tipos do schema `genea_*`. Mantido à mão; para regenerar a partir do banco:
//   supabase gen types typescript --project-id <REF> > src/integrations/supabase/types.ts

export type Sex = "male" | "female" | "other";
export type MemberRole = "admin" | "editor" | "viewer" | "pending";
export type MediaKind = "photo" | "document" | "other";

export interface SocialLink {
  label: string;
  url: string;
}

export interface Person {
  id: string;
  tree_id: string;
  first_name: string;
  last_name: string | null;
  maiden_name: string | null;
  nickname: string | null;
  sex: Sex;
  birth_date: string | null;
  birth_date_text: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_date_text: string | null;
  death_place: string | null;
  is_living: boolean;
  father_id: string | null;
  mother_id: string | null;
  avatar_url: string | null;
  occupation: string | null;
  biography: string | null;
  notes: string | null;
  email: string | null;
  social_links: SocialLink[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Union {
  id: string;
  tree_id: string;
  partner1_id: string;
  partner2_id: string;
  kind: string;
  started_on: string | null;
  ended_on: string | null;
  place: string | null;
  created_at: string;
}

export interface Tree {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  tree_id: string;
  user_id: string;
  role: MemberRole;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export interface InviteLink {
  token: string;
  tree_id: string;
  created_by: string;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface Media {
  id: string;
  tree_id: string;
  person_id: string | null;
  kind: MediaKind;
  storage_path: string;
  title: string | null;
  description: string | null;
  taken_on: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ShareLink {
  token: string;
  tree_id: string;
  created_by: string;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  tree_id: string | null;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
}

export interface AppNotification {
  id: number;
  tree_id: string | null;
  recipient: string;
  kind: "access_request" | "access_approved" | "link_resolved" | "info";
  actor: string | null;
  actor_email: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface GlobalPersonMatch {
  person_id: string;
  full_name: string;
}

export interface LinkRequest {
  id: number;
  requester_tree_id: string;
  requester_tree_name: string | null;
  requester_user: string;
  requester_email: string | null;
  target_person_id: string;
  target_tree_id: string;
  target_name: string | null;
  status: "pending" | "approved" | "denied";
  message: string | null;
  created_person_id: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PendingConsent {
  id: number;
  tree_id: string;
  tree_name: string;
  person_id: string;
  person_name: string;
}

export interface TreeStats {
  people: number;
  living: number;
  deceased: number;
  unions: number;
  photos: number;
  documents: number;
  surnames: { name: string; total: number }[];
  birth_decades: { decade: number; total: number }[];
}

// Tipagem mínima e prática para o supabase-js. As tabelas usam Row/Insert/Update
// genéricos; as colunas reais são validadas nos services e nos tipos acima.
type GenericTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      genea_trees: GenericTable<Tree>;
      genea_members: GenericTable<Member>;
      genea_people: GenericTable<Person>;
      genea_unions: GenericTable<Union>;
      genea_media: GenericTable<Media>;
      genea_share_links: GenericTable<ShareLink>;
      genea_audit_log: GenericTable<AuditEntry>;
    };
    Views: Record<string, never>;
    Functions: {
      genea_create_tree: {
        Args: { p_name: string; p_description?: string | null };
        Returns: Tree;
      };
      genea_tree_stats: { Args: { p_tree: string }; Returns: TreeStats };
      genea_shared_tree: {
        Args: { p_token: string };
        Returns: { tree: Tree; people: Person[]; unions: Union[] } | null;
      };
    };
    Enums: {
      genea_sex: Sex;
      genea_role: MemberRole;
      genea_media_kind: MediaKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
