import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { FriendsApplicationService } from '../../application/friends.application.service';
import { QueryDiscoverDto } from './dto/query-discover.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import type { OkResponse } from '@boardgame/shared';

@ApiTags('friends')
@ApiBearerAuth('access-token')
@Controller('friends')
export class FriendsController {
  constructor(
    private readonly friendsApplicationService: FriendsApplicationService,
  ) {}

  @Get('discover')
  @ApiOperation({
    summary: 'Search users by display name (with relationship hints)',
  })
  discover(@CurrentUser() user: AuthUser, @Query() query: QueryDiscoverDto) {
    return this.friendsApplicationService.discover(
      user.id,
      query.q ?? '',
      query.city,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: 'Pending friend requests you received' })
  incoming(@CurrentUser() user: AuthUser) {
    return this.friendsApplicationService.listIncomingRequests(user.id);
  }

  @Get('requests/outgoing')
  @ApiOperation({ summary: 'Pending friend requests you sent' })
  outgoing(@CurrentUser() user: AuthUser) {
    return this.friendsApplicationService.listOutgoingRequests(user.id);
  }

  @Post('requests')
  @ApiOperation({
    summary: 'Send a friend request (or auto-accept if they already asked you)',
  })
  async send(
    @CurrentUser() user: AuthUser,
    @Body() dto: SendFriendRequestDto,
  ): Promise<OkResponse> {
    await this.friendsApplicationService.sendFriendRequest(
      user.id,
      dto.toUserId.trim(),
    );
    return { ok: true };
  }

  @Post('requests/:fromUserId/accept')
  @ApiOperation({ summary: 'Accept a pending request' })
  @ApiParam({ name: 'fromUserId' })
  async accept(
    @CurrentUser() user: AuthUser,
    @Param('fromUserId') fromUserId: string,
  ): Promise<OkResponse> {
    await this.friendsApplicationService.acceptRequest(user.id, fromUserId);
    return { ok: true };
  }

  @Delete('requests/:fromUserId')
  @ApiOperation({ summary: 'Decline a pending incoming request' })
  @ApiParam({ name: 'fromUserId' })
  async decline(
    @CurrentUser() user: AuthUser,
    @Param('fromUserId') fromUserId: string,
  ): Promise<OkResponse> {
    await this.friendsApplicationService.declineIncoming(user.id, fromUserId);
    return { ok: true };
  }

  @Delete('outgoing/:toUserId')
  @ApiOperation({ summary: 'Cancel an outgoing pending request' })
  @ApiParam({ name: 'toUserId' })
  async cancelOutgoing(
    @CurrentUser() user: AuthUser,
    @Param('toUserId') toUserId: string,
  ): Promise<OkResponse> {
    await this.friendsApplicationService.cancelOutgoing(user.id, toUserId);
    return { ok: true };
  }

  @Delete('with/:otherUserId')
  @ApiOperation({ summary: 'Remove an accepted friendship' })
  @ApiParam({ name: 'otherUserId' })
  async unfriend(
    @CurrentUser() user: AuthUser,
    @Param('otherUserId') otherUserId: string,
  ): Promise<OkResponse> {
    await this.friendsApplicationService.unfriend(user.id, otherUserId);
    return { ok: true };
  }

  @Get()
  @ApiOperation({ summary: 'List accepted friends' })
  list(@CurrentUser() user: AuthUser) {
    return this.friendsApplicationService.listFriends(user.id);
  }
}
