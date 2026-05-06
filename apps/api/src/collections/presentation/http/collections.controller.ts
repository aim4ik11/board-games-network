import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import {
  CurrentUser,
  type AuthUser,
} from '../../../auth/presentation/http/decorators/current-user.decorator';
import { CollectionsApplicationService } from '../../application/collections.application.service';
import { AddToCollectionDto } from './dto/add-to-collection.dto';
import { PatchCollectionDto } from './dto/patch-collection.dto';
import { QueryCollectionDto } from './dto/query-collection.dto';
import type { OkResponse } from '@boardgame/shared';

@ApiTags('collections')
@ApiBearerAuth('access-token')
@Controller('me/collection')
export class CollectionsController {
  constructor(
    private readonly collectionsApplicationService: CollectionsApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List games in my collection' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryCollectionDto) {
    return this.collectionsApplicationService.listMyCollection(
      user.id,
      query.status,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get my collection entry for a game (by slug)' })
  @ApiParam({ name: 'slug' })
  async getOne(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    const entry = await this.collectionsApplicationService.myEntryForGame(
      user.id,
      slug,
    );
    if (!entry) {
      throw new NotFoundException('Not in collection');
    }
    return entry;
  }

  @Post()
  @ApiOperation({ summary: 'Add or update a game in my collection' })
  add(@CurrentUser() user: AuthUser, @Body() dto: AddToCollectionDto) {
    return this.collectionsApplicationService.addToCollection(
      user.id,
      dto.slug.trim(),
      dto.status,
    );
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update collection entry (notes, status, …)' })
  @ApiParam({ name: 'slug' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() dto: PatchCollectionDto,
  ) {
    return this.collectionsApplicationService.updateCollectionItem(
      user.id,
      slug,
      {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && {
          notes: dto.notes.trim() === '' ? null : dto.notes,
        }),
      },
    );
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Remove a game from my collection' })
  @ApiParam({ name: 'slug' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<OkResponse> {
    await this.collectionsApplicationService.removeFromCollection(
      user.id,
      slug,
    );
    return { ok: true };
  }
}
