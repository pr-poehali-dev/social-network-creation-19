CREATE TABLE t_p97916089_social_network_creat.posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p97916089_social_network_creat.users(id),
  text TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p97916089_social_network_creat.post_likes (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE t_p97916089_social_network_creat.comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES t_p97916089_social_network_creat.posts(id),
  user_id INTEGER NOT NULL REFERENCES t_p97916089_social_network_creat.users(id),
  text TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p97916089_social_network_creat.comment_likes (
  user_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, comment_id)
);