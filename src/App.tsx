import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────

type Page = "feed" | "profile" | "messages" | "search" | "settings";

interface Comment {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  text: string;
  likes: number;
  liked: boolean;
}

interface Post {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  comments: Comment[];
  liked: boolean;
}

interface Message {
  id: number;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
}

type ChatMsgType = "text" | "voice" | "image" | "file";

interface ChatMessage {
  id: number;
  fromMe: boolean;
  text: string;
  time: string;
  type?: ChatMsgType;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  duration?: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_POSTS: Post[] = [
  {
    id: 1, author: "Алина Морозова", handle: "@alina_m", avatar: "АМ", time: "2 мин назад",
    text: "Только что вернулась с ночного концерта. Городские огни, живая музыка, тысячи людей — ощущение, будто весь мир на одной волне 🌙",
    likes: 142, liked: false,
    comments: [
      { id: 1, author: "Дима К.", handle: "@dimak", avatar: "ДК", text: "Это было незабываемо! Я тоже там был", likes: 12, liked: false },
      { id: 2, author: "Соня Л.", handle: "@sonya", avatar: "СЛ", text: "Завидую белой завистью 😭", likes: 5, liked: false },
    ],
  },
  {
    id: 2, author: "Максим Орлов", handle: "@max_orlov", avatar: "МО", time: "15 мин назад",
    text: "Запустил новый проект. Три месяца работы, бессонные ночи, тысячи строк кода — и вот оно живое. Благодарю всех, кто верил.",
    likes: 287, liked: false,
    comments: [
      { id: 1, author: "Катя П.", handle: "@katya_p", avatar: "КП", text: "Поздравляю! Ты молодец 🎉", likes: 8, liked: false },
    ],
  },
  {
    id: 3, author: "Юля Северова", handle: "@yulya_s", avatar: "ЮС", time: "1 час назад",
    text: "Философский вопрос пятницы: если бы у вас была возможность жить в любой эпохе, когда бы это было? Я бы выбрала рассвет эпохи Возрождения 🎨",
    likes: 63, liked: false, comments: [],
  },
];

const MESSAGES_LIST: Message[] = [
  { id: 1, name: "Алина Морозова", avatar: "АМ", lastMsg: "Увидимся завтра?", time: "2 мин", unread: 3, online: true },
  { id: 2, name: "Максим Орлов", avatar: "МО", lastMsg: "Спасибо за поддержку!", time: "15 мин", unread: 0, online: true },
  { id: 3, name: "Дима Козлов", avatar: "ДК", lastMsg: "Отправил файлы", time: "1 ч", unread: 1, online: false },
  { id: 4, name: "Соня Лебедева", avatar: "СЛ", lastMsg: "Когда встречаемся?", time: "3 ч", unread: 0, online: false },
  { id: 5, name: "Катя Петрова", avatar: "КП", lastMsg: "Видела новость? 🔥", time: "вчера", unread: 0, online: true },
];

const CHAT_HISTORY: ChatMessage[] = [
  { id: 1, fromMe: false, text: "Привет! Как дела?", time: "14:20" },
  { id: 2, fromMe: true, text: "Привет! Всё отлично, работаю над проектом", time: "14:21" },
  { id: 3, fromMe: false, text: "Звучит круто! О чём проект?", time: "14:22" },
  { id: 4, fromMe: true, text: "Делаю соц.сеть, будет очень интересно!", time: "14:23" },
  { id: 5, fromMe: false, text: "Вау, это здорово! Увидимся завтра?", time: "14:25" },
];

const SEARCH_USERS = [
  { id: 1, name: "Алина Морозова", handle: "@alina_m", avatar: "АМ", bio: "Фотограф · Путешественница", followers: "2.4K" },
  { id: 2, name: "Максим Орлов", handle: "@max_orlov", avatar: "МО", bio: "Разработчик · Стартапер", followers: "5.1K" },
  { id: 3, name: "Юля Северова", handle: "@yulya_s", avatar: "ЮС", bio: "Художник · Философ", followers: "890" },
  { id: 4, name: "Дима Козлов", handle: "@dimak", avatar: "ДК", bio: "Музыкант · Продюсер", followers: "3.2K" },
  { id: 5, name: "Катя Петрова", handle: "@katya_p", avatar: "КП", bio: "Дизайнер интерьеров", followers: "1.7K" },
];

// ─── Avatar Component ─────────────────────────────────────────────────────────

function Avatar({ initials, size = "md", online }: { initials: string; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-xl" };
  const gradients: Record<string, string> = {
    А: "from-yellow-600 to-amber-400", М: "from-amber-700 to-yellow-500",
    Ю: "from-yellow-500 to-orange-400", Д: "from-amber-600 to-yellow-400",
    С: "from-orange-600 to-amber-400", К: "from-yellow-700 to-amber-500",
    В: "from-amber-500 to-yellow-300",
  };
  const grad = gradients[initials[0]] || "from-yellow-600 to-amber-400";
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-semibold text-white`}>
        {initials}
      </div>
      {online !== undefined && (
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-green-400" : "bg-muted-foreground/50"}`} />
      )}
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

