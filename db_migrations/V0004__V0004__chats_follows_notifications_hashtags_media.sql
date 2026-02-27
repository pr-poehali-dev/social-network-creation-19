
-- Chats (direct messages between users)
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER NOT NULL REFERENCES users(id),
  user2_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL DEFAULT '',
  msg_type VARCHAR(20) NOT NULL DEFAULT 'text',
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  duration INTEGER DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follows (subscriptions)
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id),
  following_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  from_user_id INTEGER REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  post_id INTEGER REFERENCES posts(id),
  message TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add media_url column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT NULL;

-- Hashtags
CREATE TABLE IF NOT EXISTS hashtags (
  id SERIAL PRIMARY KEY,
  tag VARCHAR(100) NOT NULL UNIQUE,
  count INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  hashtag_id INTEGER NOT NULL REFERENCES hashtags(id),
  PRIMARY KEY(post_id, hashtag_id)
);

-- Group chats
CREATE TABLE IF NOT EXISTS group_chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  avatar TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_chat_members (
  group_id INTEGER NOT NULL REFERENCES group_chats(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES group_chats(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL DEFAULT '',
  msg_type VARCHAR(20) NOT NULL DEFAULT 'text',
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  duration INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat wallpapers (per user, per chat)
CREATE TABLE IF NOT EXISTS chat_wallpapers (
  user_id INTEGER NOT NULL REFERENCES users(id),
  chat_key VARCHAR(100) NOT NULL,
  wallpaper VARCHAR(50) NOT NULL DEFAULT 'none',
  PRIMARY KEY(user_id, chat_key)
);
