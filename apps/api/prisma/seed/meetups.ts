import {
  ConversationType,
  ParticipantStatus,
  PlaySessionStatus,
  PlaySessionVisibility,
  type PrismaClient,
} from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SEED_MARKER, type SeedConfig } from './config';
import { createRng } from './random';
import type { SeededGame } from './games';
import type { SeededUser } from './users';

type MeetupTemplates = {
  titles: string[];
  locations: string[];
  descriptions: string[];
};

function fillTokens(
  template: string,
  values: { gameTitle?: string; city?: string },
) {
  return template
    .replaceAll('{gameTitle}', values.gameTitle ?? 'Board games')
    .replaceAll('{city}', values.city ?? 'downtown');
}

async function loadJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(__dirname, 'data', fileName);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function createPlaySession(
  prisma: PrismaClient,
  input: {
    hostId: string;
    title: string;
    scheduledAt: Date;
    gameId?: string | null;
    location?: string | null;
    description?: string | null;
    maxPlayers?: number | null;
    visibility: PlaySessionVisibility;
    status: PlaySessionStatus;
    joinUserIds: string[];
    inviteUserIds: string[];
  },
) {
  const session = await prisma.playSession.create({
    data: {
      hostId: input.hostId,
      title: input.title,
      scheduledAt: input.scheduledAt,
      gameId: input.gameId ?? undefined,
      location: input.location ?? undefined,
      description: input.description ?? undefined,
      maxPlayers: input.maxPlayers ?? undefined,
      status: input.status,
      visibility: input.visibility,
      conversation: {
        create: {
          type: ConversationType.SESSION,
          title: input.title,
          members: { create: [{ userId: input.hostId }] },
        },
      },
    },
    include: { conversation: { select: { id: true } } },
  });

  const convId = session.conversation?.id;

  for (const userId of input.joinUserIds) {
    if (userId === input.hostId) {
      continue;
    }
    await prisma.playSessionParticipant.create({
      data: {
        sessionId: session.id,
        userId,
        status: ParticipantStatus.JOINED,
      },
    });
    if (convId) {
      await prisma.conversationMember.create({
        data: { conversationId: convId, userId },
      });
    }
  }

  for (const userId of input.inviteUserIds) {
    if (userId === input.hostId || input.joinUserIds.includes(userId)) {
      continue;
    }
    await prisma.playSessionInvitation.create({
      data: { sessionId: session.id, invitedUserId: userId },
    });
    await prisma.playSessionParticipant.create({
      data: {
        sessionId: session.id,
        userId,
        status: ParticipantStatus.INVITED,
      },
    });
  }

  return session;
}

export async function seedMeetups(
  prisma: PrismaClient,
  config: SeedConfig,
  users: SeededUser[],
  games: SeededGame[],
) {
  const existing = await prisma.playSession.count({
    where: { title: { startsWith: SEED_MARKER } },
  });
  if (existing > 0) {
    console.log(`Skipping meetups — ${existing} seed sessions already exist.`);
    return;
  }

  const rng = createRng(config.rngSeed + 31);
  const [templates, cities] = await Promise.all([
    loadJson<MeetupTemplates>('meetup-templates.json'),
    loadJson<string[]>('cities.json'),
  ]);

  const visibilities = [
    PlaySessionVisibility.PUBLIC,
    PlaySessionVisibility.FRIENDS,
    PlaySessionVisibility.INVITE_ONLY,
  ] as const;

  const now = Date.now();
  let created = 0;

  for (let i = 0; i < config.meetupCount; i += 1) {
    const host = rng.pick(users);
    const game = rng.chance(0.82) ? rng.pick(games) : null;
    const city = rng.pick(cities);
    const titleCore = fillTokens(rng.pick(templates.titles), {
      gameTitle: game?.title,
      city,
    });
    const title = `${SEED_MARKER} ${titleCore}`;
    const location = fillTokens(rng.pick(templates.locations), {
      gameTitle: game?.title,
      city,
    });
    const description = rng.pick(templates.descriptions);

    const dayOffset = rng.int(-21, 28);
    const hour = rng.int(16, 21);
    const minute = rng.pick([0, 15, 30, 45]);
    const scheduledAt = new Date(now + dayOffset * 24 * 60 * 60 * 1000);
    scheduledAt.setHours(hour, minute, 0, 0);

    const status =
      dayOffset < -1
        ? PlaySessionStatus.DONE
        : rng.chance(0.04)
          ? PlaySessionStatus.CANCELLED
          : PlaySessionStatus.SCHEDULED;

    const visibility = rng.pick(visibilities);
    const maxPlayers = rng.int(3, game?.title ? 5 : 8);

    const otherUsers = rng
      .shuffle(users.filter((user) => user.id !== host.id))
      .slice(0, rng.int(0, Math.min(5, users.length - 1)));

    const joinCount = rng.int(0, Math.min(otherUsers.length, maxPlayers - 1));
    const joinUserIds = otherUsers.slice(0, joinCount).map((user) => user.id);
    const inviteUserIds =
      visibility === PlaySessionVisibility.INVITE_ONLY
        ? otherUsers
            .slice(joinCount, joinCount + rng.int(1, 3))
            .map((user) => user.id)
        : [];

    await createPlaySession(prisma, {
      hostId: host.id,
      title,
      scheduledAt,
      gameId: game?.id ?? null,
      location,
      description,
      maxPlayers,
      visibility,
      status,
      joinUserIds,
      inviteUserIds,
    });
    created += 1;
  }

  console.log(`Seeded ${created} meetups.`);
}
