import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SeedConfig } from './config';
import { createRng } from './random';

export type SeededUser = {
  id: string;
  email: string;
  displayName: string;
};

type NamesData = {
  firstNames: string[];
  lastNames: string[];
};

async function loadJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(__dirname, 'data', fileName);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function buildUserRows(
  count: number,
  cities: string[],
  bios: string[],
  names: NamesData,
) {
  const rng = createRng(1009);
  return Array.from({ length: count }, (_, idx) => {
    const sequence = idx + 1;
    const first = names.firstNames[idx % names.firstNames.length]!;
    const last =
      names.lastNames[
        Math.floor(idx / names.firstNames.length) % names.lastNames.length
      ]!;
    return {
      email: `player${sequence}@seed.local`,
      displayName: `${first} ${last}`,
      city: cities[rng.int(0, cities.length - 1)]!,
      bio: bios[rng.int(0, bios.length - 1)]!,
    };
  });
}

export async function seedUsers(
  prisma: PrismaClient,
  config: SeedConfig,
): Promise<SeededUser[]> {
  const [cities, bios, names] = await Promise.all([
    loadJson<string[]>('cities.json'),
    loadJson<string[]>('bios.json'),
    loadJson<NamesData>('names.json'),
  ]);

  const passwordHash = await bcrypt.hash(config.userPassword, 10);
  const rows = buildUserRows(config.userCount, cities, bios, names);
  const seeded: SeededUser[] = [];

  for (const row of rows) {
    const user = await prisma.user.upsert({
      where: { email: row.email },
      create: {
        email: row.email,
        displayName: row.displayName,
        passwordHash,
        city: row.city,
        bio: row.bio,
      },
      update: {
        displayName: row.displayName,
        passwordHash,
        city: row.city,
        bio: row.bio,
      },
      select: { id: true, email: true, displayName: true },
    });
    seeded.push(user);
  }

  console.log(
    `Seeded ${seeded.length} mock users (login: player1@seed.local … password: ${config.userPassword}).`,
  );
  return seeded;
}
