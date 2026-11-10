import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FaBars, FaPaperPlane, FaPen, FaPlus, FaTrash, FaXmark } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { apiGet, apiSend, ApiError } from "../api/client";
import { useAuth } from "../context/authContext";
import { formatCount, formatPrice, formatRating, safeExternalUrl } from "../utils/format";

type Source = { title: string; url: string };
type ChatProduct = {
  productId?: string;
  asin: string;
  title: string;
  imgUrl?: string | null;
  productURL?: string | null;
  price?: number | null;
  stars?: number | null;
  reviews?: number | null;
  isBestSeller?: boolean;
  aiProductScore?: number | null;
};
type MessageMetadata = {
  intent?: string;
  products?: ChatProduct[];
  productReferences?: { productId: string; position: number; title: string }[];
  sources?: Source[];
  retrievalSources?: string[];
};
type ChatMessage = {
  _id?: string;
  sender: "User" | "Assistent";
  message: string;
  createdAt?: string;
  metadata?: MessageMetadata;
};
type ChatSummary = { _id: string; title: string; updatedAt?: string; createdAt?: string };
type GuestChat = ChatSummary & { messages: ChatMessage[] };
type ConversationContext = {
  summary: string;
  recent_messages: { role: "user" | "assistant"; content: string }[];
  referenced_products: { product_id: string; position: number; kind: "recommended" | "discussed"; turn: number; title: string }[];
};
type TurnResponse = {
  success: boolean;
  chat?: ChatSummary;
  messages?: ChatMessage[];
  answer: string;
  intent?: string;
  products?: ChatProduct[];
  sources?: Source[];
  retrievalSources?: string[];
  assistantMessage?: ChatMessage;
};
type HistoryResponse = { chat: ChatSummary; messages: ChatMessage[] };

const GUEST_STORAGE_KEY = "shop-pilot-guest-conversations-v1";
const EMPTY_CONTEXT: ConversationContext = { summary: "", recent_messages: [], referenced_products: [] };

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (message.sender === "User" || message.sender === "Assistent") && typeof message.message === "string";
}

function loadGuestChats(): { chats: GuestChat[]; error: string | null } {
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return { chats: [], error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { chats: [], error: "Saved guest chats could not be read. Start a new chat to continue." };
    const chats = parsed.flatMap((item): GuestChat[] => {
      if (!item || typeof item !== "object") return [];
      const chat = item as Partial<GuestChat>;
      if (typeof chat._id !== "string" || typeof chat.title !== "string" || !Array.isArray(chat.messages)) return [];
      return [{ ...chat, messages: chat.messages.filter(isChatMessage).slice(-100) } as GuestChat];
    }).slice(0, 30);
    return { chats, error: null };
  } catch {
    return { chats: [], error: "Browser storage is unavailable. Guest chats may not be saved after this visit." };
  }
}

function persistGuestChats(chats: GuestChat[]): string | null {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(chats.slice(0, 30)));
    return null;
  } catch {
    return "Browser storage is unavailable. This guest chat will not be saved after this visit.";
  }
}

function validChatProducts(value: unknown): ChatProduct[] {
  if (!Array.isArray(value)) return [];
  return value.filter((product): product is ChatProduct =>
    Boolean(product && typeof product === "object" && typeof product.asin === "string" && typeof product.title === "string")
  ).slice(0, 12);
}

