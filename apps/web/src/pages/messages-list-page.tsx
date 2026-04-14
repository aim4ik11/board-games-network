import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { fetchConversations } from "../api/chat";
import { getSharedChatSocket } from "../lib/chat-socket";
import { getStoredAccessToken } from "../lib/auth-storage";
import { queryKeys } from "../lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";

export function MessagesListPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: fetchConversations,
  });

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      return;
    }
    const socket = getSharedChatSocket(token);

    const onNew = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    };

    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [queryClient]);

  return (
    <section className="page">
      <h1>Messages</h1>
      {listQuery.isLoading && <p>Loading…</p>}
      {listQuery.isError && (
        <p className="error" role="alert">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Failed to load conversations"}
        </p>
      )}
      {listQuery.data && (
        <ul className="conversation-list">
          {listQuery.data.length === 0 ? (
            <p className="muted">
              No conversations yet. Open a friend and tap Message.
            </p>
          ) : (
            listQuery.data.map((c) => (
              <li key={c.id}>
                <Link
                  to="/messages/$conversationId"
                  params={{ conversationId: c.id }}
                  className="conversation-row"
                >
                  <div className="conversation-row-title">
                    {c.otherUser?.displayName ?? "Conversation"}
                  </div>
                  {c.lastMessage && (
                    <div className="conversation-row-preview muted">
                      <span>{c.lastMessage.senderDisplayName}: </span>
                      {c.lastMessage.body.length > 80
                        ? `${c.lastMessage.body.slice(0, 80)}…`
                        : c.lastMessage.body}
                    </div>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
