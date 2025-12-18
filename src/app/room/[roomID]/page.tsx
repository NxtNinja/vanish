"use client";

import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, CopyCheck, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { message } from "@/lib/realtime";

type DisplayMessage = message & {
  isSending?: boolean;
};

const Room = () => {
  const params = useParams();
  const roomId = params.roomID as string;

  const router = useRouter();

  const { username } = useUsername();
  const queryClient = useQueryClient();

  const [copyState, setCopyState] = useState("Copy");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } });
      return res.data;
    },
  });

  useEffect(() => {
    if (ttlData?.ttl !== undefined) {
      setTimeRemaining(ttlData.ttl);
    }
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) {
      return;
    }

    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } });
      return res.data as { messages: DisplayMessage[] };
    },
  });

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopyState("Copied!");

    setTimeout(() => {
      setCopyState("Copy");
    }, 1000);
  };

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        { sender: username, text },
        { query: { roomId } }
      );
      setInput("");
    },
    onMutate: async ({ text }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", roomId] });

      const previousMessages = queryClient.getQueryData<{
        messages: DisplayMessage[];
      }>(["messages", roomId]);

      const optimisticMessage: DisplayMessage = {
        id: `optimistic-${Date.now()}`,
        sender: username,
        text,
        timestamp: Date.now(),
        roomId,
        isSending: true,
      };

      queryClient.setQueryData<{ messages: DisplayMessage[] }>(
        ["messages", roomId],
        (old) => ({
          messages: [...(old?.messages || []), optimisticMessage],
        })
      );

      return { previousMessages };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        ["messages", roomId],
        context?.previousMessages
      );
    },
  });

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } });
    },
  });

  const { mutate: sendTyping } = useMutation({
    mutationFn: async (isTyping: boolean) => {
      await client.messages.typing.post(
        { sender: username, isTyping },
        { query: { roomId } }
      );
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      sendTyping(true);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy", "chat.typing"],
    onData: ({ event, data }) => {
      if (event === "chat.message") {
        refetch();
      }

      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }

      if (event === "chat.typing") {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.sender);
          } else {
            newSet.delete(data.sender);
          }
          return newSet;
        });
      }
    },
  });
  return (
    <>
      <main className="flex flex-col h-screen max-h-screen overflow-hidden">
        <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 uppercase">Room ID</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-green-500">{roomId}</span>
                <button
                  onClick={() => copyLink()}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copyState === "Copy" ? (
                    <Copy size={18} />
                  ) : (
                    <CopyCheck size={18} />
                  )}
                </button>
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 uppercase">
                Self Destruct
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-2 ${
                  timeRemaining !== null && timeRemaining < 60
                    ? "text-red-500"
                    : "text-amber-500"
                }`}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining)
                  : "--:--"}
              </span>
            </div>
          </div>
          <button
            onClick={() => destroyRoom()}
            className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
          >
            <span className="group-hover:animate-pulse">💣</span>
            DESTROY NOW
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages?.messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <p className="text-zinc-600 text-sm font-mono">
                No messages yet, start the conversation
              </p>
            </div>
          )}

          {messages?.messages.map((msg) => (
            <div className="flex flex-col items-start" key={msg.id}>
              <div className="max-w-[80%] group">
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className={`text-xs font-bold ${
                      msg.sender === username
                        ? "text-green-500"
                        : "text-blue-500"
                    }`}
                  >
                    {msg.sender === username ? "You" : msg.sender}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {format(msg.timestamp, "HH:mm")}
                  </span>
                  {msg.isSending && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 animate-pulse">
                      <Loader2 size={10} className="animate-spin" />
                      sending...
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed break-all">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-2 text-xs text-zinc-500 italic animate-pulse">
            {Array.from(typingUsers)
              .filter((user) => user !== username)
              .join(", ")}{" "}
            {typingUsers.size === 1 && !typingUsers.has(username)
              ? "is typing..."
              : typingUsers.size > 1 ||
                (typingUsers.size === 1 && typingUsers.has(username))
              ? "are typing..."
              : ""}
          </div>
        )}

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                {">"}
              </span>
              <input
                autoFocus
                type="text"
                value={input}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    //SEND to backend
                    inputRef.current?.focus();
                    sendMessage({ text: input });
                  }
                }}
                placeholder="Type a Message..."
                onChange={handleInputChange}
                className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
              />
            </div>
            <button
              onClick={() => {
                sendMessage({ text: input });
                inputRef.current?.focus();
              }}
              disabled={!input.trim() || isPending}
              className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              SEND
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default Room;
