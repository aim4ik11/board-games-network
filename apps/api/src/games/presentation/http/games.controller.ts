import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../auth/presentation/http/decorators/public.decorator';
import { GamesApplicationService } from '../../application/games.application.service';
import { CreateGameDto } from './dto/create-game.dto';
import { QueryGamesDto } from './dto/query-games.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { updateGameDtoToPatch } from './mappers/update-game.mapper';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesApplicationService: GamesApplicationService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List games (search + pagination)' })
  findAll(@Query() query: QueryGamesDto) {
    return this.gamesApplicationService.listGames({
      titleSearch: query.q,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Game detail with rating aggregates' })
  @ApiParam({ name: 'slug', example: 'wingspan' })
  findOne(@Param('slug') slug: string) {
    return this.gamesApplicationService.getGameBySlug(slug);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create game (authenticated)' })
  create(@Body() dto: CreateGameDto) {
    return this.gamesApplicationService.createGame({
      title: dto.title.trim(),
      description: dto.description,
      yearPublished: dto.yearPublished,
      minPlayers: dto.minPlayers,
      maxPlayers: dto.maxPlayers,
      playTimeMin: dto.playTimeMin,
      imageUrl: dto.imageUrl,
      externalId: dto.externalId,
    });
  }

  @Patch(':slug')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update game' })
  @ApiParam({ name: 'slug' })
  update(@Param('slug') slug: string, @Body() dto: UpdateGameDto) {
    return this.gamesApplicationService.updateGame(
      slug,
      updateGameDtoToPatch(dto),
    );
  }

  @Delete(':slug')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete game' })
  @ApiParam({ name: 'slug' })
  remove(@Param('slug') slug: string) {
    return this.gamesApplicationService.deleteGame(slug);
  }
}
