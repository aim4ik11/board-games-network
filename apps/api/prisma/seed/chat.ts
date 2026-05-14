import {
  ConversationType,
  FriendshipStatus,
  type PrismaClient,
} from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SEED_MARKER, type SeedConfig } from './config';
import { createRng } from './random';
import type { SeededUser } from './users';

async function loadJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(__dirname, 'data', fileName);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function getAcceptedFriendIds(
  prisma: PrismaClient,
  userId: string,
): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return rows.map((row) =>
    row.requesterId === userId ? row.addresseeId : row.requesterId,
  );
}

async function findDirectConversationId(
  prisma: PrismaClient,
  userIdA: string,
  userIdB: string,
): Promise<string | null> {
  const rows = await prisma.conversationMember.findMany({
    where: {
      userId: { in: [userIdA, userIdB] },
      conversation: { type: ConversationType.DIRECT },
    },
    select: {
      conversationId: true,
      userId: true,
      conversation: { select: { type: true } },
    },
  });

  const byConversation = new Map<string, Set<string>>();
  for (const row of rows) {
    const members = byConversation.get(row.conversationId) ?? new Set<string>();
    members.add(row.userId);
    byConversation.set(row.conversationId, members);
  }

  for (const [conversationId, members] of byConversation) {
    if (members.has(userIdA) && members.has(userIdB) && members.size === 2) {
      return conversationId;
    }
  }
  return null;
}

async function seedMessages(
  prisma: PrismaClient,
  conversationId: string,
  senderIds: string[],
  bodies: string[],
  rng: ReturnType<typeof createRng>,
  config: SeedConfig,
) {
  const count = rng.int(
    config.messagesPerConversationMin,
    config.messagesPerConversationMax,
  );
  const baseTime = Date.now() - rng.int(2, 14) * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i += 1) {
    const senderId = rng.pick(senderIds);
    const body = `${SEED_MARKER} ${rng.pick(bodies)}`;
    const createdAt = new Date(baseTime + i * rng.int(3, 45) * 60 * 1000);
    await prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        createdAt,
      },
    });
  }
}

export async function seedChat(
  prisma: PrismaClient,
  config: SeedConfig,
  users: SeededUser[],
) {
  const existingMessages = await prisma.message.count({
    where: { body: { startsWith: SEED_MARKER } },
  });
  if (existingMessages > 0) {
    console.log(
      `Skipping chat seed — ${existingMessages} seed messages already exist.`,
    );
    return;
  }

  const rng = createRng(config.rngSeed + 53);
  const chatBodies = await loadJson<string[]>('chat-messages.json');
  const directPairs = new Set<string>();
  let directCount = 0;
  let groupCount = 0;
  let sessionMessageCount = 0;

  for (const user of users.slice(0, Math.min(users.length, 24))) {
    const friendIds = await getAcceptedFriendIds(prisma, user.id);
    const friends = friendIds.slice(0, rng.int(2, 5));

    for (const friendId of friends) {
      const [a, b] = canonicalPair(user.id, friendId);
      const key = `${a}:${b}`;
      if (directPairs.has(key)) {
        continue;
      }
      directPairs.add(key);

      let conversationId = await findDirectConversationId(prisma, a, b);
      if (!conversationId) {
        const created = await prisma.conversation.create({
          data: {
            type: ConversationType.DIRECT,
            members: {
              create: [{ userId: a }, { userId: b }],
            },
          },
          select: { id: true },
        });
        conversationId = created.id;
        directCount += 1;
      }

      await seedMessages(
        prisma,
        conversationId,
        [a, b],
        chatBodies,
        rng,
        config,
      );
    }
  }

  const groupHosts = rng.shuffle(users).slice(0, 8);
  for (const host of groupHosts) {
    const friendIds = await getAcceptedFriendIds(prisma, host.id);
    const memberIds = rng.shuffle(friendIds).slice(0, rng.int(2, 5));
    if (memberIds.length < 2) {
      continue;
    }

    const title = `${SEED_MARKER} ${host.displayName.split(' ')[0]}'s game crew`;
    const conversation = await prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title,
        members: {
          create: [
            { userId: host.id },
            ...memberIds.map((userId) => ({ userId })),
          ],
        },
      },
      select: { id: true },
    });
    groupCount += 1;

    await seedMessages(
      prisma,
      conversation.id,
      [host.id, ...memberIds],
      chatBodies,
      rng,
      config,
    );
  }

  const sessionConversations = await prisma.conversation.findMany({
    where: {
      type: ConversationType.SESSION,
      playSession: { title: { startsWith: SEED_MARKER } },
    },
    select: {
      id: true,
      members: { select: { userId: true } },
    },
    take: 18,
  });

  for (const conversation of sessionConversations) {
    const senderIds = conversation.members.map((member) => member.userId);
    if (senderIds.length === 0) {
      continue;
    }
    const count = rng.int(2, 6);
    for (let i = 0; i < count; i += 1) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: rng.pick(senderIds),
          body: `${SEED_MARKER} ${rng.pick(chatBodies)}`,
          createdAt: new Date(
            Date.now() - rng.int(1, 10) * 24 * 60 * 60 * 1000,
          ),
        },
      });
      sessionMessageCount += 1;
    }
  }

  console.log(
    `Seeded ${directCount} direct chats, ${groupCount} group chats, and ${sessionMessageCount} session chat messages.`,
  );
}
