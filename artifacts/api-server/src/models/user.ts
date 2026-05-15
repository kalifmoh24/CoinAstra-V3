import type { MemoryUser } from "../lib/memory-store.js";
import { memoryStore } from "../lib/memory-store.js";

export type User = MemoryUser;
export type InsertUser = Omit<MemoryUser, "id" | "createdAt" | "updatedAt" | "lastLoginAt">;
export type PublicUser = Omit<MemoryUser, "passwordHash">;

export function omitPassword(user: MemoryUser): PublicUser {
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

export async function findUserByEmail(email: string): Promise<MemoryUser | undefined> {
  return memoryStore.usersByEmail.get(email.toLowerCase());
}

export async function findUserById(id: number): Promise<MemoryUser | undefined> {
  return memoryStore.usersById.get(id);
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  username?: string;
  displayName?: string;
  role?: "user" | "admin";
}): Promise<PublicUser> {
  const now = new Date();
  const id = memoryStore.takeUserId();
  const user: MemoryUser = {
    id,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    username: data.username ?? null,
    displayName: data.displayName ?? null,
    avatarUrl: null,
    role: data.role ?? "user",
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
  memoryStore.usersById.set(id, user);
  memoryStore.usersByEmail.set(user.email, user);
  return omitPassword(user);
}

export async function updateLastLogin(id: number): Promise<void> {
  const u = memoryStore.usersById.get(id);
  if (!u) return;
  u.lastLoginAt = new Date();
  u.updatedAt = new Date();
}

export async function updateUserProfile(
  id: number,
  data: Partial<Pick<InsertUser, "displayName" | "avatarUrl" | "username">>,
): Promise<PublicUser | undefined> {
  const u = memoryStore.usersById.get(id);
  if (!u) return undefined;
  if (data.displayName !== undefined) u.displayName = data.displayName ?? null;
  if (data.avatarUrl !== undefined) u.avatarUrl = data.avatarUrl ?? null;
  if (data.username !== undefined) u.username = data.username ?? null;
  u.updatedAt = new Date();
  return omitPassword(u);
}
