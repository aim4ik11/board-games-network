import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { ChatApplicationService } from '../../application/chat.application.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { InviteToConversationDto } from './dto/invite-to-conversation.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chatApplicationService: ChatApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  list(@CurrentUser() user: AuthUser) {
    return this.chatApplicationService.listConversations(user.id);
  }

  @Post('direct')
  @ApiOperation({ summary: 'Get or create a direct chat with a friend' })
  createDirect(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.chatApplicationService.getOrCreateDirectConversation(
      user.id,
      dto.otherUserId.trim(),
    );
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a group chat with invited friends' })
  createGroup(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.chatApplicationService.createGroupConversation(
      user.id,
      dto.memberIds,
      dto.title,
    );
  }

  @Post(':conversationId/members')
  @ApiOperation({ summary: 'Invite a friend to an existing group chat' })
  @ApiParam({ name: 'conversationId' })
  inviteMember(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: InviteToConversationDto,
  ) {
    return this.chatApplicationService.inviteToConversation(
      user.id,
      conversationId,
      dto.userId,
    );
  }

  @Get(':conversationId/messages')
  @ApiOperation({
    summary: 'Paginated messages (oldest → newest in each page)',
  })
  @ApiParam({ name: 'conversationId' })
  messages(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.chatApplicationService.listMessages(
      user.id,
      conversationId,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: 'Send a message (also broadcast over WebSocket)' })
  @ApiParam({ name: 'conversationId' })
  send(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.chatApplicationService.sendMessage(
      user.id,
      conversationId,
      dto.body,
    );
  }
}