function InlineText({ text }: { text: string }) {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    if (match[2] && match[3]) {
      const url = safeExternalUrl(match[3]);
      nodes.push(url
        ? <a key={index} href={url} target="_blank" rel="noreferrer" className="text-emerald-700 underline break-all">{match[2]}</a>
        : match[2]);
    } else if (match[4]) nodes.push(<strong key={index}>{match[4]}</strong>);
    else if (match[5]) nodes.push(<code key={index} className="rounded bg-gray-100 px-1 py-0.5 text-xs">{match[5]}</code>);
    else if (match[6]) nodes.push(<em key={index}>{match[6]}</em>);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function SafeMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const tableCells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`} className="mb-3 last:mb-0">{paragraph.join(" ")}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push(<ul key={`ul-${blocks.length}`} className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{list.map((line, index) => <li key={index}><InlineText text={line} /></li>)}</ul>);
    list = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    const listItem = /^(?:[-*]|\d+\.)\s+(.+)$/.exec(trimmed);
    const nextIsSeparator = line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]);
    if (nextIsSeparator) {
      flushParagraph();
      flushList();
      const headers = tableCells(line);
      const rows: string[][] = [];
      let rowIndex = index + 2;
      while (rowIndex < lines.length && lines[rowIndex].includes("|") && lines[rowIndex].trim()) {
        rows.push(tableCells(lines[rowIndex]));
        rowIndex += 1;
      }
      blocks.push(
        <div key={`table-${blocks.length}`} className="mb-3 overflow-x-auto rounded-lg border border-gray-200 last:mb-0">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-gray-50">
              <tr>{headers.map((header, index) => <th key={index} scope="col" className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-700"><InlineText text={header} /></th>)}</tr>
            </thead>
            <tbody>{rows.map((row, rowNumber) => (
              <tr key={rowNumber} className="odd:bg-white even:bg-gray-50">
                {headers.map((_, column) => <td key={column} className="border-b border-gray-100 px-3 py-2 align-top text-gray-700">{row[column] ? <InlineText text={row[column]} /> : "Not listed"}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
      index = rowIndex - 1;
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push(<h3 key={`h-${blocks.length}`} className="mb-2 mt-4 text-base font-semibold first:mt-0">{heading[2]}</h3>);
    } else if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  return <div className="break-words text-sm leading-6 text-gray-800">{blocks}</div>;
}

function ProductCards({ products }: { products: ChatProduct[] }) {
  if (!products.length) return null;
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const price = formatPrice(product.price);
        const image = safeExternalUrl(product.imgUrl);
        const detailsUrl = `/product/${encodeURIComponent(product.asin)}`;
        return (
          <article key={product.productId || product.asin} className="flex min-w-0 gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <Link to={detailsUrl} className="h-24 w-24 shrink-0 rounded-lg bg-gray-50 p-1">
              {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-2xl">🛍️</div>}
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={detailsUrl} className="line-clamp-3 text-sm font-semibold text-gray-900 hover:text-emerald-700">{product.title}</Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {formatRating(product.stars) && <span className="font-semibold text-amber-600">★ {formatRating(product.stars)}</span>}
                {formatCount(product.reviews) && <span>{formatCount(product.reviews)} reviews</span>}
                {product.isBestSeller && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Bestseller</span>}
              </div>
              {price && <p className="mt-1 font-bold text-gray-900">{price}</p>}
              {product.productURL && safeExternalUrl(product.productURL) && (
                <a href={safeExternalUrl(product.productURL) ?? undefined} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-emerald-700 underline">View on Amazon</a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MessageBody({ message }: { message: ChatMessage }) {
  const assistant = message.sender === "Assistent";
  const products = validChatProducts(message.metadata?.products);
  const sources = (message.metadata?.sources ?? []).filter((source) => safeExternalUrl(source.url));
  return (
    <div className={`flex ${assistant ? "justify-start" : "justify-end"}`}>
      <div className={`w-full max-w-3xl rounded-2xl px-4 py-3 ${assistant ? "bg-white shadow-sm ring-1 ring-gray-100" : "bg-emerald-800 text-white"}`}>
        {assistant
          ? <SafeMarkdown text={message.message} />
          : <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>}
        {assistant && <ProductCards products={products} />}
        {assistant && sources.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Web sources</p>
            <ul className="space-y-1">
              {sources.map((source, index) => (
                <li key={`${source.url}-${index}`}><a href={safeExternalUrl(source.url) ?? undefined} target="_blank" rel="noreferrer" className="break-all text-xs text-emerald-700 underline">{source.title || source.url}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatContent() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("New chat");
  const [input, setInput] = useState("");
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);
  const userId = user?.id ?? null;

  const activeChat = useMemo(() => chats.find((chat) => chat._id === activeChatId) ?? null, [activeChatId, chats]);

  const refreshChats = useCallback(async (identity: string | null, generation: number) => {
    setLoadingChats(true);
    setError(null);
    if (!identity) {
      const result = loadGuestChats();
      if (generationRef.current === generation) {
        setChats(result.chats);
        setStorageWarning(result.error);
        setLoadingChats(false);
      }
      return;
    }
    try {
      const result = await apiGet<ChatSummary[]>("/conversation/", undefined, undefined, true);
      if (generationRef.current === generation) {
        setChats(Array.isArray(result) ? result : []);
        setStorageWarning(null);
        setLoadingChats(false);
      }
    } catch (reason) {
      if (generationRef.current === generation) {
        setError(reason instanceof Error ? reason.message : "Could not load your conversations.");
        setLoadingChats(false);
      }
    }
  }, []);

  useEffect(() => {
    const generation = ++generationRef.current;
    void refreshChats(userId, generation);
    return () => { generationRef.current += 1; };
  }, [refreshChats, userId]);

  useEffect(() => {
    if (!activeChatId || activeChatId.startsWith("guest-") || !userId) return;
    const generation = generationRef.current;
    const identity = userId;
    apiGet<HistoryResponse>(`/conversation/${encodeURIComponent(activeChatId)}`, undefined, undefined, true)
      .then((result) => {
        if (generationRef.current !== generation || userId !== identity) return;
        setMessages(Array.isArray(result.messages) ? result.messages.filter(isChatMessage) : []);
        setChats((previous) => previous.map((chat) => chat._id === result.chat._id ? result.chat : chat));
        setLoadingChats(false);
      })
      .catch((reason: unknown) => {
        if (generationRef.current !== generation) return;
        setError(reason instanceof Error ? reason.message : "Could not load this conversation.");
        setLoadingChats(false);
      });
  }, [activeChatId, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingQuery]);

  const selectChat = (id: string) => {
    if (sending) return;
    setError(null);
    if (id.startsWith("guest-")) {
      const guestChat = (chats as GuestChat[]).find((chat) => chat._id === id);
      setMessages(guestChat?.messages ?? []);
      if (guestChat) setDraftTitle(guestChat.title);
    } else {
      setMessages([]);
    }
    setActiveChatId(id);
    setSidebarOpen(false);
  };

  const startNewChat = () => {
    if (sending) return;
    setError(null);
    setActiveChatId(null);
    setMessages([]);
    setDraftTitle("New chat");
    setInput("");
    setSidebarOpen(false);
  };

  const appendGuestChat = (chat: GuestChat) => {
    const guestChats = chats as GuestChat[];
    const next: GuestChat[] = [chat, ...guestChats.filter((item) => item._id !== chat._id)].slice(0, 30);
    setChats(next);
    setStorageWarning(persistGuestChats(next));
  };

  const sendQuery = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query || sending) return;
    const generation = generationRef.current;
    const identity = userId;
    const currentChatId = activeChatId;
    setSending(true);
    setPendingQuery(query);
    setError(null);
    setInput("");
    try {
      let result: TurnResponse;
      if (identity) {
        const response = currentChatId && !currentChatId.startsWith("guest-")
          ? await apiSend<TurnResponse>("POST", `/conversation/message/${encodeURIComponent(currentChatId)}`, { query })
          : await apiSend<TurnResponse>("POST", "/conversation/", { query });
        result = response;
      } else {
        const guestMessages = currentChatId?.startsWith("guest-")
          ? loadGuestChats().chats.find((chat) => chat._id === currentChatId)?.messages ?? messages
          : messages;
        const context: ConversationContext = {
          ...EMPTY_CONTEXT,
          recent_messages: guestMessages.slice(-5).filter(isChatMessage).map((message) => ({
            role: message.sender === "User" ? "user" : "assistant",
            content: message.message.slice(0, 600)
          })),
          referenced_products: guestMessages.flatMap((message, index) =>
            validChatProducts(message.metadata?.products).map((product, position) => ({
              product_id: product.productId ?? "",
              position: position + 1,
              kind: message.metadata?.intent === "product_recommendation" ? "recommended" as const : "discussed" as const,
              turn: Math.floor(index / 2),
              title: product.title.slice(0, 100)
            }))
          ).filter((product) => /^[a-f0-9]{24}$/i.test(product.product_id)).slice(-8)
        };
        result = await apiSend<TurnResponse>("POST", "/conversation/guest/message", { query, conversation_context: context });
      }
      if (generationRef.current !== generation || userId !== identity) return;
      const assistant = result.assistantMessage ?? result.messages?.find((message) => message.sender === "Assistent") ?? {
        sender: "Assistent" as const,
        message: result.answer,
        metadata: {
          intent: result.intent,
          products: result.products ?? [],
          sources: result.sources ?? [],
          retrievalSources: result.retrievalSources ?? []
        }
      };
      if (identity) {
        const chatId = result.chat?._id ?? currentChatId;
        if (chatId) {
          setActiveChatId(chatId);
          setChats((previous) => {
            const chat = result.chat ?? previous.find((item) => item._id === chatId);
            return chat ? [chat, ...previous.filter((item) => item._id !== chatId)] : previous;
          });
          setMessages((previous) => [
            ...previous,
            { sender: "User", message: query },
            { ...assistant, createdAt: new Date().toISOString() }
          ]);
          if (!currentChatId) {
            window.setTimeout(() => {
              const nextGeneration = generationRef.current;
              void refreshChats(identity, nextGeneration);
            }, 1200);
          }
        }
      } else {
        const guestId = currentChatId?.startsWith("guest-") ? currentChatId : `guest-${crypto.randomUUID()}`;
        const guestMessages = currentChatId?.startsWith("guest-")
          ? loadGuestChats().chats.find((chat) => chat._id === currentChatId)?.messages ?? messages
          : messages;
        const nextMessages = [...guestMessages, { sender: "User" as const, message: query }, { sender: "Assistent" as const, message: assistant.message, metadata: assistant.metadata }];
        setActiveChatId(guestId);
        setMessages(nextMessages);
        const title = currentChatId?.startsWith("guest-") ? draftTitle : (query.length > 50 ? `${query.slice(0, 47)}...` : query);
        setDraftTitle(title);
        appendGuestChat({ _id: guestId, title, messages: nextMessages, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    } catch (reason) {
      if (generationRef.current !== generation) return;
      const message = reason instanceof ApiError && reason.status === 429
        ? reason.message
        : reason instanceof Error ? reason.message : "The assistant could not respond. Please try again.";
      setError(message);
      setInput(query);
    } finally {
      if (generationRef.current === generation) {
        setSending(false);
        setPendingQuery(null);
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuery(input);
  };

  const renameChat = async (chat: ChatSummary) => {
    const title = window.prompt("Rename conversation", chat.title)?.trim();
    if (!title || title === chat.title) return;
    if (title.length > 80) {
      setError("Conversation titles must be 80 characters or fewer.");
      return;
    }
    if (userId) {
      try {
        const result = await apiSend<{ chat: ChatSummary }>("PUT", `/conversation/${encodeURIComponent(chat._id)}`, { title });
        setChats((previous) => previous.map((item) => item._id === chat._id ? result.chat : item));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not rename this conversation.");
      }
    } else {
      const updated = { ...chat, title } as GuestChat;
      const next = chats.map((item) => item._id === chat._id ? updated : item) as GuestChat[];
      setChats(next);
      setStorageWarning(persistGuestChats(next));
      if (activeChatId === chat._id) setDraftTitle(title);
    }
  };

  const deleteChat = async (chat: ChatSummary) => {
    if (!window.confirm(`Delete "${chat.title}"? This cannot be undone.`)) return;
    if (userId) {
      try {
        await apiSend<{ success: boolean }>("DELETE", `/conversation/${encodeURIComponent(chat._id)}`);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not delete this conversation.");
        return;
      }
    }
    setChats((previous) => {
      const next = previous.filter((item) => item._id !== chat._id);
      if (!userId) {
        const warning = persistGuestChats(next as GuestChat[]);
        if (warning) setStorageWarning(warning);
      }
      return next;
    });
    if (activeChatId === chat._id) startNewChat();
  };

  return (
    <main className="relative flex h-[calc(100vh-4rem)] min-h-[32rem] overflow-hidden bg-[#f7f8fa] text-left">
      {sidebarOpen && <button aria-label="Close conversation menu" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`absolute inset-y-0 left-0 z-40 flex w-[min(84vw,19rem)] flex-col border-r border-gray-200 bg-white transition-transform md:relative md:z-0 md:w-72 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
          <span className="font-semibold text-gray-900">Your chats</span>
          <button type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="rounded p-2 text-gray-500 hover:bg-gray-100 md:hidden"><FaXmark /></button>
          <button type="button" onClick={startNewChat} disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"><FaPlus /> New chat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loadingChats ? <p className="px-2 py-4 text-sm text-gray-500">Loading conversations…</p> : chats.length === 0
            ? <p className="px-2 py-4 text-sm text-gray-500">Your conversations will appear here.</p>
            : <ul className="space-y-1">{chats.map((chat) => (
              <li key={chat._id} className={`group flex items-center gap-1 rounded-lg ${activeChatId === chat._id ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                <button type="button" disabled={sending} onClick={() => selectChat(chat._id)} className="min-w-0 flex-1 px-3 py-3 text-left disabled:opacity-60">
                  <span className="block truncate text-sm font-medium text-gray-800">{chat.title || "New chat"}</span>
                  {chat.updatedAt && <span className="mt-1 block text-xs text-gray-400">{new Date(chat.updatedAt).toLocaleDateString()}</span>}
                </button>
                <button type="button" disabled={sending} aria-label={`Rename ${chat.title}`} onClick={() => void renameChat(chat)} className="rounded p-2 text-gray-400 hover:bg-white hover:text-gray-800 disabled:opacity-40"><FaPen className="text-xs" /></button>
                <button type="button" disabled={sending} aria-label={`Delete ${chat.title}`} onClick={() => void deleteChat(chat)} className="mr-1 rounded p-2 text-gray-400 hover:bg-white hover:text-red-600 disabled:opacity-40"><FaTrash className="text-xs" /></button>
              </li>
            ))}</ul>}
        </div>
        <div className="border-t border-gray-100 p-4 text-xs leading-5 text-gray-500">
          {user ? <>Private chat history is saved to your account.</> : <>Guest chats stay in this browser. <Link to="/login" className="font-medium text-emerald-800 underline">Sign in</Link> to save chats to your account.</>}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <button type="button" aria-label="Open conversations" onClick={() => setSidebarOpen(true)} className="rounded p-2 text-gray-600 hover:bg-gray-100 md:hidden"><FaBars /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-gray-900">{activeChat?.title ?? (activeChatId?.startsWith("guest-") ? draftTitle : "Ask ShopPilot")}</h1>
            <p className="text-xs text-gray-500">{user ? "Personalized product research" : "Guest chat · no account required"}</p>
          </div>
          <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> AI shopping assistant</span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-5">
            {messages.length === 0 && !pendingQuery && (
              <div className="mx-auto mt-10 max-w-xl text-center sm:mt-20">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl">✨</div>
                <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">What are you shopping for?</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">Ask for recommendations, compare products, or follow up about reviews and real-world pros and cons.</p>
                <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                  {["Find headphones under ₹10,000", "Compare two products", "Tell me about product reviews", "Help me choose a laptop"].map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => void sendQuery(suggestion)} className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 hover:border-emerald-500 hover:bg-emerald-50">{suggestion}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.filter(isChatMessage).map((message, index) => <MessageBody key={message._id ?? `${index}-${message.sender}`} message={message} />)}
            {pendingQuery && <>
              <MessageBody message={{ sender: "User", message: pendingQuery }} />
              <div className="flex justify-start"><div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-600" />ShopPilot is researching products…</div></div>
            </>}
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p>{error}</p>
                <button type="button" onClick={() => void sendQuery(input)} disabled={!input.trim() || sending} className="mt-2 font-semibold underline disabled:opacity-50">Retry</button>
              </div>
            )}
            {storageWarning && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{storageWarning}</p>}
            <div ref={endRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
            <label htmlFor="chat-prompt" className="sr-only">Message ShopPilot</label>
            <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
              <textarea
                id="chat-prompt"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (input.trim()) void sendQuery(input);
                  }
                }}
                maxLength={2000}
                rows={1}
                placeholder="Ask about products, reviews, or comparisons…"
                className="max-h-36 min-h-11 flex-1 resize-y border-0 bg-transparent px-3 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                disabled={sending}
              />
              <button type="submit" disabled={!input.trim() || sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-gray-300" aria-label="Send message">
                <FaPaperPlane />
              </button>
            </div>
            <p className="mt-2 flex items-center justify-between text-[11px] text-gray-400"><span>AI responses may be incomplete. Verify important product details before buying.</span><span>{input.length}/2000</span></p>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function Chat() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-gray-50 text-sm text-gray-500">Loading ShopPilot chat…</main>;
  return <ChatContent key={user?.id ?? "guest"} />;
}
