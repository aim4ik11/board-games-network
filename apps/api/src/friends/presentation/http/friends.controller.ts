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
  send(@CurrentUser() user: AuthUser, @Body() dto: SendFriendRequestDto) {
    return this.friendsApplicationService
      .sendFriendRequest(user.id, dto.toUserId.trim())
      .then(() => ({ ok: true }));
  }

  @Post('requests/:fromUserId/accept')
  @ApiOperation({ summary: 'Accept a pending request' })
  @ApiParam({ name: 'fromUserId' })
  accept(
    @CurrentUser() user: AuthUser,
    @Param('fromUserId') fromUserId: string,
  ) {
    return this.friendsApplicationService
      .acceptRequest(user.id, fromUserId)
      .then(() => ({ ok: true }));
  }

  @Delete('requests/:fromUserId')
  @ApiOperation({ summary: 'Decline a pending incoming request' })
  @ApiParam({ name: 'fromUserId' })
  decline(
    @CurrentUser() user: AuthUser,
    @Param('fromUserId') fromUserId: string,
  ) {
    return this.friendsApplicationService
      .declineIncoming(user.id, fromUserId)
      .then(() => ({ ok: true }));
  }

  @Delete('outgoing/:toUserId')
  @ApiOperation({ summary: 'Cancel an outgoing pending request' })
  @ApiParam({ name: 'toUserId' })
  cancelOutgoing(
    @CurrentUser() user: AuthUser,
    @Param('toUserId') toUserId: string,
  ) {
    return this.friendsApplicationService
      .cancelOutgoing(user.id, toUserId)
      .then(() => ({ ok: true }));
  }

  @Delete('with/:otherUserId')
  @ApiOperation({ summary: 'Remove an accepted friendship' })
  @ApiParam({ name: 'otherUserId' })
  unfriend(
    @CurrentUser() user: AuthUser,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.friendsApplicationService
      .unfriend(user.id, otherUserId)
      .then(() => ({ ok: true }));
  }

  @Get()
  @ApiOperation({ summary: 'List accepted friends' })
  list(@CurrentUser() user: AuthUser) {
    return this.friendsApplicationService.listFriends(user.id);
  }
}
