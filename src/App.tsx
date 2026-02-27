import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── URLs ─────────────────────────────────────────────────────────────────────
const POSTS_URL = "https://functions.poehali.dev/61ea9ccb-a1d3-4d0a-bfe7-094c6cbccf7d";
const SEARCH_URL = "https://functions.poehali.dev/cf6e129a-475a-41e4-9976-c8dbf30dde27";
const PROFILE_URL = "https://functions.poehali.dev/4f1e8cca-402e-4a83-9934-160d538cc223";
const AUTH_URL = "https://functions.poehali.dev/0df01f22-7e67-4557-a23b-470296289da7";
const MESSAGES_URL = "https://functions.poehali.dev/17e322be-2d55-4586-9fbc-77f380c2673e";

// ─── API helpers ──────────────────────────────────────────────────────────────
async function api(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const raw = await res.json();
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}
async function apiGet(url: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${url}?${qs}`);
  const raw = await res.json();
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}
async function fileToBase64(file: File): Promise<string> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.readAsDataURL(file);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "feed" | "profile" | "messages" | "search" | "settings";

interface FullUser { id: number; name: string; handle: string; email: string; avatar: string; bio: string; banner: string; }
interface SearchUser { id: number; name: string; handle: string; avatar: string; bio: string; }
interface ApiComment { id: number; text: string; likes: number; liked: boolean; user_id: number; author: string; handle: string; avatar: string; }
interface ApiPost { id: number; text: string; likes: number; time: string; user_id: number; author: string; handle: string; avatar: string; initials: string; liked: boolean; comments: ApiComment[]; media_url?: string; media_type?: string; }
interface ChatItem { chat_id?: number; group_id?: number; partner_id?: number; partner_name?: string; partner_handle?: string; partner_avatar?: string; name?: string; avatar?: string; last_msg: string; last_time: string; unread: number; is_mine?: boolean; is_group?: boolean; member_count?: number; }
interface ChatMsg { id: number; from_me: boolean; sender_id?: number; sender_name?: string; sender_avatar?: string; text: string; type: string; file_url?: string; file_name?: string; duration?: number; time: string; is_read?: boolean; }
interface Notification { id: number; type: string; message: string; is_read: boolean; time: string; from_id?: number; from_name?: string; from_handle?: string; from_avatar?: string; post_id?: number; }

// ─── Wallpapers ───────────────────────────────────────────────────────────────
const WALLPAPERS = [
  { id: "none", label: "Нет", style: {} },
  { id: "midnight", label: "Ночь", style: { background: "linear-gradient(160deg,#0d0d1a 0%,#111130 100%)" } },
  { id: "gold", label: "Золото", style: { background: "linear-gradient(160deg,#1a1200 0%,#2a1f00 100%)" } },
  { id: "forest", label: "Лес", style: { background: "linear-gradient(160deg,#0a1a0e 0%,#0f2515 100%)" } },
  { id: "rose", label: "Закат", style: { background: "linear-gradient(160deg,#1a0a0f 0%,#2a0f18 100%)" } },
  { id: "ocean", label: "Океан", style: { background: "linear-gradient(160deg,#050e1a 0%,#0a1a2a 100%)" } },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Av({ src, name, size = "md", online }: { src?: string; name: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  const sz = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-xl" }[size];
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center font-semibold text-black overflow-hidden`}>
        {src ? <img src={src} className="w-full h-full object-cover" alt="" /> : initials}
      </div>
      {online !== undefined && (
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-green-400" : "bg-muted-foreground/40"}`} />
      )}
    </div>
  );
}

