import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  fetchConversationMessages,
  postConversationMessage,
} from "../api/chat";
import type { MessageView } from "../api/types";
import { useAuthMe } from "../hooks/use-auth-me";
import { getSharedChatSocket } from "../lib/chat-socket";
import { getStoredAccessToken } from "../lib/auth-storage";
import { queryKeys } from "../lib/query-keys";

const routeApi = getRouteApi("/messages/$conversationId");
const MSG_PAGE = 1;
const MSG_LIMIT = 100;

type MessagesQueryData = Awaited<ReturnType<typeof fetchConversationMessages>>;

export function MessagesThreadPage() {
  const { conversationId } = routeApi.useParams();
  const queryClient = useQueryClient();
  const me = useAuthMe();
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(conversationId, MSG_PAGE),
    queryFn: () =>
      fetchConversationMessages(conversationId, {
        page: MSG_PAGE,
        limit: MSG_LIMIT,
      }),
  });

  const send = useMutation({
    mutationFn: (body: string) => postConversationMessage(conversationId, body),
    onSuccess: (msg) => {
      queryClient.setQueryData<MessagesQueryData>(
        queryKeys.chat.messages(conversationId, MSG_PAGE),
        (prev) => {
          if (!prev) {
            return prev;
          }
          if (prev.data.some((m) => m.id === msg.id)) {
            return prev;
          }
          return {
            ...prev,
            data: [...prev.data, msg],
            meta: { ...prev.meta, total: prev.meta.total + 1 },
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    },
  });

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      return;
    }
    const socket = getSharedChatSocket(token);

    const onNew = (payload: {
      conversationId: string;
      message: MessageView;
    }) => {
      if (payload.conversationId !== conversationId) {
        return;
      }
      queryClient.setQueryData<MessagesQueryData>(
        queryKeys.chat.messages(conversationId, MSG_PAGE),
        (prev) => {
          if (!prev) {
            return prev;
          }
          if (prev.data.some((m) => m.id === payload.message.id)) {
            return prev;
          }
          return {
            ...prev,
            data: [...prev.data, payload.message],
            meta: { ...prev.meta, total: prev.meta.total + 1 },
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(),
      });
    };

    const joinCurrentConversation = () => {
      socket.emit(
        "join",
        { conversationId },
        (result?: { ok?: boolean; error?: string }) => {
          if (!result?.ok) {
            console.warn(
              `Failed to join chat room for ${conversationId}: ${result?.error ?? "unknown error"}`,
            );
          }
        },
      );
    };

    socket.on("message:new", onNew);
    socket.on("connect", joinCurrentConversation);
    if (socket.connected) {
      joinCurrentConversation();
    }

    return () => {
      socket.emit("leave", { conversationId });
      socket.off("connect", joinCurrentConversation);
      socket.off("message:new", onNew);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data?.data.length]);

  const myId = me.data?.id;

  return (
    <section className="page chat-thread-page">
      <p className="back">
        <Link to="/messages" className="text-link">
          ← Inbox
        </Link>
      </p>
      {messagesQuery.isLoading && <p>Loading…</p>}
      {messagesQuery.isError && (
        <p className="error" role="alert">
          {messagesQuery.error instanceof Error
            ? messagesQuery.error.message
            : "Could not load messages"}
        </p>
      )}
      {messagesQuery.data && (
        <>
          <div className="chat-messages">
            {messagesQuery.data.data.map((m) => {
              const mine = myId != null && m.sender.id === myId;
              return (
                <div
                  key={m.id}
                  className={`chat-bubble-wrap ${mine ? "mine" : "theirs"}`}
                >
                  <div className="chat-bubble">
                    {!mine && (
                      <div className="chat-sender">{m.sender.displayName}</div>
                    )}
                    <div className="chat-body">{m.body}</div>
                    <div className="chat-time muted">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const text = String(fd.get("body") ?? "").trim();
              if (!text) {
                return;
              }
              send.mutate(text);
              e.currentTarget.reset();
            }}
          >
            <input
              name="body"
              className="input"
              placeholder="Write a message…"
              autoComplete="off"
              disabled={send.isPending}
            />
            <button type="submit" className="button" disabled={send.isPending}>
              Send
            </button>
          </form>
          {send.isError && (
            <p className="error" role="alert">
              {send.error instanceof Error ? send.error.message : "Send failed"}
            </p>
          )}
        </>
      )}
    </section>
  );
}
