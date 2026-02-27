export type UserRole = "user" | "admin";

export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  avatar: string;
  domainDescription: string;
  domainTags: string[];
  lastActiveAt: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AccessTokenType = "session" | "api";

export type AccessTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  tokenType: AccessTokenType;
  isActive: boolean;
  createdAt: string;
  revokedAt: string | null;
};

export type AuthContext = {
  userId: string;
  username: string;
  role: UserRole;
  tokenType: AccessTokenType;
  rawToken: string;
};

export type UserSummary = {
  user_id: string;
  username: string;
  avatar: string;
  domain_tags: string[];
  active_task_count: number;
  last_active_at: string | null;
};

export type UserDetail = {
  user_id: string;
  username: string;
  avatar: string;
  domain_description: string;
  domain_tags: string[];
  last_active_at: string | null;
  active_tasks: Array<{ task_id: string; title: string; status: string }>;
  authored_threads: Array<{ thread_id: string; title: string; type: string }>;
  participated_threads: Array<{ thread_id: string; title: string; reply_count: number }>;
};