// ─── VoiceRecorder ────────────────────────────────────────────────────────────
function VoiceRecorder({ onSend }: { onSend: (dur: number, blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.start();
    mrRef.current = mr;
    setRecording(true);
    setSecs(0);
    timerRef.current = window.setInterval(() => setSecs(s => s + 1), 1000);
  };

  const stop = () => {
    if (!mrRef.current) return;
    const mr = mrRef.current;
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onSend(secs, blob);
      mr.stream.getTracks().forEach(t => t.stop());
    };
    mr.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const cancel = () => {
    if (!mrRef.current) return;
    mrRef.current.stream.getTracks().forEach(t => t.stop());
    mrRef.current = null;
    clearInterval(timerRef.current);
    setRecording(false);
    setSecs(0);
  };

  if (recording) return (
    <div className="flex items-center gap-2">
      <button onClick={cancel} className="p-2 text-muted-foreground hover:text-destructive"><Icon name="X" size={16} /></button>
      <span className="text-xs text-destructive font-mono">{String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}</span>
      <button onClick={stop} className="p-2 bg-destructive rounded-xl text-white"><Icon name="Square" size={14} /></button>
    </div>
  );
  return <button onClick={start} className="p-2 text-muted-foreground hover:text-primary transition-colors"><Icon name="Mic" size={18} /></button>;
}

// ─── VoicePlayer ──────────────────────────────────────────────────────────────
function VoicePlayer({ url, duration }: { url?: string; duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        const a = audioRef.current!;
        setProgress(a.duration ? a.currentTime / a.duration : 0);
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (s?: number) => s ? `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : "0:00";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon name={playing ? "Pause" : "Play"} size={14} className="text-primary" />
      </button>
      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="text-[10px] opacity-70">{fmt(duration)}</span>
    </div>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────
function ChatBubble({ m }: { m: ChatMsg }) {
  const base = `max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words ${m.from_me ? "bg-primary text-primary-foreground rounded-br-sm ml-auto" : "bg-muted/70 text-foreground rounded-bl-sm"}`;
  const time = <span className={`text-[10px] block mt-0.5 ${m.from_me ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>{m.time}</span>;
  if (m.type === "voice") return (
    <div className={base}><VoicePlayer url={m.file_url} duration={m.duration} />{time}</div>
  );
  if (m.type === "image" && m.file_url) return (
    <div className={base}><img src={m.file_url} alt="img" className="rounded-xl max-h-48 w-auto" />{time}</div>
  );
  if (m.type === "file") return (
    <div className={base}>
      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <Icon name="File" size={16} /><span className="underline text-xs">{m.file_name || "Файл"}</span>
      </a>{time}
    </div>
  );
  return <div className={base}><p>{m.text}</p>{time}</div>;
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
function PostCard({
  post, currentUserId, onLike, onComment, onDelete, onHashtag, onProfile,
}: {
  post: ApiPost; currentUserId: number;
  onLike: (id: number) => void;
  onComment: (id: number, text: string) => void;
  onDelete?: (id: number) => void;
  onHashtag: (tag: string) => void;
  onProfile: (uid: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const renderText = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((p, i) =>
      p.startsWith("#") ? <button key={i} onClick={() => onHashtag(p.slice(1))} className="text-primary hover:underline">{p}</button> : <span key={i}>{p}</span>
    );
  };

  return (
    <div
      className="post-card rounded-2xl p-4 animate-fade-in"
      onContextMenu={e => { if (post.user_id === currentUserId) { e.preventDefault(); setShowMenu(v => !v); } }}
    >
      {showMenu && post.user_id === currentUserId && (
        <div className="flex gap-2 mb-3 animate-fade-in">
          <button onClick={() => { onDelete?.(post.id); setShowMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/15 text-destructive text-xs hover:bg-destructive/25 transition-colors">
            <Icon name="Trash2" size={14} /> Удалить пост
          </button>
          <button onClick={() => setShowMenu(false)} className="px-3 py-1.5 rounded-xl bg-muted/50 text-muted-foreground text-xs">Отмена</button>
        </div>
      )}
      <div className="flex gap-3 mb-3">
        <button onClick={() => onProfile(post.user_id)}><Av src={post.avatar} name={post.author} /></button>
        <div className="flex-1 min-w-0">
          <button onClick={() => onProfile(post.user_id)} className="font-semibold leading-tight hover:underline">{post.author}</button>
          <div className="text-xs text-muted-foreground">{post.handle} · {post.time}</div>
        </div>
        {post.user_id === currentUserId && (
          <button onClick={() => setShowMenu(v => !v)} className="text-muted-foreground hover:text-foreground p-1">
            <Icon name="MoreHorizontal" size={18} />
          </button>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/90 mb-3">{renderText(post.text)}</p>
      {post.media_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
          {post.media_type === "image"
            ? <img src={post.media_url} alt="media" className="w-full max-h-80 object-cover" />
            : <video src={post.media_url} controls className="w-full max-h-80" />
          }
        </div>
      )}
      <div className="flex items-center gap-4 pt-3 border-t border-border">
        <button onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition-all ${post.liked ? "like-active" : "text-muted-foreground hover:text-rose-400"}`}>
          <Icon name="Heart" size={18} className={post.liked ? "fill-current" : ""} />
          <span className="font-medium">{post.likes}</span>
        </button>
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <Icon name="MessageCircle" size={18} />
          <span className="font-medium">{post.comments.length}</span>
        </button>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto">
          <Icon name="Share2" size={18} />
        </button>
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {post.comments.map(c => (
            <div key={c.id} className="flex gap-2.5 p-3 rounded-xl bg-muted/40">
              <button onClick={() => onProfile(c.user_id)}><Av src={c.avatar} name={c.author} size="sm" /></button>
              <div className="flex-1 min-w-0">
                <button onClick={() => onProfile(c.user_id)} className="text-sm font-semibold hover:underline">{c.author}</button>
                <span className="text-xs text-muted-foreground ml-2">{c.handle}</span>
                <p className="text-sm text-foreground/85 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
              placeholder="Написать комментарий..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) { onComment(post.id, commentText); setCommentText(""); } }}
            />
            <button onClick={() => { if (commentText.trim()) { onComment(post.id, commentText); setCommentText(""); } }}
              className="px-3 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              <Icon name="Send" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────
function FeedPage({ user, onProfile, onHashtag }: { user: FullUser; onProfile: (uid: number) => void; onHashtag: (tag: string) => void }) {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await apiGet(POSTS_URL, { user_id: user.id, action: "feed" });
      setPosts(data.posts || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const publish = async () => {
    if (!newPost.trim()) return;
    setPublishing(true);
    try {
      const body: Record<string, unknown> = { action: "create", user_id: user.id, text: newPost };
      if (mediaFile) {
        body.media_data = await fileToBase64(mediaFile);
        body.media_type = mediaFile.type;
      }
      const data = await api(POSTS_URL, body);
      if (data.id) {
        setPosts(ps => [{
          id: data.id, text: newPost, likes: 0, time: "только что",
          user_id: user.id, author: user.name, handle: user.handle,
          avatar: user.avatar || "", initials: user.name.slice(0, 2).toUpperCase(),
          liked: false, comments: [],
          media_url: data.media_url || undefined,
          media_type: mediaFile ? (mediaFile.type.startsWith("image") ? "image" : "video") : undefined,
        }, ...ps]);
        setNewPost("");
        setMediaFile(null);
      }
    } finally { setPublishing(false); }
  };

  const toggleLike = (postId: number) => {
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    api(POSTS_URL, { action: "like", user_id: user.id, post_id: postId });
  };

  const addComment = (postId: number, text: string) => {
    api(POSTS_URL, { action: "comment", user_id: user.id, post_id: postId, text }).then(data => {
      if (data.comment) setPosts(ps => ps.map(p => p.id === postId ? { ...p, comments: [...p.comments, data.comment] } : p));
    });
  };

  const deletePost = (postId: number) => {
    api(POSTS_URL, { action: "delete", user_id: user.id, post_id: postId });
    setPosts(ps => ps.filter(p => p.id !== postId));
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      <div className="post-card rounded-2xl p-4 animate-fade-in">
        <div className="flex gap-3">
          <Av src={user.avatar} name={user.name} />
          <div className="flex-1">
            <textarea
              className="w-full bg-transparent text-foreground placeholder-muted-foreground resize-none outline-none text-[15px] leading-relaxed min-h-[80px]"
              placeholder="Что происходит в твоей жизни?"
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
            />
            {mediaFile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Icon name="Paperclip" size={14} />
                <span className="truncate max-w-[200px]">{mediaFile.name}</span>
                <button onClick={() => setMediaFile(null)} className="text-destructive hover:opacity-80"><Icon name="X" size={12} /></button>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <input ref={mediaRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => setMediaFile(e.target.files?.[0] || null)} />
              <div className="flex gap-1 text-muted-foreground">
                <button onClick={() => mediaRef.current?.click()} className="p-1.5 hover:text-primary transition-colors rounded-lg hover:bg-accent/20"><Icon name="Image" size={18} /></button>
                <button className="p-1.5 hover:text-primary transition-colors rounded-lg hover:bg-accent/20"><Icon name="Smile" size={18} /></button>
              </div>
              <button onClick={publish} disabled={!newPost.trim() || publishing}
                className="px-5 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
                {publishing ? "Публикую..." : "Опубликовать"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}
      {!loading && posts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground"><Icon name="Feather" size={40} className="mx-auto mb-3 opacity-30" /><p>Пока нет постов. Будь первым!</p></div>
      )}
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={user.id}
          onLike={toggleLike} onComment={addComment} onDelete={deletePost}
          onHashtag={onHashtag} onProfile={onProfile} />
      ))}
    </div>
  );
}

// ─── HashtagPage ──────────────────────────────────────────────────────────────
function HashtagPage({ tag, user, onBack, onProfile }: { tag: string; user: FullUser; onBack: () => void; onProfile: (uid: number) => void }) {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGet(POSTS_URL, { action: "hashtag", tag, user_id: user.id }).then(d => { setPosts(d.posts || []); setLoading(false); });
  }, [tag]);

  const toggleLike = (postId: number) => {
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    api(POSTS_URL, { action: "like", user_id: user.id, post_id: postId });
  };

  return (
    <div className="max-w-xl mx-auto pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm">
        <Icon name="ChevronLeft" size={18} /> Назад
      </button>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-bold gradient-text">#{tag}</span>
      </div>
      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={user.id}
          onLike={toggleLike} onComment={() => {}} onHashtag={() => {}} onProfile={onProfile} />
      ))}
      {!loading && posts.length === 0 && <p className="text-center text-muted-foreground py-8">Постов с #{tag} пока нет</p>}
    </div>
  );
}

// ─── UserProfilePage (other users) ───────────────────────────────────────────
function UserProfilePage({ user, currentUser, onBack, onMessage }: { user: SearchUser; currentUser: FullUser; onBack: () => void; onMessage: (u: SearchUser) => void }) {
  const [followed, setFollowed] = useState(false);
  const [counts, setCounts] = useState({ following_count: 0, followers_count: 0, posts_count: 0 });
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    apiGet(MESSAGES_URL, { action: "counts", user_id: currentUser.id, target_id: user.id }).then(d => {
      setCounts(d);
      setFollowed(d.is_following);
    });
    apiGet(POSTS_URL, { action: "user_posts", user_id: currentUser.id, target_id: user.id }).then(d => {
      setPosts(d.posts || []);
      setLoadingPosts(false);
    });
  }, [user.id]);

  const toggleFollow = async () => {
    const data = await api(MESSAGES_URL, { action: "toggle_follow", follower_id: currentUser.id, following_id: user.id });
    setFollowed(data.followed);
    setCounts(c => ({ ...c, followers_count: data.followers_count }));
  };

  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm">
        <Icon name="ChevronLeft" size={18} /> Назад
      </button>
      <div className="h-32 rounded-2xl mb-0 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0d0d0d 0%,#1a1500 60%,#0d0d0d 100%)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%,rgba(212,160,23,0.18) 0%,transparent 55%)" }} />
      </div>
      <div className="px-4 -mt-8 mb-6">
        <div className="flex justify-between items-end mb-4">
          <Av src={user.avatar} name={user.name} size="xl" />
          <div className="flex gap-2">
            <button onClick={() => onMessage(user)}
              className="px-4 py-2 rounded-xl bg-muted/80 text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-1.5">
              <Icon name="MessageCircle" size={15} /> Написать
            </button>
            <button onClick={toggleFollow}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${followed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
              {followed ? "Отписаться" : "Подписаться"}
            </button>
          </div>
        </div>
        <div className="font-bold text-xl">{user.name}</div>
        <div className="text-muted-foreground text-sm mb-2">{user.handle}</div>
        {user.bio && <p className="text-sm text-foreground/80 mb-4">{user.bio}</p>}
        <div className="flex gap-6 text-sm mt-3">
          <div><span className="font-bold">{counts.posts_count}</span> <span className="text-muted-foreground">постов</span></div>
          <div><span className="font-bold">{counts.followers_count}</span> <span className="text-muted-foreground">подписчиков</span></div>
          <div><span className="font-bold">{counts.following_count}</span> <span className="text-muted-foreground">подписок</span></div>
        </div>
      </div>
      {loadingPosts
        ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        : posts.length === 0
          ? <p className="text-center text-muted-foreground py-8 text-sm">Публикаций пока нет</p>
          : <div className="grid grid-cols-3 gap-1 px-1">
            {posts.map(p => (
              <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:opacity-80">
                {p.media_url && p.media_type === "image"
                  ? <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                  : <div className="p-2 text-[10px] text-muted-foreground/60 text-center line-clamp-4">{p.text}</div>}
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── ProfilePage (own) ────────────────────────────────────────────────────────
function ProfilePage({ user, onUserUpdate, onViewPost }: { user: FullUser; onUserUpdate: (u: FullUser) => void; onViewPost?: (post: ApiPost) => void }) {
  const [tab, setTab] = useState<"posts" | "liked" | "following" | "followers">("posts");
  const [editSection, setEditSection] = useState<"none" | "info" | "password" | "email">("none");
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle.replace("@", ""));
  const [bio, setBio] = useState(user.bio);
  const [email, setEmail] = useState(user.email);
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [newPw2, setNewPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<ApiPost[]>([]);
  const [following, setFollowing] = useState<SearchUser[]>([]);
  const [followers, setFollowers] = useState<SearchUser[]>([]);
  const [counts, setCounts] = useState({ posts_count: 0, followers_count: 0, following_count: 0 });
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const inputCls = "w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors";
  const btnPrimary = "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50";
  const btnMuted = "px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm hover:bg-muted/80";

  useEffect(() => {
    apiGet(MESSAGES_URL, { action: "counts", user_id: user.id, target_id: user.id }).then(d => setCounts(d));
    apiGet(POSTS_URL, { action: "user_posts", user_id: user.id, target_id: user.id }).then(d => setPosts(d.posts || []));
  }, [user.id]);

  useEffect(() => {
    if (tab === "liked" && likedPosts.length === 0)
      apiGet(MESSAGES_URL, { action: "liked_posts", user_id: user.id }).then(d => setLikedPosts(d.posts || []));
    if (tab === "following" && following.length === 0)
      apiGet(MESSAGES_URL, { action: "following", user_id: user.id }).then(d => setFollowing(d.users || []));
    if (tab === "followers" && followers.length === 0)
      apiGet(MESSAGES_URL, { action: "followers", user_id: user.id }).then(d => setFollowers(d.users || []));
  }, [tab]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const b64 = await fileToBase64(file);
    const data = await api(PROFILE_URL, { action: "update", user_id: user.id, avatar: `data:${file.type};base64,${b64}` });
    if (data.user) onUserUpdate({ ...user, ...data.user });
  };

  const handleBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const b64 = await fileToBase64(file);
    const data = await api(PROFILE_URL, { action: "update", user_id: user.id, banner: `data:${file.type};base64,${b64}` });
    if (data.user) onUserUpdate({ ...user, ...data.user });
  };

  const saveInfo = async () => {
    setSaving(true); setErr("");
    const data = await api(PROFILE_URL, { action: "update", user_id: user.id, name, handle, bio });
    if (data.error) { setErr(data.error); } else if (data.user) { onUserUpdate({ ...user, ...data.user }); setEditSection("none"); }
    setSaving(false);
  };

  const savePassword = async () => {
    if (newPw !== newPw2) { setErr("Пароли не совпадают"); return; }
    setSaving(true); setErr("");
    const data = await api(PROFILE_URL, { action: "change_password", user_id: user.id, old_password: oldPw, new_password: newPw });
    if (data.error) setErr(data.error); else { setEditSection("none"); setOldPw(""); setNewPw(""); setNewPw2(""); }
    setSaving(false);
  };

  const saveEmail = async () => {
    setSaving(true); setErr("");
    const data = await api(PROFILE_URL, { action: "update", user_id: user.id, email });
    if (data.error) setErr(data.error); else if (data.user) { onUserUpdate({ ...user, ...data.user }); setEditSection("none"); }
    setSaving(false);
  };

  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      {/* Banner */}
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
      <div className="h-32 rounded-2xl mb-0 relative overflow-hidden cursor-pointer group" onClick={() => bannerRef.current?.click()}>
        {user.banner
          ? <img src={user.banner} className="w-full h-full object-cover" alt="banner" />
          : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#0d0d0d 0%,#1a1500 60%,#0d0d0d 100%)" }}>
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%,rgba(212,160,23,0.22) 0%,transparent 55%)" }} />
          </div>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl px-3 py-1.5 flex items-center gap-2 text-white text-xs">
            <Icon name="Camera" size={14} /> Сменить баннер
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 mb-6">
        <div className="flex justify-between items-end mb-4">
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <div className="relative cursor-pointer group" onClick={() => avatarRef.current?.click()}>
            <div className="w-16 h-16 rounded-2xl border-4 border-background overflow-hidden flex items-center justify-center bg-gradient-to-br from-yellow-600 to-amber-400 text-xl font-bold text-black">
              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" /> : initials}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
              <Icon name="Camera" size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <button onClick={() => { setEditSection(editSection === "info" ? "none" : "info"); setErr(""); }}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${editSection === "info" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            {editSection === "info" ? "Отмена" : "Редактировать"}
          </button>
        </div>

        {editSection === "none" && (
          <>
            <div className="font-bold text-xl">{user.name}</div>
            <div className="text-muted-foreground text-sm mb-2">{user.handle}</div>
            {user.bio && <p className="text-sm text-foreground/80 mb-4">{user.bio}</p>}
            <div className="flex gap-6 text-sm mt-3">
              <button onClick={() => setTab("posts")} className="hover:text-primary transition-colors">
                <span className="font-bold">{counts.posts_count}</span> <span className="text-muted-foreground">постов</span>
              </button>
              <button onClick={() => setTab("followers")} className="hover:text-primary transition-colors">
                <span className="font-bold">{counts.followers_count}</span> <span className="text-muted-foreground">подписчиков</span>
              </button>
              <button onClick={() => setTab("following")} className="hover:text-primary transition-colors">
                <span className="font-bold">{counts.following_count}</span> <span className="text-muted-foreground">подписок</span>
              </button>
            </div>
          </>
        )}

        {editSection === "info" && (
          <div className="space-y-3 mt-2 animate-fade-in">
            <div><label className="text-xs text-muted-foreground mb-1 block">Имя</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Никнейм</label>
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input className={inputCls + " pl-7"} value={handle} onChange={e => setHandle(e.target.value)} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Биография</label>
              <textarea className={inputCls + " resize-none"} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Расскажи о себе..." /></div>
            {err && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{err}</p>}
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={saveInfo} disabled={saving}>{saving ? "Сохраняю..." : "Сохранить"}</button>
              <button className={btnMuted} onClick={() => { setEditSection("none"); setErr(""); }}>Отмена</button>
            </div>
            <div className="gold-divider my-1" />
            <button onClick={() => { setEditSection("password"); setErr(""); }} className="text-sm text-primary hover:underline flex items-center gap-1.5">
              <Icon name="Lock" size={14} /> Сменить пароль
            </button>
            <button onClick={() => { setEditSection("email"); setErr(""); }} className="text-sm text-primary hover:underline flex items-center gap-1.5">
              <Icon name="Mail" size={14} /> Сменить email
            </button>
          </div>
        )}

        {editSection === "password" && (
          <div className="space-y-3 mt-2 animate-fade-in">
            <div><label className="text-xs text-muted-foreground mb-1 block">Текущий пароль</label><input type="password" className={inputCls} value={oldPw} onChange={e => setOldPw(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Новый пароль</label><input type="password" className={inputCls} value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Повтори новый</label><input type="password" className={inputCls} value={newPw2} onChange={e => setNewPw2(e.target.value)} /></div>
            {err && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{err}</p>}
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={savePassword} disabled={saving}>{saving ? "Сохраняю..." : "Сменить пароль"}</button>
              <button className={btnMuted} onClick={() => { setEditSection("none"); setErr(""); }}>Отмена</button>
            </div>
          </div>
        )}

        {editSection === "email" && (
          <div className="space-y-3 mt-2 animate-fade-in">
            <div><label className="text-xs text-muted-foreground mb-1 block">Новый email</label><input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} /></div>
            {err && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{err}</p>}
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={saveEmail} disabled={saving}>{saving ? "Сохраняю..." : "Сохранить email"}</button>
              <button className={btnMuted} onClick={() => { setEditSection("none"); setErr(""); }}>Отмена</button>
            </div>
          </div>
        )}
      </div>

      {editSection === "none" && (
        <>
          <div className="flex border-b border-border mb-4 px-2 overflow-x-auto gap-1">
            {(["posts", "liked", "following", "followers"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t === "posts" ? "Публикации" : t === "liked" ? "Понравилось" : t === "following" ? "Подписки" : "Подписчики"}
              </button>
            ))}
          </div>

          {tab === "posts" && (
            posts.length === 0
              ? <p className="text-center text-muted-foreground py-8 text-sm">Публикаций пока нет</p>
              : <div className="grid grid-cols-3 gap-1 px-1">
                {posts.map(p => (
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:opacity-80">
                    {p.media_url && p.media_type === "image"
                      ? <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                      : <div className="p-2 text-[10px] text-muted-foreground/60 text-center line-clamp-4">{p.text}</div>}
                  </div>
                ))}
              </div>
          )}

          {tab === "liked" && (
            likedPosts.length === 0
              ? <p className="text-center text-muted-foreground py-8 text-sm">Понравившихся постов пока нет</p>
              : <div className="grid grid-cols-3 gap-1 px-1">
                {likedPosts.map(p => (
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:opacity-80">
                    {p.media_url && p.media_type === "image"
                      ? <img src={p.media_url} className="w-full h-full object-cover" alt="" />
                      : <div className="p-2 text-[10px] text-muted-foreground/60 text-center line-clamp-4">{p.text}</div>}
                  </div>
                ))}
              </div>
          )}

          {tab === "following" && (
            <div className="space-y-2 px-1">
              {following.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Вы ни на кого не подписаны</p>}
              {following.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 post-card rounded-2xl">
                  <Av src={u.avatar} name={u.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.handle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "followers" && (
            <div className="space-y-2 px-1">
              {followers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Подписчиков пока нет</p>}
              {followers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 post-card rounded-2xl">
                  <Av src={u.avatar} name={u.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.handle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── WebRTC Call ──────────────────────────────────────────────────────────────
function CallScreen({ contact, onEnd }: { contact: { name: string; avatar: string }; onEnd: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let t: number;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
      streamRef.current = stream;
      setConnected(true);
      t = window.setInterval(() => setSeconds(s => s + 1), 1000);
    }).catch(() => {
      setConnected(true);
      t = window.setInterval(() => setSeconds(s => s + 1), 1000);
    });
    return () => { clearInterval(t); streamRef.current?.getTracks().forEach(tr => tr.stop()); pcRef.current?.close(); };
  }, []);

  useEffect(() => {
    if (streamRef.current) streamRef.current.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, [muted]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between py-20 px-8"
      style={{ background: "radial-gradient(ellipse at 40% 30%,#1a1200 0%,#050502 100%)" }}>
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-4xl font-bold text-black mb-2 glow-gold overflow-hidden">
          {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" alt="" /> : contact.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
        </div>
        <h2 className="text-2xl font-bold">{contact.name}</h2>
        <p className="text-muted-foreground text-sm">{connected ? fmt(seconds) : "Соединение..."}</p>
      </div>
      <div className="flex gap-6">
        <button onClick={() => setMuted(m => !m)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? "bg-destructive/20 text-destructive" : "bg-muted/30 text-foreground hover:bg-muted/50"}`}>
          <Icon name={muted ? "MicOff" : "Mic"} size={22} />
        </button>
        <button onClick={onEnd} className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all">
          <Icon name="PhoneOff" size={24} className="text-white" />
        </button>
        <button className="w-14 h-14 rounded-full bg-muted/30 text-foreground hover:bg-muted/50 flex items-center justify-center transition-all">
          <Icon name="Volume2" size={22} />
        </button>
      </div>
      <video ref={localRef} className="hidden" autoPlay muted playsInline />
      <video ref={remoteRef} className="hidden" autoPlay playsInline />
    </div>
  );
}

// ─── MessagesPage ──────────────────────────────────────────────────────────────
function MessagesPage({ user, initialChat, onChatOpened }: { user: FullUser; initialChat?: SearchUser | null; onChatOpened?: () => void }) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [active, setActive] = useState<ChatItem | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [wallpaper, setWallpaper] = useState("none");
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [callContact, setCallContact] = useState<{ name: string; avatar: string } | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ chat: ChatItem; x: number; y: number } | null>(null);
  const [unreadChats, setUnreadChats] = useState<Set<number | string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const wallpaperFileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number>(0);

  const loadChats = useCallback(async () => {
    const data = await apiGet(MESSAGES_URL, { action: "list", user_id: user.id });
    const all: ChatItem[] = [...(data.chats || []), ...(data.groups || [])];
    setChats(all);
    const unread = new Set<number | string>();
    all.forEach(c => { if (c.unread && c.unread > 0) unread.add(c.chat_id ?? `g${c.group_id}`); });
    setUnreadChats(unread);
  }, [user.id]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Open chat from external navigation
  useEffect(() => {
    if (!initialChat) return;
    openDirectChat(initialChat);
    onChatOpened?.();
  }, [initialChat]);

  // Poll for new messages when chat open
  useEffect(() => {
    if (!active) { clearInterval(pollRef.current); return; }
    const doLoad = async () => {
      if (active.chat_id) {
        const data = await apiGet(MESSAGES_URL, { action: "history", chat_id: active.chat_id, user_id: user.id });
        setChatMsgs(data.messages || []);
      } else if (active.group_id) {
        const data = await apiGet(MESSAGES_URL, { action: "group_history", group_id: active.group_id, user_id: user.id });
        setChatMsgs(data.messages || []);
      }
    };
    doLoad();
    pollRef.current = window.setInterval(doLoad, 3000);
    return () => clearInterval(pollRef.current);
  }, [active?.chat_id, active?.group_id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // Load wallpaper when chat changes
  useEffect(() => {
    if (!active) return;
    const key = active.chat_id ? `chat_${active.chat_id}` : `group_${active.group_id}`;
    const saved = localStorage.getItem(`wp_${user.id}_${key}`);
    setWallpaper(saved || "none");
  }, [active?.chat_id, active?.group_id]);

  const openDirectChat = async (partner: SearchUser) => {
    const data = await api(MESSAGES_URL, { action: "get_or_create_chat", user_id: user.id, partner_id: partner.id });
    const chatItem: ChatItem = {
      chat_id: data.chat_id, partner_id: partner.id,
      partner_name: partner.name, partner_handle: partner.handle,
      partner_avatar: partner.avatar || "", last_msg: "", last_time: "", unread: 0,
    };
    setActive(chatItem);
    loadChats();
  };

  const send = async () => {
    if (!input.trim() || !active) return;
    const text = input; setInput("");
    if (active.chat_id) {
      await api(MESSAGES_URL, { action: "send", chat_id: active.chat_id, sender_id: user.id, text, type: "text" });
    } else if (active.group_id) {
      await api(MESSAGES_URL, { action: "send_group", group_id: active.group_id, sender_id: user.id, text, type: "text" });
    }
    // Reload messages
    if (active.chat_id) {
      const data = await apiGet(MESSAGES_URL, { action: "history", chat_id: active.chat_id, user_id: user.id });
      setChatMsgs(data.messages || []);
    } else if (active.group_id) {
      const data = await apiGet(MESSAGES_URL, { action: "group_history", group_id: active.group_id, user_id: user.id });
      setChatMsgs(data.messages || []);
    }
    loadChats();
  };

  const sendVoice = async (dur: number, blob: Blob) => {
    if (!active) return;
    const b64 = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(blob); });
    if (active.chat_id) {
      await api(MESSAGES_URL, { action: "send", chat_id: active.chat_id, sender_id: user.id, text: "", type: "voice", file_data: b64, content_type: "audio/webm", duration: dur });
    } else if (active.group_id) {
      await api(MESSAGES_URL, { action: "send_group", group_id: active.group_id, sender_id: user.id, text: "", type: "voice", file_data: b64, content_type: "audio/webm", duration: dur });
    }
    if (active.chat_id) {
      const data = await apiGet(MESSAGES_URL, { action: "history", chat_id: active.chat_id, user_id: user.id });
      setChatMsgs(data.messages || []);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !active) return;
    const b64 = await fileToBase64(file);
    const isImage = file.type.startsWith("image/");
    if (active.chat_id) {
      await api(MESSAGES_URL, { action: "send", chat_id: active.chat_id, sender_id: user.id, text: "", type: isImage ? "image" : "file", file_data: b64, content_type: file.type, file_name: file.name });
    }
    e.target.value = "";
    if (active.chat_id) {
      const data = await apiGet(MESSAGES_URL, { action: "history", chat_id: active.chat_id, user_id: user.id });
      setChatMsgs(data.messages || []);
    }
  };

  const saveWallpaper = (wp: string) => {
    if (!active) return;
    const key = active.chat_id ? `chat_${active.chat_id}` : `group_${active.group_id}`;
    localStorage.setItem(`wp_${user.id}_${key}`, wp);
    setWallpaper(wp);
    setShowWallpaper(false);
  };

  const handleWallpaperFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    saveWallpaper(`custom:${url}`);
    e.target.value = "";
  };

  const markRead = async (chat: ChatItem) => {
    if (chat.chat_id) await api(MESSAGES_URL, { action: "mark_read", chat_id: chat.chat_id, user_id: user.id });
    setUnreadChats(s => { const n = new Set(s); n.delete(chat.chat_id ?? `g${chat.group_id}`); return n; });
    setChats(cs => cs.map(c => c.chat_id === chat.chat_id ? { ...c, unread: 0 } : c));
    setContextMenu(null);
  };

  const deleteChat = async (chat: ChatItem) => {
    if (chat.chat_id) await api(MESSAGES_URL, { action: "delete_chat", chat_id: chat.chat_id, user_id: user.id });
    setChats(cs => cs.filter(c => c.chat_id !== chat.chat_id));
    setContextMenu(null);
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;
    await api(MESSAGES_URL, { action: "create_group", creator_id: user.id, name: groupName, member_ids: [] });
    setShowGroupForm(false); setGroupName("");
    loadChats();
  };

  const wallpaperStyle: React.CSSProperties = (() => {
    if (wallpaper.startsWith("custom:")) return { backgroundImage: `url(${wallpaper.slice(7)})`, backgroundSize: "cover", backgroundPosition: "center" };
    return WALLPAPERS.find(w => w.id === wallpaper)?.style ?? {};
  })();

  const chatName = active?.partner_name ?? active?.name ?? "";
  const chatAvatar = active?.partner_avatar ?? active?.avatar ?? "";

  if (callContact) return <CallScreen contact={callContact} onEnd={() => setCallContact(null)} />;

  if (active) return (
    <div className="max-w-xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-scale-in">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 glass rounded-2xl mb-3">
        <button onClick={() => { setActive(null); setShowWallpaper(false); loadChats(); }} className="text-muted-foreground hover:text-foreground mr-1">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <Av src={chatAvatar} name={chatName} online={active.is_group ? undefined : true} />
        <div>
          <div className="font-semibold">{chatName}</div>
          <div className="text-xs text-muted-foreground">
            {active.is_group ? `${active.member_count} участников` : "в сети"}
          </div>
        </div>
        <div className="ml-auto flex gap-1 text-muted-foreground">
          {!active.is_group && <>
            <button onClick={() => setCallContact({ name: chatName, avatar: chatAvatar })} className="p-2 hover:text-primary transition-colors rounded-xl hover:bg-muted/40"><Icon name="Phone" size={18} /></button>
            <button onClick={() => setCallContact({ name: chatName, avatar: chatAvatar })} className="p-2 hover:text-primary transition-colors rounded-xl hover:bg-muted/40"><Icon name="Video" size={18} /></button>
          </>}
          <button onClick={() => setShowWallpaper(v => !v)} className={`p-2 transition-colors rounded-xl hover:bg-muted/40 ${showWallpaper ? "text-primary" : "hover:text-primary"}`}>
            <Icon name="Palette" size={18} />
          </button>
        </div>
      </div>

      {/* Wallpaper picker */}
      <input ref={wallpaperFileRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaperFile} />
      {showWallpaper && (
        <div className="glass rounded-2xl p-3 mb-3 animate-fade-in">
          <p className="text-xs text-muted-foreground mb-2 px-1">Обои чата</p>
          <div className="flex gap-2 flex-wrap">
            {WALLPAPERS.map(w => (
              <button key={w.id} onClick={() => saveWallpaper(w.id)} className="flex flex-col items-center gap-1">
                <div className={`w-12 h-12 rounded-xl border-2 transition-all ${wallpaper === w.id ? "border-primary" : "border-border hover:border-primary/50"}`}
                  style={w.id === "none" ? { background: "hsl(var(--card))" } : w.style} />
                <span className="text-[10px] text-muted-foreground">{w.label}</span>
              </button>
            ))}
            <button onClick={() => wallpaperFileRef.current?.click()} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${wallpaper.startsWith("custom:") ? "border-primary" : "border-border hover:border-primary/50"}`}
                style={wallpaper.startsWith("custom:") ? { backgroundImage: `url(${wallpaper.slice(7)})`, backgroundSize: "cover" } : { background: "hsl(var(--muted))" }}>
                {!wallpaper.startsWith("custom:") && <Icon name="ImagePlus" size={20} className="text-muted-foreground" />}
              </div>
              <span className="text-[10px] text-muted-foreground">Своё</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1 px-1 mb-3 rounded-2xl" style={wallpaperStyle}>
        <div className="py-2">
          {chatMsgs.map(m => (
            <div key={m.id} className={`flex mb-3 ${m.from_me ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!m.from_me && active.is_group && m.sender_name && (
                <Av src={m.sender_avatar} name={m.sender_name} size="xs" />
              )}
              <div className="flex flex-col">
                {!m.from_me && active.is_group && m.sender_name && (
                  <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{m.sender_name}</span>
                )}
                <ChatBubble m={m} />
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2 glass rounded-2xl p-2">
        <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <Icon name="Paperclip" size={18} />
        </button>
        <input className="flex-1 bg-transparent outline-none text-sm placeholder-muted-foreground"
          placeholder="Написать сообщение..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()} />
        {input.trim()
          ? <button onClick={send} className="p-2 bg-primary rounded-xl text-primary-foreground hover:opacity-90"><Icon name="Send" size={16} /></button>
          : <VoiceRecorder onSend={sendVoice} />
        }
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto pb-8" onClick={() => setContextMenu(null)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Сообщения</h2>
        <button onClick={() => setShowGroupForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-sm hover:bg-primary/25 transition-colors">
          <Icon name="Users" size={16} /> Группа
        </button>
      </div>

      {showGroupForm && (
        <div className="glass rounded-2xl p-4 mb-4 animate-fade-in space-y-3">
          <p className="text-sm font-semibold">Создать групповой чат</p>
          <input className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/60"
            placeholder="Название группы" value={groupName} onChange={e => setGroupName(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={createGroup} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">Создать</button>
            <button onClick={() => { setShowGroupForm(false); setGroupName(""); }} className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm">Отмена</button>
          </div>
        </div>
      )}

      {chats.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="MessageCircle" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Нет активных чатов. Найди пользователя и напиши ему!</p>
        </div>
      )}

      <div className="space-y-1">
        {chats.map((chat, i) => {
          const key = chat.chat_id ?? `g${chat.group_id}`;
          const hasUnread = unreadChats.has(key) || (chat.unread ?? 0) > 0;
          const name = chat.partner_name ?? chat.name ?? "";
          const avatar = chat.partner_avatar ?? chat.avatar ?? "";
          return (
            <button key={String(key) + i}
              onClick={() => { setActive(chat); if (hasUnread) markRead(chat); }}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ chat, x: e.clientX, y: e.clientY }); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-muted/50 transition-colors text-left animate-fade-in`}>
              <Av src={avatar} name={name} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`font-semibold truncate ${hasUnread ? "text-foreground" : ""}`}>{name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{chat.last_time}</span>
                </div>
                <p className={`text-sm truncate ${hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                  {chat.is_mine ? "Вы: " : ""}{chat.last_msg || "Нет сообщений"}
                </p>
              </div>
              {hasUnread && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {chat.unread || "•"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 bg-card border border-border rounded-2xl shadow-xl py-1 min-w-[180px] animate-fade-in"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 200) }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => markRead(contextMenu.chat)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors text-left">
            <Icon name="CheckCheck" size={16} className="text-primary" /> Пометить прочитанным
          </button>
          <button onClick={() => deleteChat(contextMenu.chat)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive">
            <Icon name="Trash2" size={16} /> Удалить чат
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SearchPage ───────────────────────────────────────────────────────────────
function SearchPage({ user, onViewProfile, onMessage }: { user: FullUser; onViewProfile: (u: SearchUser) => void; onMessage: (u: SearchUser) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    apiGet(POSTS_URL, { action: "trending", user_id: user.id }).then(d => setTrending(d.tags || []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`);
        const raw = await res.json();
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        setUsers(data.users || []);
      } catch { setUsers([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      <div className="relative mb-6">
        <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full bg-muted/60 border border-border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder-muted-foreground transition-all"
          placeholder="Поиск по имени или @никнейму..."
          value={query} onChange={e => setQuery(e.target.value)} autoFocus
        />
        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />}
      </div>

      {!query && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">В тренде</h3>
          <div className="space-y-1">
            {(trending.length > 0 ? trending : [{ tag: "технологии", count: 0 }, { tag: "музыка", count: 0 }, { tag: "путешествия", count: 0 }]).map((item, i) => (
              <div key={item.tag} className={`flex justify-between items-center p-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors animate-fade-in stagger-${i + 1}`} style={{ opacity: 0 }}>
                <div>
                  <p className="font-semibold text-primary">#{item.tag}</p>
                  <p className="text-xs text-muted-foreground">{item.count > 0 ? `${item.count} публикаций` : "Нет публикаций"}</p>
                </div>
                <Icon name="TrendingUp" size={16} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {query ? `Результаты по «${query}»` : "Все пользователи"}
        </h3>
        {users.length === 0 && !loading && (
          <p className="text-muted-foreground text-sm text-center py-8">{query ? "Никого не найдено" : "Пользователей пока нет"}</p>
        )}
        <div className="space-y-2">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 p-3 post-card rounded-2xl animate-fade-in stagger-${Math.min(i + 1, 5)}`} style={{ opacity: 0 }}>
              <button onClick={() => onViewProfile(u)} className="shrink-0"><Av src={u.avatar} name={u.name} /></button>
              <button className="flex-1 min-w-0 text-left" onClick={() => onViewProfile(u)}>
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.handle}{u.bio ? ` · ${u.bio}` : ""}</p>
              </button>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onMessage(u)} className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                  <Icon name="MessageCircle" size={16} />
                </button>
                <button onClick={() => onViewProfile(u)} className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  Профиль
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NotificationsPanel ───────────────────────────────────────────────────────
function NotificationsPanel({ user, onClose }: { user: FullUser; onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(MESSAGES_URL, { action: "notifications", user_id: user.id }).then(d => {
      setNotifs(d.notifications || []);
      setLoading(false);
      if (d.unread_count > 0) api(MESSAGES_URL, { action: "mark_notifications_read", user_id: user.id });
    });
  }, []);

  const typeIcon: Record<string, string> = { message: "MessageCircle", like: "Heart", comment: "MessageSquare", follow: "UserPlus" };
  const typeColor: Record<string, string> = { message: "text-primary", like: "text-rose-400", comment: "text-blue-400", follow: "text-green-400" };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-card border-l border-border overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold">Уведомления</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted/40 rounded-xl"><Icon name="X" size={18} /></button>
        </div>
        {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}
        {!loading && notifs.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Уведомлений нет</p>}
        <div className="divide-y divide-border">
          {notifs.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
              {n.from_name && <Av src={n.from_avatar} name={n.from_name} size="sm" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name={typeIcon[n.type] || "Bell"} size={14} className={typeColor[n.type] || "text-muted-foreground"} />
                  <span className="text-sm font-medium">{n.from_name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────
function SettingsPage({ user, onLogout }: { user: FullUser; onLogout: () => void }) {
  const [notifications, setNotifications] = useState(true);
  const [privateAcc, setPrivateAcc] = useState(false);
  const [showOnline, setShowOnline] = useState(true);
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-primary" : "bg-muted"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  return (
    <div className="max-w-xl mx-auto pb-8 space-y-6 animate-fade-in">
      <div className="post-card rounded-2xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-lg font-bold text-black overflow-hidden">
          {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : initials}
        </div>
        <div>
          <p className="font-bold text-lg leading-tight">{user.name}</p>
          <p className="text-muted-foreground text-sm">{user.handle}</p>
          {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Приватность</h3>
        <div className="post-card rounded-2xl divide-y divide-border overflow-hidden">
          {[
            { icon: "Bell", label: "Уведомления", value: notifications, onChange: () => setNotifications(!notifications) },
            { icon: "ShieldCheck", label: "Закрытый аккаунт", value: privateAcc, onChange: () => setPrivateAcc(!privateAcc) },
            { icon: "Eye", label: "Показывать онлайн", value: showOnline, onChange: () => setShowOnline(!showOnline) },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
              <div className="p-2 rounded-xl bg-muted/60"><Icon name={item.icon} size={18} className="text-muted-foreground" /></div>
              <p className="flex-1 text-sm font-medium">{item.label}</p>
              <Toggle value={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Прочее</h3>
        <div className="post-card rounded-2xl divide-y divide-border overflow-hidden">
          <div className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
            <div className="p-2 rounded-xl bg-muted/60"><Icon name="Info" size={18} className="text-muted-foreground" /></div>
            <div className="flex-1"><p className="text-sm font-medium">О приложении</p><p className="text-xs text-muted-foreground">Eclipse v2.0</p></div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
          <div onClick={onLogout} className="flex items-center gap-3 p-4 hover:bg-destructive/10 transition-colors cursor-pointer">
            <div className="p-2 rounded-xl bg-destructive/15"><Icon name="LogOut" size={18} className="text-destructive" /></div>
            <p className="flex-1 text-sm font-medium text-destructive">Выйти</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (user: FullUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const body: Record<string, string> = { action: mode, email, password };
      if (mode === "register") body.name = name;
      const res = await fetch(AUTH_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const raw = await res.json();
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok) { setError(parsed.error || "Ошибка сервера"); return; }
      localStorage.setItem("eclipse_user", JSON.stringify(parsed.user));
      onAuth(parsed.user);
    } catch { setError("Ошибка соединения"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background font-golos flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black gradient-text tracking-tight font-montserrat">✦ Eclipse</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">твоя вселенная</p>
        </div>
        <div className="post-card rounded-2xl p-6 glow-gold">
          <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Имя</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Как тебя зовут?"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 placeholder:text-muted-foreground/50" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 placeholder:text-muted-foreground/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Пароль</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 placeholder:text-muted-foreground/50 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full gradient-gold text-primary-foreground font-semibold py-2.5 rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98] mt-2 disabled:opacity-60">
              {loading ? "Подождите..." : mode === "login" ? "Войти в Eclipse" : "Создать аккаунт"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary hover:underline">
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const NAV: { page: Page; icon: string; label: string }[] = [
  { page: "feed", icon: "Home", label: "Главная" },
  { page: "search", icon: "Search", label: "Поиск" },
  { page: "messages", icon: "MessageCircle", label: "Сообщения" },
  { page: "profile", icon: "User", label: "Профиль" },
  { page: "settings", icon: "Settings", label: "Настройки" },
];

const TITLES: Record<Page, string> = {
  feed: "Eclipse", search: "Поиск", messages: "Сообщения", profile: "Профиль", settings: "Настройки",
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<FullUser | null>(() => {
    try { const s = localStorage.getItem("eclipse_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [page, setPage] = useState<Page>("feed");
  const [viewedUser, setViewedUser] = useState<SearchUser | null>(null);
  const [viewedUserId, setViewedUserId] = useState<number | null>(null);
  const [chatTarget, setChatTarget] = useState<SearchUser | null>(null);
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const updateUser = (u: FullUser) => { setUser(u); localStorage.setItem("eclipse_user", JSON.stringify(u)); };
  const goToProfile = (u: SearchUser) => { setViewedUser(u); setPage("search"); };
  const goToMessage = (u: SearchUser) => { setChatTarget(u); setPage("messages"); };

  const goToProfileById = async (uid: number) => {
    if (!user) return;
    if (uid === user.id) { setPage("profile"); return; }
    const data = await apiGet(SEARCH_URL, { q: "" });
    const found = (data.users || []).find((u: SearchUser) => u.id === uid);
    if (found) { setViewedUser(found); setPage("search"); }
  };

  // Poll notifications
  useEffect(() => {
    if (!user) return;
    const load = () => {
      apiGet(MESSAGES_URL, { action: "notifications", user_id: user.id }).then(d => {
        setUnreadNotifCount(d.unread_count || 0);
        setUnreadMsgCount(d.unread_msg_count || 0);
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user?.id]);

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />;

  return (
    <div className="min-h-screen bg-background font-golos flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 fixed top-0 left-0 h-full border-r border-border px-4 py-6 z-40">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-black gradient-text tracking-tight font-montserrat">✦ Eclipse</h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-widest uppercase">твоя вселенная</p>
        </div>
        <div className="gold-divider mb-4 mx-2" />
        <nav className="space-y-0.5 flex-1">
          {NAV.map(item => (
            <button key={item.page} onClick={() => { setPage(item.page); setViewedUser(null); setHashtagFilter(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.page ? "nav-active" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              <Icon name={item.icon} size={19} />
              {item.label}
              {item.page === "messages" && unreadMsgCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 group cursor-pointer" onClick={() => setPage("profile")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-xs font-bold text-black overflow-hidden">
              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.handle}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-60 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="sticky top-0 z-30 glass border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-lg font-montserrat">
            {hashtagFilter ? `#${hashtagFilter}` : TITLES[page]}
          </h2>
          <button onClick={() => setShowNotifs(true)} className="relative p-2 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground hover:text-foreground">
            <Icon name="Bell" size={20} />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
              </span>
            )}
          </button>
        </header>

        <div className="flex-1 px-4 pt-6">
          {page === "feed" && !hashtagFilter && (
            <FeedPage user={user} onProfile={goToProfileById} onHashtag={tag => { setHashtagFilter(tag); }} />
          )}
          {page === "feed" && hashtagFilter && (
            <HashtagPage tag={hashtagFilter} user={user} onBack={() => setHashtagFilter(null)} onProfile={goToProfileById} />
          )}
          {page === "search" && (
            viewedUser
              ? <UserProfilePage user={viewedUser} currentUser={user} onBack={() => setViewedUser(null)} onMessage={goToMessage} />
              : <SearchPage user={user} onViewProfile={goToProfile} onMessage={goToMessage} />
          )}
          {page === "messages" && (
            <MessagesPage user={user} initialChat={chatTarget} onChatOpened={() => setChatTarget(null)} />
          )}
          {page === "profile" && (
            <ProfilePage user={user} onUserUpdate={updateUser} />
          )}
          {page === "settings" && (
            <SettingsPage user={user} onLogout={() => { localStorage.removeItem("eclipse_user"); setUser(null); }} />
          )}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border flex z-40">
        {NAV.map(item => (
          <button key={item.page} onClick={() => { setPage(item.page); setViewedUser(null); setHashtagFilter(null); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors relative ${page === item.page ? "text-primary" : "text-muted-foreground"}`}>
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
            {item.page === "messages" && unreadMsgCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Notifications panel */}
      {showNotifs && <NotificationsPanel user={user} onClose={() => { setShowNotifs(false); setUnreadNotifCount(0); }} />}
    </div>
  );
}
