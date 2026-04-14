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
