import { and, eq, ne } from "drizzle-orm";

import { DBOrTx, db } from "./index";
import { User, account, session, user } from "./schema";

export async function getUserById(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<User | undefined> {
  const result = await dbOrTx
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return result[0];
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "name" | "username" | "bio" | "image">>,
  dbOrTx: DBOrTx = db,
): Promise<User | undefined> {
  const result = await dbOrTx
    .update(user)
    .set(data)
    .where(eq(user.id, id))
    .returning();
  return result[0];
}

export async function checkUsernameExists(
  username: string,
  excludeUserId?: string,
  dbOrTx: DBOrTx = db,
): Promise<boolean> {
  const conditions = [eq(user.username, username)];
  if (excludeUserId) {
    conditions.push(ne(user.id, excludeUserId));
  }

  const result = await dbOrTx
    .select({ id: user.id })
    .from(user)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0;
}

export async function deleteUser(
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<User | undefined> {
  await dbOrTx.delete(session).where(eq(session.userId, id));

  await dbOrTx.delete(account).where(eq(account.userId, id));

  const result = await dbOrTx
    .update(user)
    .set({
      name: "Deleted User",
      email: `deleted_${id}@deleted.local`,
      username: `deleted_${id}`,
      bio: null,
      image: null,
      deletedAt: new Date(),
    })
    .where(eq(user.id, id))
    .returning();

  return result[0];
}