function FeedPage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPost, setNewPost] = useState("");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [likeAnimating, setLikeAnimating] = useState<number | null>(null);

  const toggleLikePost = (id: number) => {
    setLikeAnimating(id);
    setTimeout(() => setLikeAnimating(null), 400);
    setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const toggleLikeComment = (postId: number, commentId: number) => {
    setPosts(ps => ps.map(p => p.id === postId ? {
      ...p, comments: p.comments.map(c => c.id === commentId ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c)
    } : p));
  };

  const publish = () => {
    if (!newPost.trim()) return;
    setPosts(ps => [{
      id: Date.now(), author: "Вы", handle: "@you", avatar: "ВЫ",
      time: "только что", text: newPost, likes: 0, liked: false, comments: [],
    }, ...ps]);
    setNewPost("");
  };

  const addComment = (postId: number) => {
    if (!commentText.trim()) return;
    setPosts(ps => ps.map(p => p.id === postId ? {
      ...p, comments: [...p.comments, { id: Date.now(), author: "Вы", handle: "@you", avatar: "ВЫ", text: commentText, likes: 0, liked: false }]
    } : p));
    setCommentText("");
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      <div className="post-card rounded-2xl p-4 animate-fade-in">
        <div className="flex gap-3">
          <Avatar initials="ВЫ" />
          <div className="flex-1">
            <textarea
              className="w-full bg-transparent text-foreground placeholder-muted-foreground resize-none outline-none text-[15px] leading-relaxed min-h-[80px]"
              placeholder="Что происходит в твоей жизни?"
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
            />
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <div className="flex gap-1 text-muted-foreground">
                <button className="p-1.5 hover:text-primary transition-colors rounded-lg hover:bg-accent/20"><Icon name="Image" size={18} /></button>
                <button className="p-1.5 hover:text-primary transition-colors rounded-lg hover:bg-accent/20"><Icon name="Smile" size={18} /></button>
              </div>
              <button onClick={publish} disabled={!newPost.trim()}
                className="px-5 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      </div>

      {posts.map((post, i) => (
        <div key={post.id} className={`post-card rounded-2xl p-4 animate-fade-in stagger-${Math.min(i + 1, 5)}`} style={{ opacity: 0 }}>
          <div className="flex gap-3 mb-3">
            <Avatar initials={post.avatar} />
            <div>
              <div className="font-semibold leading-tight">{post.author}</div>
              <div className="text-xs text-muted-foreground">{post.handle} · {post.time}</div>
            </div>
            <button className="ml-auto text-muted-foreground hover:text-foreground p-1"><Icon name="MoreHorizontal" size={18} /></button>
          </div>

          <p className="text-[15px] leading-relaxed text-foreground/90 mb-4">{post.text}</p>

          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <button onClick={() => toggleLikePost(post.id)}
              className={`flex items-center gap-1.5 text-sm transition-all ${post.liked ? "like-active" : "text-muted-foreground hover:text-rose-400"}`}>
              <Icon name="Heart" size={18} className={`${likeAnimating === post.id ? "animate-heart-pop" : ""} ${post.liked ? "fill-current" : ""}`} />
              <span className="font-medium">{post.likes}</span>
            </button>
            <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Icon name="MessageCircle" size={18} />
              <span className="font-medium">{post.comments.length}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto">
              <Icon name="Share2" size={18} />
            </button>
          </div>

          {expandedPost === post.id && (
            <div className="mt-4 space-y-3 animate-fade-in">
              {post.comments.map(c => (
                <div key={c.id} className="flex gap-2.5 p-3 rounded-xl bg-muted/40">
                  <Avatar initials={c.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{c.author}</span>
                      <span className="text-xs text-muted-foreground">{c.handle}</span>
                    </div>
                    <p className="text-sm text-foreground/85 mt-0.5">{c.text}</p>
                  </div>
                  <button onClick={() => toggleLikeComment(post.id, c.id)}
                    className={`flex items-center gap-1 text-xs flex-shrink-0 transition-colors ${c.liked ? "like-active" : "text-muted-foreground hover:text-rose-400"}`}>
                    <Icon name="Heart" size={14} className={c.liked ? "fill-current" : ""} />
                    <span>{c.likes}</span>
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Avatar initials="ВЫ" size="sm" />
                <div className="flex-1 flex gap-2">
                  <input
                    className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder-muted-foreground"
                    placeholder="Написать комментарий..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addComment(post.id)}
                  />
                  <button onClick={() => addComment(post.id)} className="px-3 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                    <Icon name="Send" size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── User Profile View (other users) ─────────────────────────────────────────

interface SearchUser { id: number; name: string; handle: string; avatar: string; bio: string; }

function UserAvatar({ user, size = "md" }: { user: SearchUser; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-xl" };
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center font-semibold text-black flex-shrink-0 overflow-hidden`}>
      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : initials}
    </div>
  );
}

function UserProfilePage({ user, onBack, onMessage }: { user: SearchUser; onBack: () => void; onMessage: (u: SearchUser) => void }) {
  const [followed, setFollowed] = useState(false);
  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm">
        <Icon name="ChevronLeft" size={18} /> Назад
      </button>

      <div className="h-32 rounded-2xl mb-0 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1500 60%, #0d0d0d 100%)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(212,160,23,0.18) 0%, transparent 55%)" }} />
      </div>

      <div className="px-4 -mt-8 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div className="w-16 h-16 rounded-2xl border-4 border-background overflow-hidden bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-xl font-bold text-black">
            {user.avatar
              ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              : user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onMessage(user)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/70 transition-all flex items-center gap-1.5">
              <Icon name="MessageCircle" size={15} /> Написать
            </button>
            <button onClick={() => setFollowed(f => !f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${followed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
              {followed ? "Подписан" : "Подписаться"}
            </button>
          </div>
        </div>
        <div className="font-bold text-xl">{user.name}</div>
        <div className="text-muted-foreground text-sm mb-1">{user.handle}</div>
        {user.bio && <p className="text-sm text-foreground/80 mt-1">{user.bio}</p>}
        <div className="flex gap-6 text-sm mt-3">
          <div><span className="font-bold">0</span> <span className="text-muted-foreground">постов</span></div>
          <div><span className="font-bold">0</span> <span className="text-muted-foreground">подписчиков</span></div>
          <div><span className="font-bold">0</span> <span className="text-muted-foreground">подписок</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(${30 + i * 4} 20% ${8 + i}%), hsl(${42 + i * 3} 40% ${14 + i}%))` }}>
            <Icon name="Image" size={22} className="text-white/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

const UPDATE_PROFILE_URL = "https://functions.poehali.dev/4f1e8cca-402e-4a83-9934-160d538cc223";

async function apiUpdateProfile(body: Record<string, unknown>) {
  const res = await fetch(UPDATE_PROFILE_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const raw = await res.json();
  return { ok: res.ok, data: typeof raw === "string" ? JSON.parse(raw) : raw };
}

type EditSection = "none" | "info" | "password" | "email";

interface FullUser extends AuthUser { bio?: string; banner?: string; email?: string; }

function ProfilePage({ user, onUserUpdate }: { user: FullUser; onUserUpdate: (u: FullUser) => void }) {
  const [tab, setTab] = useState<"posts" | "liked">("posts");
  const [editSection, setEditSection] = useState<EditSection>("none");

  // info fields
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle.replace("@", ""));
  const [bio, setBio] = useState(user.bio || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // password
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  // email
  const [email, setEmail] = useState(user.email || "");

  // avatar / banner
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<string> =>
    new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const b64 = await toBase64(file);
    const { ok, data } = await apiUpdateProfile({ action: "update", user_id: user.id, avatar: b64 });
    if (ok) onUserUpdate({ ...user, ...data.user });
    e.target.value = "";
  };

  const handleBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const b64 = await toBase64(file);
    const { ok, data } = await apiUpdateProfile({ action: "update", user_id: user.id, banner: b64 });
    if (ok) onUserUpdate({ ...user, ...data.user });
    e.target.value = "";
  };

  const saveInfo = async () => {
    setSaving(true); setErr("");
    const { ok, data } = await apiUpdateProfile({ action: "update", user_id: user.id, name, handle, bio });
    setSaving(false);
    if (!ok) { setErr(data.error || "Ошибка"); return; }
    onUserUpdate({ ...user, ...data.user });
    setEditSection("none");
  };

  const savePassword = async () => {
    if (newPw !== newPw2) { setErr("Пароли не совпадают"); return; }
    if (newPw.length < 6) { setErr("Минимум 6 символов"); return; }
    setSaving(true); setErr("");
    const { ok, data } = await apiUpdateProfile({ action: "change_password", user_id: user.id, old_password: oldPw, new_password: newPw });
    setSaving(false);
    if (!ok) { setErr(data.error || "Ошибка"); return; }
    setOldPw(""); setNewPw(""); setNewPw2("");
    setEditSection("none");
  };

  const saveEmail = async () => {
    setSaving(true); setErr("");
    const { ok, data } = await apiUpdateProfile({ action: "update", user_id: user.id, email });
    setSaving(false);
    if (!ok) { setErr(data.error || "Ошибка"); return; }
    onUserUpdate({ ...user, ...data.user });
    setEditSection("none");
  };

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const inputCls = "w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50";
  const btnPrimary = "px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60";
  const btnMuted = "px-5 py-2 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/70 transition-all";

  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      {/* Banner */}
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
      <div className="h-36 rounded-2xl mb-0 relative overflow-hidden cursor-pointer group" onClick={() => bannerRef.current?.click()}
        style={user.banner ? { backgroundImage: `url(${user.banner})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "linear-gradient(135deg, #0d0d0d 0%, #1a1500 60%, #0d0d0d 100%)" }}>
        {!user.banner && <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(212,160,23,0.22) 0%, transparent 55%)" }} />}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl px-3 py-1.5 flex items-center gap-2 text-white text-xs">
            <Icon name="Camera" size={14} /> Сменить баннер
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 mb-6">
        <div className="flex justify-between items-end mb-4">
          {/* Avatar */}
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
              <div><span className="font-bold">0</span> <span className="text-muted-foreground">постов</span></div>
              <div><span className="font-bold">0</span> <span className="text-muted-foreground">подписчиков</span></div>
              <div><span className="font-bold">0</span> <span className="text-muted-foreground">подписок</span></div>
            </div>
          </>
        )}

        {/* Edit info */}
        {editSection === "info" && (
          <div className="space-y-3 mt-2 animate-fade-in">
            <div><label className="text-xs text-muted-foreground mb-1 block">Имя</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Никнейм</label>
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input className={inputCls + " pl-7"} value={handle} onChange={e => setHandle(e.target.value)} />
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Биография</label>
              <textarea className={inputCls + " resize-none"} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Расскажи о себе..." />
            </div>
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

        {/* Change password */}
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

        {/* Change email */}
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
          <div className="flex border-b border-border mb-4 px-2">
            {(["posts", "liked"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t === "posts" ? "Публикации" : "Понравилось"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 px-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: `linear-gradient(135deg, hsl(${30 + i * 4} 20% ${8 + i}%), hsl(${42 + i * 3} 40% ${14 + i}%))` }}>
                <Icon name="Image" size={24} className="text-white/20" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Call Screen ──────────────────────────────────────────────────────────────

function CallScreen({ contact, onEnd }: { contact: { name: string; avatar: string }; onEnd: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between py-20 px-8"
      style={{ background: "radial-gradient(ellipse at 40% 30%, #1a1200 0%, #050502 100%)" }}>
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-4xl font-bold text-black mb-2 glow-gold">
          {contact.avatar}
        </div>
        <h2 className="text-2xl font-bold">{contact.name}</h2>
        <p className="text-muted-foreground text-sm">{seconds < 3 ? "Вызов..." : fmt(seconds)}</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="flex gap-6">
          <button onClick={() => setMuted(!muted)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${muted ? "bg-destructive text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={22} />
          </button>
          <button onClick={() => setSpeaker(!speaker)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${speaker ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <Icon name={speaker ? "Volume2" : "VolumeX"} size={22} />
          </button>
        </div>
        <button onClick={onEnd}
          className="w-18 h-18 w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity active:scale-95">
          <Icon name="PhoneOff" size={28} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Messages Page ────────────────────────────────────────────────────────────

const WALLPAPERS = [
  { id: "none", label: "Нет", style: {} },
  { id: "dark", label: "Тёмный", style: { background: "linear-gradient(135deg,#0d0d0d 0%,#1a1200 100%)" } },
  { id: "gold", label: "Золото", style: { background: "linear-gradient(135deg,#1a1000 0%,#2d1e00 50%,#1a1000 100%)" } },
  { id: "night", label: "Ночь", style: { background: "linear-gradient(160deg,#0a0a1a 0%,#0d1525 50%,#0a0f0a 100%)" } },
  { id: "forest", label: "Лес", style: { background: "linear-gradient(160deg,#061209 0%,#0d2010 100%)" } },
  { id: "cosmos", label: "Космос", style: { background: "radial-gradient(ellipse at 30% 20%,#1a0030 0%,#050010 60%,#000510 100%)" } },
];

function VoiceRecorder({ onSend }: { onSend: (dur: number) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { alert("Нет доступа к микрофону"); }
  };

  const stop = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    const dur = seconds;
    setRecording(false);
    setSeconds(0);
    onSend(dur || 1);
  };

  const cancel = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setSeconds(0);
  };

  if (recording) return (
    <div className="flex items-center gap-2">
      <button onClick={cancel} className="p-2 text-destructive hover:opacity-80 transition-opacity"><Icon name="X" size={18} /></button>
      <div className="flex items-center gap-1.5 flex-1">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm text-destructive font-mono">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <button onClick={stop} className="p-2 bg-primary rounded-xl text-primary-foreground hover:opacity-90"><Icon name="Send" size={16} /></button>
    </div>
  );

  return (
    <button onClick={start} className="p-2 text-muted-foreground hover:text-primary transition-colors">
      <Icon name="Mic" size={18} />
    </button>
  );
}

function ChatBubble({ m }: { m: ChatMessage }) {
  const base = `max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.fromMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`;
  const time = <p className={`text-[10px] mt-1 ${m.fromMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>{m.time}</p>;

  if (m.type === "voice") return (
    <div className={base}>
      <div className="flex items-center gap-2">
        <Icon name="Mic" size={16} />
        <div className="flex gap-0.5 items-end h-5">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="w-0.5 rounded-full opacity-70" style={{ height: `${Math.max(3, Math.sin(i * 0.8) * 10 + 12)}px`, background: "currentColor" }} />
          ))}
        </div>
        <span className="text-xs opacity-70 ml-1">{m.duration}с</span>
      </div>
      {time}
    </div>
  );

  if (m.type === "image") return (
    <div className={`max-w-[75%] rounded-2xl overflow-hidden ${m.fromMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
      <img src={m.fileUrl} alt="фото" className="w-full max-h-60 object-cover" />
      <div className={`px-3 py-1.5 ${m.fromMe ? "bg-primary" : "bg-card border-x border-b border-border"}`}>
        {time}
      </div>
    </div>
  );

  if (m.type === "file") return (
    <div className={base}>
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${m.fromMe ? "bg-primary-foreground/20" : "bg-muted"}`}>
          <Icon name="File" size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{m.fileName}</p>
          <p className="text-xs opacity-60">{m.fileSize}</p>
        </div>
        <Icon name="Download" size={16} className="shrink-0 opacity-60" />
      </div>
      {time}
    </div>
  );

  return (
    <div className={base}>
      <p>{m.text}</p>
      {time}
    </div>
  );
}

function MessagesPage({ initialChat, onChatOpened }: { initialChat?: SearchUser | null; onChatOpened?: () => void }) {
  const makeMsg = (u: SearchUser): Message => ({ id: u.id, name: u.name, avatar: u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), lastMsg: "", time: "", unread: 0, online: false });

  const [active, setActive] = useState<Message | null>(() => initialChat ? makeMsg(initialChat) : null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChat ? [] : CHAT_HISTORY);
  const [input, setInput] = useState("");
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [wallpaper, setWallpaper] = useState("none");
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [callContact, setCallContact] = useState<{ name: string; avatar: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const now = () => new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (initialChat) { setActive(makeMsg(initialChat)); setChatMessages([]); onChatOpened?.(); }
  }, [initialChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const send = () => {
    if (!input.trim()) return;
    setChatMessages(m => [...m, { id: Date.now(), fromMe: true, text: input, time: now(), type: "text" }]);
    setInput("");
  };

  const sendVoice = (duration: number) => {
    setChatMessages(m => [...m, { id: Date.now(), fromMe: true, text: "", time: now(), type: "voice", duration }]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isImage = file.type.startsWith("image/");
    const kb = Math.round(file.size / 1024);
    const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} МБ` : `${kb} КБ`;
    setChatMessages(m => [...m, {
      id: Date.now(), fromMe: true, text: "", time: now(),
      type: isImage ? "image" : "file",
      fileName: file.name, fileSize: size, fileUrl: url,
    }]);
    e.target.value = "";
  };

  const handleWallpaperFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomWallpaper(url);
    setWallpaper("custom");
    setShowWallpaper(false);
    e.target.value = "";
  };

  const wallpaperStyle: React.CSSProperties =
    wallpaper === "custom" && customWallpaper
      ? { backgroundImage: `url(${customWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" }
      : WALLPAPERS.find(w => w.id === wallpaper)?.style ?? {};

  if (callContact) {
    return <CallScreen contact={callContact} onEnd={() => setCallContact(null)} />;
  }

  if (active) {
    return (
      <div className="max-w-xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 glass rounded-2xl mb-3">
          <button onClick={() => { setActive(null); setShowWallpaper(false); }} className="text-muted-foreground hover:text-foreground transition-colors mr-1">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <Avatar initials={active.avatar} online={active.online} />
          <div>
            <div className="font-semibold">{active.name}</div>
            <div className="text-xs text-muted-foreground">{active.online ? "онлайн" : "не в сети"}</div>
          </div>
          <div className="ml-auto flex gap-1 text-muted-foreground">
            <button onClick={() => setCallContact({ name: active.name, avatar: active.avatar })} className="p-2 hover:text-primary transition-colors rounded-xl hover:bg-muted/40"><Icon name="Phone" size={18} /></button>
            <button onClick={() => setCallContact({ name: active.name, avatar: active.avatar })} className="p-2 hover:text-primary transition-colors rounded-xl hover:bg-muted/40"><Icon name="Video" size={18} /></button>
            <button onClick={() => setShowWallpaper(v => !v)} className={`p-2 transition-colors rounded-xl hover:bg-muted/40 ${showWallpaper ? "text-primary" : "hover:text-primary"}`}>
              <Icon name="Palette" size={18} />
            </button>
          </div>
        </div>

        {/* Wallpaper picker */}
        <input ref={wallpaperRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaperFile} />
        {showWallpaper && (
          <div className="glass rounded-2xl p-3 mb-3 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-2 px-1">Обои чата</p>
            <div className="flex gap-2 flex-wrap">
              {WALLPAPERS.map(w => (
                <button key={w.id} onClick={() => { setWallpaper(w.id); setShowWallpaper(false); }}
                  className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-xl border-2 transition-all ${wallpaper === w.id ? "border-primary" : "border-border hover:border-primary/50"}`}
                    style={w.id === "none" ? { background: "hsl(var(--card))" } : w.style} />
                  <span className="text-[10px] text-muted-foreground">{w.label}</span>
                </button>
              ))}
              {/* Custom from gallery */}
              <button onClick={() => wallpaperRef.current?.click()} className="flex flex-col items-center gap-1">
                <div className={`w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${wallpaper === "custom" ? "border-primary" : "border-border hover:border-primary/50"}`}
                  style={customWallpaper ? { backgroundImage: `url(${customWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "hsl(var(--muted))" }}>
                  {!customWallpaper && <Icon name="ImagePlus" size={20} className="text-muted-foreground" />}
                </div>
                <span className="text-[10px] text-muted-foreground">Своё</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 px-1 mb-3 rounded-2xl" style={wallpaperStyle}>
          <div className="py-2">
            {chatMessages.map(m => (
              <div key={m.id} className={`flex mb-3 ${m.fromMe ? "justify-end" : "justify-start"}`}>
                <ChatBubble m={m} />
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
          <input
            className="flex-1 bg-transparent outline-none text-sm placeholder-muted-foreground"
            placeholder="Написать сообщение..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          {input.trim() ? (
            <button onClick={send} className="p-2 bg-primary rounded-xl text-primary-foreground hover:opacity-90 transition-opacity">
              <Icon name="Send" size={16} />
            </button>
          ) : (
            <VoiceRecorder onSend={sendVoice} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-8">
      <div className="space-y-1">
        {MESSAGES_LIST.map((msg, i) => (
          <button key={msg.id} onClick={() => setActive(msg)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-muted/50 transition-colors text-left animate-fade-in stagger-${Math.min(i + 1, 5)}`}
            style={{ opacity: 0 }}>
            <Avatar initials={msg.avatar} online={msg.online} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className={`font-semibold truncate ${msg.unread > 0 ? "text-foreground" : ""}`}>{msg.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{msg.time}</span>
              </div>
              <p className={`text-sm truncate ${msg.unread > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>{msg.lastMsg}</p>
            </div>
            {msg.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {msg.unread}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Search Page ──────────────────────────────────────────────────────────────

const SEARCH_URL = "https://functions.poehali.dev/cf6e129a-475a-41e4-9976-c8dbf30dde27";

function SearchPage({ onViewProfile, onMessage }: { onViewProfile: (u: SearchUser) => void; onMessage: (u: SearchUser) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);

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
          value={query} onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />}
      </div>

      {!query && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">В тренде</h3>
          <div className="space-y-1">
            {["#технологии", "#музыка", "#путешествия", "#искусство", "#наука"].map((tag, i) => (
              <div key={tag} className={`flex justify-between items-center p-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors animate-fade-in stagger-${i + 1}`} style={{ opacity: 0 }}>
                <div>
                  <p className="font-semibold text-primary">{tag}</p>
                  <p className="text-xs text-muted-foreground">{(1.2 + i * 0.7).toFixed(1)}K публикаций</p>
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
          <p className="text-muted-foreground text-sm text-center py-8">
            {query ? "Никого не найдено" : "Пользователей пока нет"}
          </p>
        )}
        <div className="space-y-2">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 p-3 post-card rounded-2xl animate-fade-in stagger-${Math.min(i + 1, 5)}`} style={{ opacity: 0 }}>
              <button onClick={() => onViewProfile(u)} className="shrink-0">
                <UserAvatar user={u} />
              </button>
              <button className="flex-1 min-w-0 text-left" onClick={() => onViewProfile(u)}>
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.handle}{u.bio ? ` · ${u.bio}` : ""}</p>
              </button>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onMessage(u)}
                  className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                  <Icon name="MessageCircle" size={16} />
                </button>
                <button onClick={() => onViewProfile(u)}
                  className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
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

// ─── Settings Page ────────────────────────────────────────────────────────────

function SettingsPage({ user, onUserUpdate, onLogout }: { user: FullUser; onUserUpdate: (u: FullUser) => void; onLogout: () => void }) {
  const [notifications, setNotifications] = useState(true);
  const [privateAcc, setPrivateAcc] = useState(false);
  const [showOnline, setShowOnline] = useState(true);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-primary" : "bg-muted"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  type SettingItem = { icon: string; label: string; sub?: string; toggle?: boolean; value?: boolean; onChange?: () => void; danger?: boolean; onClick?: () => void };
  type SettingSection = { title: string; items: SettingItem[] };

  const sections: SettingSection[] = [
    {
      title: "Приватность", items: [
        { icon: "Bell", label: "Уведомления", toggle: true, value: notifications, onChange: () => setNotifications(!notifications) },
        { icon: "ShieldCheck", label: "Закрытый аккаунт", toggle: true, value: privateAcc, onChange: () => setPrivateAcc(!privateAcc) },
        { icon: "Eye", label: "Показывать онлайн", toggle: true, value: showOnline, onChange: () => setShowOnline(!showOnline) },
      ],
    },
    {
      title: "Прочее", items: [
        { icon: "HelpCircle", label: "Помощь и поддержка", sub: "" },
        { icon: "Info", label: "О приложении", sub: "Eclipse v1.0" },
        { icon: "LogOut", label: "Выйти", sub: "", danger: true, onClick: onLogout },
      ],
    },
  ];

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

      {sections.map(section => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">{section.title}</h3>
          <div className="post-card rounded-2xl divide-y divide-border overflow-hidden">
            {section.items.map((item) => (
              <div key={item.label} onClick={item.onClick} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className={`p-2 rounded-xl ${item.danger ? "bg-destructive/15" : "bg-muted/60"}`}>
                  <Icon name={item.icon} size={18} className={item.danger ? "text-destructive" : "text-muted-foreground"} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.danger ? "text-destructive" : ""}`}>{item.label}</p>
                  {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                </div>
                {item.toggle ? <Toggle value={item.value!} onChange={item.onChange!} /> : <Icon name="ChevronRight" size={16} className="text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

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

// ─── Auth Screen ─────────────────────────────────────────────────────────────

const AUTH_URL = "https://functions.poehali.dev/0df01f22-7e67-4557-a23b-470296289da7";

interface AuthUser {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  token: string;
}

type AuthMode = "login" | "register";

function AuthScreen({ onAuth }: { onAuth: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { action: mode, email, password };
      if (mode === "register") body.name = name;
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.json();
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!res.ok) { setError(parsed.error || "Ошибка сервера"); return; }
      localStorage.setItem("eclipse_user", JSON.stringify(parsed.user));
      onAuth(parsed.user);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
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
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Войти
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Имя</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Как тебя зовут?"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Пароль</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
            </div>

            {mode === "login" && (
              <button type="button" className="text-xs text-primary/80 hover:text-primary transition-colors">
                Забыл пароль?
              </button>
            )}

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
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

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<FullUser | null>(() => {
    try { const s = localStorage.getItem("eclipse_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [page, setPage] = useState<Page>("feed");
  const [viewedUser, setViewedUser] = useState<SearchUser | null>(null);
  const [chatTarget, setChatTarget] = useState<SearchUser | null>(null);

  const updateUser = (u: FullUser) => {
    setUser(u);
    localStorage.setItem("eclipse_user", JSON.stringify(u));
  };

  const goToProfile = (u: SearchUser) => { setViewedUser(u); setPage("search"); };
  const goToMessage = (u: SearchUser) => { setChatTarget(u); setPage("messages"); };

  if (!user) return <AuthScreen onAuth={(u) => setUser(u)} />;

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
            <button key={item.page} onClick={() => { setPage(item.page); setViewedUser(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.page ? "nav-active" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              <Icon name={item.icon} size={19} />
              {item.label}
              {item.page === "messages" && (
                <span className="ml-auto w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">4</span>
              )}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer group"
          onClick={() => { localStorage.removeItem("eclipse_user"); setUser(null); }}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-xs font-bold text-black shrink-0 overflow-hidden">
            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm leading-tight truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.handle}</p>
          </div>
          <Icon name="LogOut" size={15} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-60 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="sticky top-0 z-30 glass border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-lg font-montserrat">{TITLES[page]}</h2>
          <button className="p-2 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground hover:text-foreground">
            <Icon name="Bell" size={20} />
          </button>
        </header>
        <div className="flex-1 px-4 pt-6">
          {page === "feed" && <FeedPage />}
          {page === "search" && (
            viewedUser
              ? <UserProfilePage user={viewedUser} onBack={() => setViewedUser(null)} onMessage={(u) => { setViewedUser(null); goToMessage(u); }} />
              : <SearchPage onViewProfile={goToProfile} onMessage={goToMessage} />
          )}
          {page === "messages" && <MessagesPage initialChat={chatTarget} onChatOpened={() => setChatTarget(null)} />}
          {page === "profile" && <ProfilePage user={user} onUserUpdate={updateUser} />}
          {page === "settings" && <SettingsPage user={user} onUserUpdate={updateUser} onLogout={() => { localStorage.removeItem("eclipse_user"); setUser(null); }} />}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border flex z-40">
        {NAV.map(item => (
          <button key={item.page} onClick={() => { setPage(item.page); setViewedUser(null); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors relative ${page === item.page ? "text-primary" : "text-muted-foreground"}`}>
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
            {item.page === "messages" && (
              <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">4</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}