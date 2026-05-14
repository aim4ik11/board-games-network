import {
  Body,
  Controller,
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
import {
  CurrentUser,
  type AuthUser,
} from '../../../auth/presentation/http/decorators/current-user.decorator';
import { Public } from '../../../auth/presentation/http/decorators/public.decorator';
import { MeetupsApplicationService } from '../../application/meetups.application.service';
import { CreateMeetupInvitationDto } from './dto/create-meetup-invitation.dto';
import { CreateMeetupDto } from './dto/create-meetup.dto';
import { QueryMeetupsDto } from './dto/query-meetups.dto';
import { UpdateMeetupDto } from './dto/update-meetup.dto';

@ApiTags('meetups')
@Controller('meetups')
export class MeetupsController {
  constructor(
    private readonly meetupsApplicationService: MeetupsApplicationService,
  ) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List meetups visible to current user' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryMeetupsDto) {
    const upcomingOnly = query.upcoming !== 'false';
    const scheduledFrom = query.from ? new Date(query.from) : undefined;
    const scheduledTo = query.to ? new Date(query.to) : undefined;
    return this.meetupsApplicationService.listMeetups({
      userId: user.id,
      ...(query.status !== undefined ? { status: query.status } : {}),
      upcomingOnly,
      ...(scheduledFrom ? { scheduledFrom } : {}),
      ...(scheduledTo ? { scheduledTo } : {}),
      ...(query.gameId !== undefined ? { gameId: query.gameId } : {}),
      ...(query.visibility !== undefined
        ? { visibilityScope: query.visibility }
        : {}),
      ...(query.joined === 'me' ? { joinedByUserId: user.id } : {}),
      ...(query.q !== undefined ? { titleContains: query.q } : {}),
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List public meetups only' })
  listPublic(@Query() query: QueryMeetupsDto) {
    const upcomingOnly = query.upcoming !== 'false';
    const scheduledFrom = query.from ? new Date(query.from) : undefined;
    const scheduledTo = query.to ? new Date(query.to) : undefined;
    return this.meetupsApplicationService.listMeetups({
      ...(query.status !== undefined ? { status: query.status } : {}),
      upcomingOnly,
      ...(scheduledFrom ? { scheduledFrom } : {}),
      ...(scheduledTo ? { scheduledTo } : {}),
      ...(query.gameId !== undefined ? { gameId: query.gameId } : {}),
      ...(query.q !== undefined ? { titleContains: query.q } : {}),
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a meetup (you are the host)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMeetupDto) {
    return this.meetupsApplicationService.createMeetup(user.id, {
      title: dto.title,
      scheduledAt: new Date(dto.scheduledAt),
      gameId: dto.gameId,
      location: dto.location,
      maxPlayers: dto.maxPlayers,
      description: dto.description,
      visibility: dto.visibility,
    });
  }

  @Post(':id/cancel')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancel meetup (host only)' })
  @ApiParam({ name: 'id' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetupsApplicationService.cancelMeetup(user.id, id);
  }

  @Post(':id/join')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Join a meetup as a player' })
  @ApiParam({ name: 'id' })
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetupsApplicationService.joinMeetup(user.id, id);
  }

  @Post(':id/invitations')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Invite a user to meetup (host only, required for invite-only)',
  })
  @ApiParam({ name: 'id' })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateMeetupInvitationDto,
  ) {
    return this.meetupsApplicationService.inviteToMeetup(
      user.id,
      id,
      dto.userId,
    );
  }

  @Post(':id/leave')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Leave a meetup (not the host)' })
  @ApiParam({ name: 'id' })
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetupsApplicationService.leaveMeetup(user.id, id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update meetup (host only, scheduled only)' })
  @ApiParam({ name: 'id' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMeetupDto,
  ) {
    return this.meetupsApplicationService.updateMeetup(user.id, id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.scheduledAt !== undefined && {
        scheduledAt: new Date(dto.scheduledAt),
      }),
      ...(dto.gameId !== undefined && {
        gameId: dto.gameId.trim() === '' ? null : dto.gameId.trim(),
      }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.maxPlayers !== undefined && { maxPlayers: dto.maxPlayers }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.visibility !== undefined && { visibility: dto.visibility }),
    });
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Public meetup detail (public meetups only)' })
  @ApiParam({ name: 'id' })
  getOnePublic(@Param('id') id: string) {
    return this.meetupsApplicationService.getMeetup(id);
  }

  @ApiBearerAuth('access-token')
  @Get(':id')
  @ApiOperation({ summary: 'Meetup detail' })
  @ApiParam({ name: 'id' })
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetupsApplicationService.getMeetup(id, user.id);
  }
}
