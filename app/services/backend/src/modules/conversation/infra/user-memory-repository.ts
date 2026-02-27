import type {
  UserRepository as ConversationUserRepository
} from "../application/conversation-service.js";
import type {
  UserRepository as MessageUserRepository
} from "../../message/application/message-service.js";

type User = {
  id: string;
  username: string;
  avatar: string | null;
};

export class UserMemoryRepository implements ConversationUserRepository, MessageUserRepository {
  private users: Map<string, User> = new Map();

  findById(id: string): { id: string; username: string; avatar: string | null } | null {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  save(user: User): void {
    this.users.set(user.id, { ...user });
  }

  clear(): void {
    this.users.clear();
  }

  count(): number {
    return this.users.size;
  }

  createTestUsers(): void {
    this.save({ id: "user-1", username: "Alice", avatar: "https://example.com/avatar1.png" });
    this.save({ id: "user-2", username: "Bob", avatar: "https://example.com/avatar2.png" });
    this.save({ id: "user-3", username: "Charlie", avatar: null });
  }
}
