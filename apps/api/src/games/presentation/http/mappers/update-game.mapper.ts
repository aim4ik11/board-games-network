import type { UpdateGamePatch } from '../../../domain/types/game.types';
import type { UpdateGameDto } from '../dto/update-game.dto';

export function updateGameDtoToPatch(dto: UpdateGameDto): UpdateGamePatch {
  const patch: UpdateGamePatch = {};
  if (dto.title !== undefined) {
    patch.title = dto.title.trim();
  }
  if (dto.description !== undefined) {
    patch.description = dto.description;
  }
  if (dto.yearPublished !== undefined) {
    patch.yearPublished = dto.yearPublished;
  }
  if (dto.minPlayers !== undefined) {
    patch.minPlayers = dto.minPlayers;
  }
  if (dto.maxPlayers !== undefined) {
    patch.maxPlayers = dto.maxPlayers;
  }
  if (dto.playTimeMin !== undefined) {
    patch.playTimeMin = dto.playTimeMin;
  }
  if (dto.playTimeMax !== undefined) {
    patch.playTimeMax = dto.playTimeMax;
  }
  if (dto.complexity !== undefined) {
    patch.complexity = dto.complexity;
  }
  if (dto.genreSlugs !== undefined) {
    patch.genreSlugs = dto.genreSlugs.map((s) => s.trim().toLowerCase());
  }
  if (dto.imageUrl !== undefined) {
    patch.imageUrl = dto.imageUrl;
  }
  if (dto.externalId !== undefined) {
    patch.externalId = dto.externalId;
  }
  return patch;
}
