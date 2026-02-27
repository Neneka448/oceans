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
