import { useState } from "react";
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

interface ChatMessage {
  id: number;
  fromMe: boolean;
  text: string;
  time: string;
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

// ─── Profile Page ─────────────────────────────────────────────────────────────

function ProfilePage() {
  const [tab, setTab] = useState<"posts" | "liked">("posts");
  const [followed, setFollowed] = useState(false);

  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      <div className="h-36 rounded-2xl mb-0 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1500 60%, #0d0d0d 100%)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(212,160,23,0.22) 0%, transparent 55%), radial-gradient(circle at 80% 30%, rgba(180,130,10,0.15) 0%, transparent 50%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-12" style={{ background: "linear-gradient(to top, rgba(20,16,0,0.6), transparent)" }} />
      </div>

      <div className="px-4 -mt-8 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-xl font-bold text-black border-4 border-background">
            ВЫ
          </div>
          <button onClick={() => setFollowed(!followed)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${followed ? "bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            {followed ? "Подписан" : "Подписаться"}
          </button>
        </div>
        <div className="font-bold text-xl">Ваш Профиль</div>
        <div className="text-muted-foreground text-sm mb-2">@yourhandle</div>
        <p className="text-sm text-foreground/80 mb-4">Разработчик · Мечтатель · Строю соц.сеть своей мечты 🚀</p>
        <div className="flex gap-6 text-sm">
          <div><span className="font-bold">142</span> <span className="text-muted-foreground">постов</span></div>
          <div><span className="font-bold">2.4K</span> <span className="text-muted-foreground">подписчиков</span></div>
          <div><span className="font-bold">381</span> <span className="text-muted-foreground">подписок</span></div>
        </div>
      </div>

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
    </div>
  );
}

// ─── Messages Page ────────────────────────────────────────────────────────────

function MessagesPage() {
  const [active, setActive] = useState<Message | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(CHAT_HISTORY);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setChatMessages(m => [...m, {
      id: Date.now(), fromMe: true, text: input,
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    }]);
    setInput("");
  };

  if (active) {
    return (
      <div className="max-w-xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-scale-in">
        <div className="flex items-center gap-3 p-4 glass rounded-2xl mb-3">
          <button onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground transition-colors mr-1">
            <Icon name="ChevronLeft" size={20} />
          </button>
          <Avatar initials={active.avatar} online={active.online} />
          <div>
            <div className="font-semibold">{active.name}</div>
            <div className="text-xs text-muted-foreground">{active.online ? "онлайн" : "не в сети"}</div>
          </div>
          <div className="ml-auto flex gap-1 text-muted-foreground">
            <button className="p-2 hover:text-primary transition-colors rounded-xl hover:bg-muted/40"><Icon name="Phone" size={18} /></button>
            <button className="p-2 hover:text-primary transition-colors rounded-xl hover:bg-muted/40"><Icon name="Video" size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 px-1 mb-3">
          {chatMessages.map(m => (
            <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.fromMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                <p>{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.fromMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 glass rounded-2xl p-2">
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors"><Icon name="Smile" size={18} /></button>
          <input
            className="flex-1 bg-transparent outline-none text-sm placeholder-muted-foreground"
            placeholder="Написать сообщение..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <button onClick={send} className="p-2 bg-primary rounded-xl text-primary-foreground hover:opacity-90 transition-opacity">
            <Icon name="Send" size={16} />
          </button>
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

function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");

  const tags = [{ id: "all", label: "Все" }, { id: "people", label: "Люди" }, { id: "posts", label: "Посты" }, { id: "tags", label: "Хэштеги" }];
  const filtered = SEARCH_USERS.filter(u => !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.handle.includes(query.toLowerCase()));

  return (
    <div className="max-w-xl mx-auto pb-8 animate-fade-in">
      <div className="relative mb-4">
        <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full bg-muted/60 border border-border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder-muted-foreground transition-all"
          placeholder="Поиск людей, постов, хэштегов..."
          value={query} onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tags.map(t => (
          <button key={t.id} onClick={() => setActiveTag(t.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTag === t.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
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
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{query ? "Результаты" : "Рекомендуемые"}</h3>
        <div className="space-y-2">
          {filtered.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 p-3 post-card rounded-2xl animate-fade-in stagger-${Math.min(i + 1, 5)}`} style={{ opacity: 0 }}>
              <Avatar initials={u.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.handle} · {u.bio}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-muted-foreground mb-1">{u.followers}</div>
                <button className="px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  Подписаться
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

function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [privateAcc, setPrivateAcc] = useState(false);
  const [showOnline, setShowOnline] = useState(true);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-primary" : "bg-muted"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  type SettingItem = { icon: string; label: string; sub?: string; toggle?: boolean; value?: boolean; onChange?: () => void; danger?: boolean };
  type SettingSection = { title: string; items: SettingItem[] };

  const sections: SettingSection[] = [
    {
      title: "Аккаунт", items: [
        { icon: "User", label: "Редактировать профиль", sub: "Имя, фото, биография" },
        { icon: "Lock", label: "Сменить пароль", sub: "Безопасность аккаунта" },
        { icon: "Mail", label: "Email", sub: "your@email.com" },
      ],
    },
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
        { icon: "LogOut", label: "Выйти", sub: "", danger: true },
      ],
    },
  ];

  return (
    <div className="max-w-xl mx-auto pb-8 space-y-6 animate-fade-in">
      <div className="post-card rounded-2xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-lg font-bold text-black">ВЫ</div>
        <div>
          <p className="font-bold text-lg leading-tight">Ваш Профиль</p>
          <p className="text-muted-foreground text-sm">@yourhandle</p>
        </div>
        <button className="ml-auto p-2 hover:bg-muted/50 rounded-xl transition-colors">
          <Icon name="ChevronRight" size={18} className="text-muted-foreground" />
        </button>
      </div>

      {sections.map(section => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">{section.title}</h3>
          <div className="post-card rounded-2xl divide-y divide-border overflow-hidden">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className={`p-2 rounded-xl ${item.danger ? "bg-destructive/15" : "bg-muted/60"}`}>
                  <Icon name={item.icon} size={18} className={item.danger ? "text-destructive" : "text-muted-foreground"} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.danger ? "text-destructive" : ""}`}>{item.label}</p>
                  {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                </div>
                {item.toggle ? <Toggle value={item.value} onChange={item.onChange} /> : <Icon name="ChevronRight" size={16} className="text-muted-foreground" />}
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

type AuthMode = "login" | "register";

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuth();
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

            <button
              type="submit"
              className="w-full gradient-gold text-primary-foreground font-semibold py-2.5 rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98] mt-2">
              {mode === "login" ? "Войти в Eclipse" : "Создать аккаунт"}
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
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Page>("feed");

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

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
            <button key={item.page} onClick={() => setPage(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.page ? "nav-active" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              <Icon name={item.icon} size={19} />
              {item.label}
              {item.page === "messages" && (
                <span className="ml-auto w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">4</span>
              )}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-600 to-amber-400 flex items-center justify-center text-xs font-bold text-black">ВЫ</div>
          <div>
            <p className="font-medium text-sm leading-tight">Вы</p>
            <p className="text-xs text-muted-foreground">@yourhandle</p>
          </div>
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
          {page === "search" && <SearchPage />}
          {page === "messages" && <MessagesPage />}
          {page === "profile" && <ProfilePage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border flex z-40">
        {NAV.map(item => (
          <button key={item.page} onClick={() => setPage(item.page)}
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