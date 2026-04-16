"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MoreVertical,
  Smile,
  Forward,
  Trash2,
  Paperclip,
  Send,
  Phone,
  Video,
  ArrowLeft,
  X,
  MessageCircle,
  Users,
  CircleDashed,
  LogOut,
  Plus,
  Search,
  Image,
  Mic,
  Sticker,
  Bell,
  Lock,
  HelpCircle
} from "lucide-react";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";
import LoadingScreen from "./LoadingScreen";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉", "🤝"];

export default function ChatApp() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [section, setSection] = useState("chats");
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState(null); // 'chats', 'notifications', 'privacy', 'help'
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // Settings state
  const [theme, setTheme] = useState('dark');
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [callNotifications, setCallNotifications] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('relay-theme');
    const storedMsg = localStorage.getItem('relay-msg-notif');
    const storedGroup = localStorage.getItem('relay-group-notif');
    const storedCall = localStorage.getItem('relay-call-notif');
    const storedLastSeen = localStorage.getItem('relay-lastseen');
    const storedReceipts = localStorage.getItem('relay-read-receipts');

    if (storedTheme) setTheme(storedTheme);
    if (storedMsg !== null) setMessageNotifications(storedMsg !== 'false');
    if (storedGroup !== null) setGroupNotifications(storedGroup !== 'false');
    if (storedCall !== null) setCallNotifications(storedCall !== 'false');
    if (storedLastSeen !== null) setShowLastSeen(storedLastSeen !== 'false');
    if (storedReceipts !== null) setReadReceipts(storedReceipts !== 'false');

    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission || 'default');
    }

    setSettingsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem('relay-theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(theme);
    }
  }, [theme, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem('relay-msg-notif', String(messageNotifications));
  }, [messageNotifications, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem('relay-group-notif', String(groupNotifications));
  }, [groupNotifications, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem('relay-call-notif', String(callNotifications));
  }, [callNotifications, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem('relay-lastseen', String(showLastSeen));
  }, [showLastSeen, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem('relay-read-receipts', String(readReceipts));
  }, [readReceipts, settingsLoaded]);
  
  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [users, setUsers] = useState([]);
  const [statusText, setStatusText] = useState("");
  const [userStatus, setUserStatus] = useState("online");
  const [isLoading, setIsLoading] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  
  const [newRoomName, setNewRoomName] = useState("");

  const menuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  // Auth bootstrap on mount (supports cookie-based sessions)
  useEffect(() => {
    let mounted = true;
    async function bootstrapAuth() {
      setIsLoading(true);
      try {
        const data = await api("/api/auth/me");
        if (!mounted) return;
        setUser(data.user || null);
      } catch (_err) {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    bootstrapAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch user data when token changes (same-session bearer fallback)
  useEffect(() => {
    if (!token) {
      return;
    }
    
    async function fetchUser() {
      try {
        const data = await api("/api/auth/me", {}, token);
        setUser(data.user);
      } catch (err) {
        setToken("");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [token]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    
    async function fetchConversations() {
      try {
        const data = await api("/api/chat/conversations", {}, token);
        setRooms(data.conversations || []);
        if (data.conversations?.length && !activeRoomId) {
          setActiveRoomId(data.conversations[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      }
    }
    fetchConversations();
  }, [user, activeRoomId, token]);

  // Fetch messages when active room changes
  useEffect(() => {
    if (!activeRoomId) return;
    
    async function fetchMessages() {
      try {
        const data = await api(`/api/chat/conversations/${activeRoomId}/messages`, {}, token);
        setMessages(data.messages || []);
        if (data.messages?.length) {
          setLastSyncedAt(data.messages[data.messages.length - 1].createdAt);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    }
    fetchMessages();
  }, [activeRoomId, token]);

  // Socket connection
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket(token || undefined);
    socketRef.current = socket;

    socket.on("session:ready", () => {
      if (activeRoomId) {
        socket.emit("conversation:join", { conversationId: activeRoomId });
      }
    });

    socket.on("message:new", (message) => {
      if (message.conversationId === activeRoomId) {
        setMessages(prev => {
          if (prev.some((m) => m.id === message.id)) return prev;

          if (message.clientMessageId) {
            const pendingIndex = prev.findIndex((m) => m.clientMessageId === message.clientMessageId);
            if (pendingIndex >= 0) {
              const next = [...prev];
              next[pendingIndex] = message;
              return next;
            }
          }

          return [...prev, message];
        });
        setLastSyncedAt(message.createdAt);
      }
      // Update room's last message
      setRooms(prev => prev.map(r => {
        if (r.id === message.conversationId) {
          return { ...r, lastMessage: message, updatedAt: message.createdAt };
        }
        return r;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });

    socket.on("conversation:joined", ({ conversationId }) => {
      console.log("Joined conversation:", conversationId);
    });

    socket.on("connect", () => {
      if (activeRoomId && lastSyncedAt) {
        socket.emit("messages:sync", { conversationId: activeRoomId, since: lastSyncedAt }, (ack) => {
          if (!ack?.ok || !Array.isArray(ack.messages)) return;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const incoming = ack.messages.filter((m) => !existingIds.has(m.id));
            return incoming.length ? [...prev, ...incoming] : prev;
          });
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, activeRoomId, lastSyncedAt]);

  // Join room socket when activeRoomId changes
  useEffect(() => {
    if (socketRef.current && activeRoomId) {
      socketRef.current.emit("conversation:join", { conversationId: activeRoomId });
    }
  }, [activeRoomId]);

  // Click outside handler
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowChatMenu(false);
        setShowEmojiPicker(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auth functions
  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" 
        ? { email, password }
        : { username, email, password };
      
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(body) });

      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" }, token || undefined);
    } catch (_err) {
      // Always clear local state even if network logout fails.
    }
    setToken("");
    setUser(null);
    setRooms([]);
    setMessages([]);
    setActiveRoomId("");
  }

  // Message functions
  async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim() || !activeRoomId) return;

    const content = message.trim();
    setMessage("");
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Optimistic update
    const tempId = `temp-${clientMessageId}`;
    const tempMessage = {
      id: tempId,
      content,
      clientMessageId,
      sender: user,
      createdAt: new Date().toISOString(),
      type: "text"
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("message:send", {
          conversationId: activeRoomId,
          content,
          clientMessageId
        }, (ack) => {
          if (!ack?.ok || !ack.message) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            return;
          }
          setMessages(prev => prev.map(m => m.id === tempId ? ack.message : m));
          setLastSyncedAt(ack.message.createdAt);
        });
      } else {
        // Fallback to REST
        const data = await api(`/api/chat/conversations/${activeRoomId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content, clientMessageId })
        }, token);
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
        if (data.message?.createdAt) setLastSyncedAt(data.message.createdAt);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  async function deleteMessage(messageId) {
    try {
      await api(`/api/chat/conversations/${activeRoomId}/messages/${messageId}`, {
        method: "DELETE"
      }, token);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  }

  function addReaction(messageId, emoji) {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        const existing = reactions.findIndex(r => r.emoji === emoji && r.userId === user.id);
        if (existing >= 0) {
          reactions.splice(existing, 1);
        } else {
          reactions.push({ emoji, userId: user.id, username: user.username });
        }
        return { ...m, reactions };
      }
      return m;
    }));
  }

  function forwardMessage(msg) {
    setMessage(msg.content);
  }

  // Room functions
  async function createRoom(e) {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const data = await api("/api/chat/conversations/room", {
        method: "POST",
        body: JSON.stringify({ name: newRoomName.trim() })
      }, token);
      
      setRooms(prev => [data.conversation, ...prev]);
      setActiveRoomId(data.conversation.id);
      setNewRoomName("");
      setShowCreateRoom(false);
      setSection("chats");
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  }

  async function createDirectChat(targetUserId) {
    try {
      const data = await api("/api/chat/conversations/direct", {
        method: "POST",
        body: JSON.stringify({ targetUserId })
      }, token);
      
      // Check if already exists
      const exists = rooms.find(r => r.id === data.conversation.id);
      if (!exists) {
        setRooms(prev => [data.conversation, ...prev]);
      }
      setActiveRoomId(data.conversation.id);
      setShowNewChat(false);
      setSearch("");
      setUsers([]);
      setSection("chats");
    } catch (err) {
      console.error("Failed to create direct chat:", err);
    }
  }

  async function searchUsers() {
    if (!search.trim()) return;
    try {
      const data = await api(`/api/users?search=${encodeURIComponent(search)}`, {}, token);
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  }

  async function deleteChat() {
    if (!activeRoomId) return;
    try {
      await api(`/api/chat/conversations/${activeRoomId}`, {
        method: "DELETE"
      }, token);
      setRooms(prev => prev.filter(r => r.id !== activeRoomId));
      setActiveRoomId(rooms[0]?.id || "");
      setShowChatMenu(false);
      setShowContact(false);
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }

  async function blockContact() {
    if (!activeRoom) return;
    const otherUser = activeRoom.members?.find(m => m.id !== user.id);
    if (!otherUser) return;
    try {
      // For now just show alert - backend may not have block endpoint
      alert(`Blocked ${otherUser.username}`);
      setShowContact(false);
    } catch (err) {
      console.error("Failed to block contact:", err);
    }
  }

  async function saveProfile() {
    try {
      const payload = {};
      if (editName.trim() && editName.trim() !== (user?.name || "")) payload.name = editName.trim();
      if (editBio.trim() !== (user?.bio || "")) payload.bio = editBio.trim();
      if (editAvatar.trim() && editAvatar.trim() !== (user?.avatarUrl || "")) payload.avatarUrl = editAvatar.trim();

      if (!Object.keys(payload).length) {
        setShowProfile(false);
        return;
      }

      const data = await api("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload)
      }, token);
      setUser(data.user);
      setShowProfile(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  }

  // Status functions
  function addStatus() {
    const newStatus = {
      id: Date.now(),
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      text: "Available",
      timestamp: new Date().toISOString()
    };
    setStatuses(prev => [newStatus, ...prev]);
  }

  // Format time
  function formatTime(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  }

  // Get chat name
  function getChatName(room) {
    if (room.isGroup && room.name) return room.name;
    const other = room.members?.find(m => m.id !== user?.id);
    return other?.name || other?.username || "Unknown";
  }

  function getChatAvatar(room) {
    if (room.isGroup) return room.avatarUrl || "https://i.pravatar.cc/40?img=5";
    const other = room.members?.find(m => m.id !== user?.id);
    return other?.avatarUrl || `https://i.pravatar.cc/40?img=${room.id}`;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Login/Register screen - Beautiful design
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-6">
        <div className="relative w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="hidden md:flex md:w-1/2 relative">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800')" }}
            />
            <div className="absolute inset-0 bg-linear-to-br from-emerald-900/80 to-neutral-900/90" />
            <div className="relative z-10 p-12 flex flex-col justify-between h-full">
              <div>
                <p className="text-xs uppercase tracking-[0.6em] text-emerald-400 mb-4">Project Relay</p>
                <h1 className="text-4xl font-bold tracking-tight mb-4">Project Relay</h1>
                <p className="text-neutral-300 max-w-sm leading-relaxed">
                  Fast. Private. Reliable communication infrastructure for modern messaging.
                </p>
              </div>
              <div className="text-sm text-neutral-400">Built for secure information exchange.</div>
            </div>
          </div>

          <div className="auth-divider" aria-hidden="true" />

          <div className="w-full md:w-1/2 flex items-center justify-center py-12 px-8">
            <div className="w-full max-w-md">
              <div className="flex mb-8 bg-neutral-800 rounded-lg p-1">
                <button
                  onClick={() => { setMode("login"); setAuthError(""); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    mode === "login" ? "bg-emerald-600" : "text-neutral-400"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setMode("register"); setAuthError(""); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    mode === "register" ? "bg-emerald-600" : "text-neutral-400"
                  }`}
                >
                  Register
                </button>
              </div>

              <div className="relative overflow-hidden">
                <div
                  className={`flex transition-transform duration-700 ease-in-out ${mode === "register" ? "-translate-x-1/2" : "translate-x-0"}`}
                  style={{ width: "200%" }}
                >
                  <form onSubmit={handleAuth} className="w-1/2 pr-6 space-y-5">
                    <h2 className="text-2xl font-semibold">Welcome back</h2>
                    <p className="text-neutral-400 text-sm">Login to continue</p>

                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none transition"
                    />

                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none transition"
                    />

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full p-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 transition-all duration-300"
                    >
                      {authLoading ? "Signing in..." : "Login"}
                    </button>
                  </form>

                  <form onSubmit={handleAuth} className="w-1/2 pl-6 space-y-5">
                    <h2 className="text-2xl font-semibold">Create account</h2>
                    <p className="text-neutral-400 text-sm">Start using Project Relay</p>

                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none transition"
                    />

                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none transition"
                    />

                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none transition"
                    />

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full p-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 transition-all duration-300"
                    >
                      {authLoading ? "Creating account..." : "Register"}
                    </button>
                  </form>
                </div>
              </div>

              {authError && <p className="mt-4 text-sm text-red-300">{authError}</p>}
            </div>
          </div>
        </div>

        {/* Mobile section switcher */}
        <div className="md:hidden px-3 py-2 border-b border-neutral-800 flex items-center gap-2">
          <button
            onClick={() => setSection("chats")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${section === "chats" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-300"}`}
          >
            Chats
          </button>
          <button
            onClick={() => setSection("rooms")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${section === "rooms" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-300"}`}
          >
            Rooms
          </button>
          <button
            onClick={() => setSection("status")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${section === "status" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-300"}`}
          >
            Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-neutral-950 text-white relative overflow-hidden">

      {/* LEFT ICON BAR */}
      <div className="hidden md:flex flex-col items-center w-16 bg-neutral-900 border-r border-neutral-800 py-4 gap-4">

        <button
          onClick={() => setSection("chats")}
          className={`p-3 rounded-xl transition ${section === "chats" ? "bg-neutral-800 text-emerald-500" : "hover:bg-neutral-800"}`}
        >
          <MessageCircle size={20} />
        </button>

        <button
          onClick={() => setSection("rooms")}
          className={`p-3 rounded-xl transition ${section === "rooms" ? "bg-neutral-800 text-emerald-500" : "hover:bg-neutral-800"}`}
        >
          <Users size={20} />
        </button>

        <button
          onClick={() => setSection("status")}
          className={`p-3 rounded-xl transition ${section === "status" ? "bg-neutral-800 text-emerald-500" : "hover:bg-neutral-800"}`}
        >
          <CircleDashed size={20} />
        </button>

        <div className="mt-auto">
          <button
            onClick={logout}
            className="p-3 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>


      {/* SIDEBAR */}
      <div
        className={`
        ${mobileChatOpen ? "hidden md:flex" : "flex"}
        w-full md:w-80
        border-r border-neutral-800
        flex-col
        bg-neutral-900
        `}
      >

        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 relative">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setEditName(user?.name || "");
              setEditBio(user?.bio || "");
              setEditAvatar(user?.avatarUrl || "");
              setShowProfile(true);
            }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={`${user?.username || "User"} avatar`} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold">{user?.username}</div>
              <div className="text-xs text-emerald-500">{userStatus}</div>
            </div>
          </div>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-neutral-800 rounded-lg"
          >
            <MoreVertical />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-3 top-14 w-44 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl overflow-hidden z-50"
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  setEditName(user?.name || "");
                  setEditBio(user?.bio || "");
                  setEditAvatar(user?.avatarUrl || "");
                  setShowProfile(true);
                }}
                className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm"
              >
                Profile
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowSettings(true); }}
                className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm"
              >
                Settings
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowNewChat(true); }}
                className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm"
              >
                New Chat
              </button>
              <button
                onClick={() => { setShowMenu(false); setShowCreateRoom(true); }}
                className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm"
              >
                Create Room
              </button>
              <button
                onClick={() => { setShowMenu(false); logout(); }}
                className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* SEARCH */}
        {section === "chats" && (
          <div className="p-3 border-b border-neutral-800">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 pl-9"
              />
              <Search className="absolute left-3 top-2.5 text-neutral-500" size={16} />
            </div>
          </div>
        )}

        {/* CHAT LIST */}
        {section === "chats" && (
          <div className="flex-1 overflow-y-auto">
            {rooms
              .filter(c => {
                if (!search) return true;
                const name = getChatName(c).toLowerCase();
                return name.includes(search.toLowerCase());
              })
              .map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    setActiveRoomId(room.id);
                    setMobileChatOpen(true);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${
                    activeRoomId === room.id ? "bg-neutral-800" : "hover:bg-neutral-800"
                  }`}
                >
                  <img src={getChatAvatar(room)} alt={`${getChatName(room)} avatar`} className="w-10 h-10 rounded-full" />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium truncate">{getChatName(room)}</div>
                      {room.lastMessage && (
                        <div className="text-xs text-neutral-500">{formatTime(room.lastMessage.createdAt)}</div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-neutral-400 truncate">
                        {room.lastMessage?.type === "image" ? "📷 Image" : 
                         room.lastMessage?.type === "file" ? "📎 File" :
                         room.lastMessage?.content || "No messages yet"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            
            {rooms.length === 0 && (
              <div className="p-4 text-center text-neutral-500 text-sm">
                No conversations yet.<br/>Start a new chat!
              </div>
            )}
          </div>
        )}


        {/* ROOMS */}
        {section === "rooms" && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">

            <div className="flex gap-2">
              <button 
                onClick={() => setShowCreateRoom(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-sm font-semibold"
              >
                Create Room
              </button>
              <button 
                onClick={() => setShowNewChat(true)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded-lg text-sm"
              >
                Join Room
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {rooms.filter(r => r.isGroup).map((room) => (
                <div 
                  key={room.id}
                  onClick={() => { setActiveRoomId(room.id); setMobileChatOpen(true); }}
                  className={`bg-neutral-800 p-3 rounded-xl cursor-pointer hover:bg-neutral-700 ${activeRoomId === room.id ? "border border-emerald-500" : ""}`}
                >
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Users size={14} />
                    {room.name}
                  </div>
                  <div className="text-xs text-neutral-400">{room.members?.length || 0} members</div>
                </div>
              ))}
              
              {rooms.filter(r => r.isGroup).length === 0 && (
                <div className="text-center text-neutral-500 text-sm py-4">
                  No rooms yet. Create one!
                </div>
              )}
            </div>

          </div>
        )}


        {/* STATUS */}
        {section === "status" && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">

            <button 
              onClick={addStatus}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-sm font-semibold"
            >
              Add Status
            </button>

            {/* My Status */}
            <div className="flex items-center gap-3 mt-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={`${user?.username || "User"} avatar`} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold">My Status</div>
                <div className="text-xs text-neutral-400">Tap to add update</div>
              </div>
            </div>

            <div className="text-xs text-neutral-500 mt-4">Recent Updates</div>

            {/* Other users' statuses placeholder */}
            {rooms.slice(0, 3).map((room) => {
              const other = room.members?.find(m => m.id !== user?.id);
              if (!other) return null;
              return (
                <div key={room.id} className="flex items-center gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer">
                  <img src={other.avatarUrl || `https://i.pravatar.cc/40?img=${other.id}`} alt={`${other.name || other.username} avatar`} className="w-10 h-10 rounded-full" />
                  <div className="text-sm">
                    <div className="font-semibold">{other.name || other.username}</div>
                    <div className="text-xs text-neutral-400">Today</div>
                  </div>
                </div>
              );
            })}

          </div>
        )}  

      </div>


      {/* CHAT AREA */}
      <div
        className={`
        ${mobileChatOpen ? "flex" : "hidden md:flex"}
        flex-1 flex-col
        `}
      >

        {/* CHAT HEADER */}
        <div className="h-16 flex items-center justify-between px-4 md:px-5 border-b border-neutral-800 bg-neutral-900">

          <div className="flex items-center gap-3">

            <button
              className="md:hidden"
              onClick={() => setMobileChatOpen(false)}
            >
              <ArrowLeft />
            </button>

            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowContact(true)}
            >
              <img 
                src={activeRoom ? getChatAvatar(activeRoom) : "https://i.pravatar.cc/40"} 
                alt={activeRoom ? `${getChatName(activeRoom)} avatar` : "Chat avatar"}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full" 
              />

              <div>
                <div className="text-sm font-semibold">
                  {activeRoom ? getChatName(activeRoom) : "Select a chat"}
                </div>
                <div className="text-xs text-emerald-500">
                  {activeRoom?.isGroup ? `${activeRoom.members?.length || 0} members` : "online"}
                </div>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 md:gap-3 relative">
            <button className="p-2 hover:bg-neutral-800 rounded-lg">
              <Video />
            </button>
            <button className="p-2 hover:bg-neutral-800 rounded-lg">
              <Phone />
            </button>

            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="p-2 hover:bg-neutral-800 rounded-lg"
            >
              <MoreVertical />
            </button>

            {showChatMenu && (
              <div
                ref={menuRef}
                className="absolute right-0 top-12 w-44 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl overflow-hidden z-50"
              >
                <button 
                  onClick={() => { setShowChatMenu(false); setShowContact(true); }}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm"
                >
                  Contact Info
                </button>
                <button className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm">
                  Search in Chat
                </button>
                <button 
                  onClick={() => { setShowChatMenu(false); setMessages([]); }}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm"
                >
                  Clear Chat
                </button>
                <button 
                  onClick={() => { setShowChatMenu(false); deleteChat(); }}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-800 text-sm text-red-400"
                >
                  Delete Chat
                </button>
              </div>
            )}
          </div>
        </div>


        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
          {!activeRoom ? (
            <div className="h-full flex items-center justify-center text-neutral-500">
              Select a chat to start messaging
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500">
              No messages yet. Say hi!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user.id || msg.sender?.id === user.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className="relative max-w-[80%] md:max-w-md group">

                    <div
                      className={`px-4 py-2 text-sm md:text-base shadow-md relative flex flex-col gap-1 ${
                        isMe
                          ? "bg-emerald-600 text-white rounded-2xl rounded-br-sm"
                          : "bg-neutral-800 text-white rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      {!isMe && activeRoom?.isGroup && (
                        <div className="text-xs text-emerald-400 font-medium">
                          {msg.sender?.name || msg.sender?.username}
                        </div>
                      )}
                      
                      <div>{msg.content}</div>

                      <div className="flex items-center justify-end gap-2 text-[10px] opacity-70">
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && (
                          <span>✓</span>
                        )}
                      </div>

                      {msg.reactions?.length > 0 && (
                        <div className="absolute -bottom-3 right-2 flex gap-1 bg-neutral-900/90 backdrop-blur border border-neutral-700 px-2 py-0.5 rounded-full shadow">
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="text-[11px] leading-none">{r.emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message actions */}
                    <div className="absolute -top-3 right-0 hidden md:group-hover:flex gap-1 bg-neutral-900 border border-neutral-700 rounded-md p-1 shadow-lg z-10">
                      <button 
                        onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                        className="p-1 hover:text-emerald-400 rounded"
                      >
                        <Smile size={14} />
                      </button>
                      <button 
                        onClick={() => forwardMessage(msg)}
                        className="p-1 hover:text-emerald-400 rounded"
                      >
                        <Forward size={14} />
                      </button>
                      <button 
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 hover:text-red-400 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Emoji picker */}
                    {showEmojiPicker === msg.id && (
                      <div className="absolute -top-10 right-0 bg-neutral-800 border border-neutral-700 rounded-lg p-2 shadow-xl z-20 flex gap-1">
                        {EMOJI_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => { addReaction(msg.id, emoji); setShowEmojiPicker(null); }}
                            className="hover:bg-neutral-700 p-1 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>


        {/* INPUT */}
        <form
          onSubmit={sendMessage}
          className="p-3 md:p-4 border-t border-neutral-800 bg-neutral-900 flex items-center gap-2 md:gap-3"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-neutral-800 rounded-lg"
          >
            <Paperclip />
          </button>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim() && activeRoom) {
                  sendMessage(e);
                }
              }
            }}
            placeholder="Type a message..."
            disabled={!activeRoom}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 outline-none focus:border-emerald-500 text-sm md:text-base disabled:opacity-50 resize-none"
          />

          <button 
            type="submit" 
            disabled={!message.trim() || !activeRoom}
            className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send />
          </button>
        </form>
      </div>


      {/* CONTACT PANEL */}
      <div
        className={`
        fixed top-0 right-0 h-full
        w-full md:w-96
        bg-neutral-900 border-l border-neutral-800
        transform transition-transform duration-300 z-50
        ${showContact ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="font-semibold">Contact Info</h2>
          <button
            onClick={() => setShowContact(false)}
            className="p-2 hover:bg-neutral-800 rounded-lg"
          >
            <X />
          </button>
        </div>

        {activeRoom && (
          <>
            <div className="flex flex-col items-center py-10 border-b border-neutral-800">
              <img
                src={getChatAvatar(activeRoom)}
                alt={`${getChatName(activeRoom)} avatar`}
                className="w-28 h-28 rounded-full mb-4 object-cover"
              />
              <div className="text-xl font-semibold">{getChatName(activeRoom)}</div>
              <div className="text-sm text-neutral-400 mt-1">
                {activeRoom.isGroup ? `${activeRoom.members?.length || 0} members` : "Hey there! I am using Relay"}
              </div>
            </div>

            {/* Members in group */}
            {activeRoom.isGroup && (
              <div className="p-4 border-b border-neutral-800">
                <h3 className="text-sm font-semibold mb-3">Members</h3>
                <div className="space-y-2">
                  {activeRoom.members?.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-neutral-800 rounded-lg">
                      <img src={m.avatarUrl || `https://i.pravatar.cc/40?img=${m.id}`} alt={`${m.name || m.username} avatar`} className="w-8 h-8 rounded-full" />
                      <div className="text-sm">
                        <div className="font-medium">{m.name || m.username}</div>
                        <div className="text-xs text-neutral-400">@{m.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 space-y-3">
              <button className="w-full bg-neutral-800 py-3 rounded-xl hover:bg-neutral-700">
                View Media
              </button>
              <button className="w-full bg-neutral-800 py-3 rounded-xl hover:bg-neutral-700">
                Search in Chat
              </button>
              <button className="w-full bg-neutral-800 py-3 rounded-xl hover:bg-neutral-700">
                Mute Notifications
              </button>
            </div>

            <div className="p-6 space-y-3 border-t border-neutral-800">
              {!activeRoom.isGroup && (
                <button 
                  onClick={blockContact}
                  className="w-full text-red-400 bg-neutral-800 py-3 rounded-xl hover:bg-neutral-700"
                >
                  Block Contact
                </button>
              )}
              <button 
                onClick={deleteChat}
                className="w-full text-red-400 bg-neutral-800 py-3 rounded-xl hover:bg-neutral-700"
              >
                Delete Chat
              </button>
            </div>
          </>
        )}
      </div>


      {/* CREATE ROOM MODAL */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Room</h2>
            <form onSubmit={createRoom}>
              <input
                type="text"
                placeholder="Room name"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateRoom(false); setNewRoomName(""); }}
                  className="flex-1 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* NEW CHAT MODAL */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">New Chat</h2>
            
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchUsers()}
                className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none pl-10"
              />
              <Search className="absolute left-3 top-3.5 text-neutral-500" size={18} />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {users.map(u => (
                <div 
                  key={u.id} 
                  className="flex items-center gap-3 p-3 hover:bg-neutral-800 rounded-lg cursor-pointer"
                  onClick={() => createDirectChat(u.id)}
                >
                  <img src={u.avatarUrl || `https://i.pravatar.cc/40?img=${u.id}`} alt={`${u.name || u.username} avatar`} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="font-medium">{u.name || u.username}</div>
                    <div className="text-xs text-neutral-400">@{u.username}</div>
                  </div>
                </div>
              ))}
              
              {search && users.length === 0 && (
                <div className="text-center text-neutral-500 py-4">
                  No users found
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowNewChat(false); setSearch(""); setUsers([]); }}
              className="w-full mt-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Settings</h2>
              <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-neutral-800 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <img 
                src={editAvatar || user?.avatarUrl || `https://i.pravatar.cc/100?img=${user?.id}`} 
                alt="Profile avatar preview"
                className="w-20 h-20 rounded-full mb-3" 
              />
              <input
                type="text"
                placeholder="Avatar URL"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={user?.name || "Your name"}
                  className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder={user?.bio || "Tell us about yourself"}
                  className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-emerald-500 outline-none h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">Status</label>
                <div className="flex gap-2 mt-2">
                  {['online', 'idle', 'dnd'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setUserStatus(s)}
                      className={`flex-1 py-2 rounded-lg text-sm capitalize ${
                        userStatus === s 
                          ? "bg-emerald-600 text-white" 
                          : "bg-neutral-800 hover:bg-neutral-700"
                      }`}
                    >
                      {s === 'dnd' ? 'Do Not Disturb' : s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={saveProfile}
              className="w-full mt-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}


      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              {settingsTab ? (
                <>
                  <button onClick={() => setSettingsTab(null)} className="p-2 hover:bg-neutral-800 rounded-lg">
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-xl font-semibold flex-1 text-center">
                    {settingsTab === 'chats' && 'Chat Settings'}
                    {settingsTab === 'notifications' && 'Notifications'}
                    {settingsTab === 'privacy' && 'Privacy'}
                    {settingsTab === 'help' && 'Help & Support'}
                  </h2>
                  <div className="w-9" />
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-neutral-800 rounded-lg">
                    <X size={20} />
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!settingsTab ? (
                // Main Settings Menu
                <div className="space-y-3">
                  <button 
                    onClick={() => setSettingsTab('chats')}
                    className="w-full flex items-center gap-4 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                      <MessageCircle size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Chats</div>
                      <div className="text-xs text-neutral-400">Theme, wallpaper, chat history</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setSettingsTab('notifications')}
                    className="w-full flex items-center gap-4 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <Bell size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Notifications</div>
                      <div className="text-xs text-neutral-400">Message, group, call alerts</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setSettingsTab('privacy')}
                    className="w-full flex items-center gap-4 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                      <Lock size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Privacy</div>
                      <div className="text-xs text-neutral-400">Blocked contacts, last seen</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setSettingsTab('help')}
                    className="w-full flex items-center gap-4 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700"
                  >
                    <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center">
                      <HelpCircle size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Help</div>
                      <div className="text-xs text-neutral-400">FAQ, contact us</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setShowSettings(false); logout(); }}
                    className="w-full flex items-center gap-4 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 text-red-400"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                      <LogOut size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Log Out</div>
                      <div className="text-xs text-neutral-400">Sign out of your account</div>
                    </div>
                  </button>
                </div>
              ) : settingsTab === 'chats' ? (
                // Chat Settings
                <div className="space-y-4">
                  <div className="bg-neutral-800 rounded-xl p-4">
                    <h3 className="font-medium mb-3">Theme</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => setTheme('light')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm ${theme === 'light' ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setTheme('system')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm ${theme === 'system' ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                      >
                        System
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-800 rounded-xl p-4">
                    <h3 className="font-medium mb-3">Chat Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Enter is send</span>
                        <button className="w-11 h-6 bg-emerald-600 rounded-full relative">
                          <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Send typing indicator</span>
                        <button className="w-11 h-6 bg-emerald-600 rounded-full relative">
                          <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : settingsTab === 'notifications' ? (
                // Notifications Settings
                <div className="space-y-4">
                  <div className="bg-neutral-800 rounded-xl p-4">
                    <h3 className="font-medium mb-3">Message Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Message alerts</span>
                        <button 
                          onClick={() => setMessageNotifications(!messageNotifications)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${messageNotifications ? 'bg-emerald-600' : 'bg-neutral-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${messageNotifications ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Group notifications</span>
                        <button 
                          onClick={() => setGroupNotifications(!groupNotifications)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${groupNotifications ? 'bg-emerald-600' : 'bg-neutral-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${groupNotifications ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Call notifications</span>
                        <button 
                          onClick={() => setCallNotifications(!callNotifications)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${callNotifications ? 'bg-emerald-600' : 'bg-neutral-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${callNotifications ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-800 rounded-xl p-4">
                    <h3 className="font-medium mb-3">Sound</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Notification sound</span>
                      <button className="text-emerald-500 text-sm">Default ▼</button>
                    </div>
                  </div>
                </div>
              ) : settingsTab === 'privacy' ? (
                // Privacy Settings
                <div className="space-y-4">
                  <div className="bg-neutral-800 rounded-xl p-4">
                    <h3 className="font-medium mb-3">Privacy</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Last seen</span>
                        <button 
                          onClick={() => setShowLastSeen(!showLastSeen)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${showLastSeen ? 'bg-emerald-600' : 'bg-neutral-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showLastSeen ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Read receipts</span>
                        <button 
                          onClick={() => setReadReceipts(!readReceipts)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${readReceipts ? 'bg-emerald-600' : 'bg-neutral-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${readReceipts ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-neutral-800 rounded-xl p-4 text-left hover:bg-neutral-700">
                    <div className="font-medium text-red-400">Blocked Contacts</div>
                    <div className="text-xs text-neutral-400">Manage blocked users</div>
                  </button>

                  <button className="w-full bg-neutral-800 rounded-xl p-4 text-left hover:bg-neutral-700">
                    <div className="font-medium">Two-Step Verification</div>
                    <div className="text-xs text-neutral-400">Add extra security</div>
                  </button>
                </div>
              ) : settingsTab === 'help' ? (
                // Help & Support
                <div className="space-y-4">
                  <button className="w-full bg-neutral-800 rounded-xl p-4 text-left hover:bg-neutral-700">
                    <div className="font-medium">FAQ</div>
                    <div className="text-xs text-neutral-400">Frequently asked questions</div>
                  </button>

                  <button className="w-full bg-neutral-800 rounded-xl p-4 text-left hover:bg-neutral-700">
                    <div className="font-medium">Contact Us</div>
                    <div className="text-xs text-neutral-400">Get help with issues</div>
                  </button>

                  <button className="w-full bg-neutral-800 rounded-xl p-4 text-left hover:bg-neutral-700">
                    <div className="font-medium">Privacy Policy</div>
                    <div className="text-xs text-neutral-400">Read our privacy policy</div>
                  </button>

                  <button className="w-full bg-neutral-800 rounded-xl p-4 text-left hover:bg-neutral-700">
                    <div className="font-medium">Terms of Service</div>
                    <div className="text-xs text-neutral-400">Read our terms</div>
                  </button>

                  <div className="bg-neutral-800 rounded-xl p-4 text-center">
                    <div className="text-sm text-neutral-400">Project Relay v1.0.0</div>
                    <div className="text-xs text-neutral-500 mt-1">Made with ❤️ by Team Relay</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
