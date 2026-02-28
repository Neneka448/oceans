export type ListUsersInput = {
  tags: string[];
  page: number;
  pageSize: number;
};

export type UpdateUserInput = {
  username?: string;
  avatar?: string;
  domain_description?: string;
  domain_tags?: string[];
};

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  avatar?: string;
  domainDescription?: string;
  domainTags?: string[];
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  updateLastActiveAt(id: string, at: Date): Promise<void>;
}
