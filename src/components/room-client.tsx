"use client";

import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, CopyCheck, Loader2, SendHorizonal } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { message } from "@/lib/realtime";

type DisplayMessage = message & {
  isSending?: boolean;
};

export function RoomClient() {
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
  const [isDestroying, setIsDestroying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    const handleVisualViewportResize = () => {
      if (window.visualViewport && mainRef.current) {
        mainRef.current.style.height = `${window.visualViewport.height}px`;
        scrollToBottom();
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportResize);
      window.visualViewport.addEventListener("scroll", handleVisualViewportResize);
      // Initial call
      handleVisualViewportResize();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportResize);
        window.visualViewport.removeEventListener("scroll", handleVisualViewportResize);
      }
    };
  }, []);

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
      setIsDestroying(true);
      setTimeout(() => {
        router.push("/lobby?destroyed=true");
      }, 1000);
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

  const { data: messages } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } });
      return res.data as { messages: DisplayMessage[] };
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    },
    onMutate: async ({ text }) => {
      // Clear input immediately when user sends message
      setInput("");
      
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
    onError: (err, variables, context) => {
      // Restore input on error so user can retry
      setInput(variables.text);
      queryClient.setQueryData(
        ["messages", roomId],
        context?.previousMessages
      );
    },
  });

  const { mutate: destroyRoom } = useMutation({
    onMutate: () => {
      setIsDestroying(true);
    },
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } });
    },
    onSuccess: () => {
      router.push("/lobby?destroyed=true");
    },
    onError: (err) => {
      setIsDestroying(false);
      console.error("Failed to destroy room:", err);
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
      console.log("Realtime event:", event, data);
      
      if (event === "chat.message") {
        // Use realtime message data directly - no refetch needed!
        // This makes messages appear instantly without an API call
        const newMessage = data as message;
        
        queryClient.setQueryData<{ messages: DisplayMessage[] }>(
          ["messages", roomId],
          (old) => {
            const existing = old?.messages || [];
            
            // Deduplicate by ID to handle simultaneous messages gracefully
            if (existing.some(m => m.id === newMessage.id)) {
              return old;
            }
            
            // Remove optimistic message with matching sender and text
            // This replaces the "sending..." message with the confirmed one
            const filtered = existing.filter(m => 
              !(m.isSending && m.sender === newMessage.sender && m.text === newMessage.text)
            );
            
            return { messages: [...filtered, newMessage] };
          }
        );
      }

      if (event === "chat.destroy") {
        // Immediately respond to destroy event - no delays
        setIsDestroying(true);
        // Short timeout just for visual feedback, then navigate
        setTimeout(() => {
          router.push("/lobby?destroyed=true");
        }, 500);
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
      {isDestroying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-500">
          <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-xl">
                💣
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                DESTROYING ROOM
              </h2>
              <p className="text-zinc-500 text-sm font-mono">
                Wiping all traces from existence...
              </p>
            </div>
          </div>
        </div>
      )}
      <main 
        ref={mainRef}
        className={`flex flex-col overflow-hidden transition-all duration-700 ${isDestroying ? 'blur-sm scale-[0.98]' : ''}`}
        style={{ height: '100dvh' }}
      >
        {/* Square Modern Header */}
        <header className="border-b-2 border-green-500/20 bg-black">
          <div className="grid grid-cols-[1fr_auto] md:grid-cols-3 gap-4 p-4 md:p-5">
            {/* Room Info */}
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-green-500 font-bold tracking-widest uppercase">ROOM</div>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono text-sm md:text-base font-bold">{roomId}</span>
                <button
                  onClick={() => copyLink()}
                  className="bg-zinc-900 hover:bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                  aria-label="Copy link"
                >
                  {copyState === "Copy" ? (
                    <Copy size={14} />
                  ) : (
                    <CopyCheck size={14} className="text-green-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Timer - Hidden on mobile, centered on desktop */}
            <div className="hidden md:flex flex-col gap-1 items-center justify-center">
              <div className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">TIMER</div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-lg font-bold tabular-nums ${
                    timeRemaining !== null && timeRemaining < 60
                      ? "text-red-500"
                      : "text-amber-400"
                  }`}
                >
                  {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
                </span>
              </div>
            </div>

            {/* Destroy Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => destroyRoom()}
                className="bg-zinc-900 hover:bg-red-600 border-2 border-zinc-800 hover:border-red-500 px-4 py-2 text-zinc-400 hover:text-white font-bold text-xs md:text-sm tracking-wider uppercase transition-all"
              >
                VANISH
              </button>
            </div>
          </div>
          
          {/* Mobile Timer Row */}
          <div className="md:hidden border-t border-zinc-800 px-4 py-2 flex items-center justify-between bg-zinc-950">
            <div className="text-[10px] text-amber-500 font-bold tracking-widest uppercase">TIMER</div>
            <span
              className={`font-mono text-sm font-bold tabular-nums ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-500"
                  : "text-amber-400"
              }`}
            >
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages?.messages.length === 0 && (
            <div className="flex justify-center items-center h-[60dvh]">
              <p className="text-zinc-600 text-sm font-mono">
                No messages yet, start the conversation
              </p>
            </div>
          )}

          {messages?.messages.map((msg) => (
            <div className="flex flex-col items-start group" key={msg.id}>
              <div className="w-full max-w-[85%] md:max-w-[70%]">
                {/* Message Header */}
                <div className="flex items-baseline gap-3 mb-2 px-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      msg.sender === username
                        ? "text-green-500"
                        : "text-blue-500"
                    }`}
                  >
                    {msg.sender === username ? "You" : msg.sender}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {format(msg.timestamp, "HH:mm")}
                  </span>
                  {msg.isSending && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" />
                      <span>sending...</span>
                    </span>
                  )}
                </div>
                
                {/* Message Content with Left Border Accent */}
                <div className={`border-l-4 pl-3 py-1 ${
                  msg.sender === username
                    ? "border-green-500"
                    : "border-blue-500"
                }`}>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-3 border-t border-zinc-800/50">
            <div className="flex items-center gap-3 max-w-[85%] md:max-w-[70%]">
              {/* Animated Dots */}
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
              </div>
              
              {/* Typing Text */}
              <div className="text-xs text-zinc-400 font-medium">
                <span className="text-blue-400 font-bold">
                  {Array.from(typingUsers)
                    .filter((user) => user !== username)
                    .join(", ")}
                </span>
                {" "}
                <span className="text-zinc-500">
                  {typingUsers.size === 1 && !typingUsers.has(username)
                    ? "is typing"
                    : typingUsers.size > 1 ||
                      (typingUsers.size === 1 && typingUsers.has(username))
                    ? "you are typing"
                    : ""}
                </span>
              </div>
            </div>
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
                    inputRef.current?.focus();
                    sendMessage({ text: input });
                  }
                }}
                placeholder="Type a Message..."
                onChange={handleInputChange}
                onFocus={() => {
                  setTimeout(scrollToBottom, 300);
                }}
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
              <SendHorizonal/>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
