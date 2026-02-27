import json
import os
import base64
import boto3
import psycopg2
import datetime
import re

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def time_ago(dt):
    now = datetime.datetime.now(datetime.timezone.utc)
    diff = now - dt
    s = int(diff.total_seconds())
    if s < 60:
        return "только что"
    if s < 3600:
        return f"{s // 60} мин назад"
    if s < 86400:
        return f"{s // 3600} ч назад"
    return f"{s // 86400} дн назад"


def extract_hashtags(text):
    return [tag.lower() for tag in re.findall(r'#(\w+)', text)]


def handler(event: dict, context) -> dict:
    """Лента постов Eclipse: получение, создание, лайки, комментарии, удаление, медиа, хештеги"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            user_id = int(params.get("user_id", 0))
            action = params.get("action", "feed")

            if action == "feed":
                cur.execute(f"""
                    SELECT p.id, p.text, p.likes_count, p.created_at, p.media_url, p.media_type,
                           u.id, u.name, u.handle, u.avatar,
                           CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as liked
                    FROM {SCHEMA}.posts p
                    JOIN {SCHEMA}.users u ON u.id = p.user_id
                    LEFT JOIN {SCHEMA}.post_likes pl ON pl.post_id = p.id AND pl.user_id = %s
                    ORDER BY p.created_at DESC
                    LIMIT 50
                """, (user_id,))
                posts_rows = cur.fetchall()

                post_ids = [r[0] for r in posts_rows]
                comments_map = {}

                if post_ids:
                    placeholders = ",".join([str(pid) for pid in post_ids])
                    cur.execute(f"""
                        SELECT c.id, c.post_id, c.text, c.likes_count, c.created_at,
                               u.id, u.name, u.handle, u.avatar,
                               CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as liked
                        FROM {SCHEMA}.comments c
                        JOIN {SCHEMA}.users u ON u.id = c.user_id
                        LEFT JOIN {SCHEMA}.comment_likes cl ON cl.comment_id = c.id AND cl.user_id = {user_id}
                        WHERE c.post_id IN ({placeholders})
                        ORDER BY c.created_at ASC
                    """)
                    for row in cur.fetchall():
                        pid = row[1]
                        if pid not in comments_map:
                            comments_map[pid] = []
                        comments_map[pid].append({
                            "id": row[0], "text": row[2], "likes": row[3],
                            "author": row[6], "handle": f"@{row[7]}", "avatar": row[8] or "",
                            "user_id": row[5], "liked": row[9],
                        })

                posts = []
                for r in posts_rows:
                    initials = "".join(w[0] for w in r[7].split())[:2].upper()
                    posts.append({
                        "id": r[0], "text": r[1], "likes": r[2],
                        "time": time_ago(r[3]),
                        "media_url": r[4], "media_type": r[5],
                        "user_id": r[6], "author": r[7], "handle": f"@{r[8]}",
                        "avatar": r[9] or "", "initials": initials,
                        "liked": r[10],
                        "comments": comments_map.get(r[0], []),
                    })

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"posts": posts})}

            elif action == "user_posts":
                target_id = int(params.get("target_id", user_id))
                cur.execute(f"""
                    SELECT p.id, p.text, p.likes_count, p.created_at, p.media_url, p.media_type,
                           u.id, u.name, u.handle, u.avatar,
                           CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as liked
                    FROM {SCHEMA}.posts p
                    JOIN {SCHEMA}.users u ON u.id = p.user_id
                    LEFT JOIN {SCHEMA}.post_likes pl ON pl.post_id = p.id AND pl.user_id = {user_id}
                    WHERE p.user_id = %s
                    ORDER BY p.created_at DESC
                    LIMIT 50
                """, (target_id,))
                posts = []
                for r in cur.fetchall():
                    posts.append({
                        "id": r[0], "text": r[1], "likes": r[2],
                        "time": time_ago(r[3]),
                        "media_url": r[4], "media_type": r[5],
                        "user_id": r[6], "author": r[7], "handle": f"@{r[8]}",
                        "avatar": r[9] or "", "liked": r[10], "comments": [],
                    })
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"posts": posts})}

            elif action == "hashtag":
                tag = params.get("tag", "").lower().lstrip("#")
                cur.execute(f"""
                    SELECT p.id, p.text, p.likes_count, p.created_at, p.media_url, p.media_type,
                           u.id, u.name, u.handle, u.avatar,
                           CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as liked
                    FROM {SCHEMA}.posts p
                    JOIN {SCHEMA}.users u ON u.id = p.user_id
                    JOIN {SCHEMA}.post_hashtags ph ON ph.post_id = p.id
                    JOIN {SCHEMA}.hashtags h ON h.id = ph.hashtag_id
                    LEFT JOIN {SCHEMA}.post_likes pl ON pl.post_id = p.id AND pl.user_id = {user_id}
                    WHERE h.tag = %s
                    ORDER BY p.created_at DESC
                    LIMIT 50
                """, (tag,))
                posts = []
                for r in cur.fetchall():
                    posts.append({
                        "id": r[0], "text": r[1], "likes": r[2],
                        "time": time_ago(r[3]),
                        "media_url": r[4], "media_type": r[5],
                        "user_id": r[6], "author": r[7], "handle": f"@{r[8]}",
                        "avatar": r[9] or "", "liked": r[10], "comments": [],
                    })
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"posts": posts, "tag": tag})}

            elif action == "trending":
                cur.execute(f"SELECT tag, count FROM {SCHEMA}.hashtags ORDER BY count DESC LIMIT 10")
                tags = [{"tag": r[0], "count": r[1]} for r in cur.fetchall()]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"tags": tags})}

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "create":
            user_id = body["user_id"]
            text = body["text"].strip()
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пустой пост"})}

            media_url = None
            media_type = None

            if body.get("media_data") and body.get("media_type"):
                s3 = get_s3()
                raw = base64.b64decode(body["media_data"])
                media_type = body["media_type"]
                ext = "jpg" if "image" in media_type else "mp4"
                key = f"posts/{user_id}/{datetime.datetime.now().timestamp()}.{ext}"
                s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=media_type)
                ak = os.environ["AWS_ACCESS_KEY_ID"]
                media_url = f"https://cdn.poehali.dev/projects/{ak}/bucket/{key}"

            cur.execute(
                f"INSERT INTO {SCHEMA}.posts (user_id, text, media_url, media_type) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                (user_id, text, media_url, media_type.split("/")[0] if media_type else None)
            )
            row = cur.fetchone()
            post_id = row[0]
            conn.commit()

            # Process hashtags
            tags = extract_hashtags(text)
            for tag in tags:
                cur.execute(f"SELECT id FROM {SCHEMA}.hashtags WHERE tag=%s", (tag,))
                h = cur.fetchone()
                if h:
                    cur.execute(f"UPDATE {SCHEMA}.hashtags SET count=count+1 WHERE id=%s", (h[0],))
                    hashtag_id = h[0]
                else:
                    cur.execute(f"INSERT INTO {SCHEMA}.hashtags (tag, count) VALUES (%s, 1) RETURNING id", (tag,))
                    hashtag_id = cur.fetchone()[0]
                cur.execute(f"INSERT INTO {SCHEMA}.post_hashtags (post_id, hashtag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (post_id, hashtag_id))
            if tags:
                conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": post_id, "media_url": media_url})}

        elif action == "delete":
            user_id = body["user_id"]
            post_id = body["post_id"]
            cur.execute(f"SELECT user_id FROM {SCHEMA}.posts WHERE id=%s", (post_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
            # Decrease hashtag counts
            cur.execute(f"""
                UPDATE {SCHEMA}.hashtags h SET count = GREATEST(0, count-1)
                FROM {SCHEMA}.post_hashtags ph WHERE ph.hashtag_id=h.id AND ph.post_id=%s
            """, (post_id,))
            cur.execute(f"UPDATE {SCHEMA}.posts SET text='[удалено]', media_url=NULL WHERE id=%s", (post_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        elif action == "like":
            user_id = body["user_id"]
            post_id = body["post_id"]
            cur.execute(f"SELECT 1 FROM {SCHEMA}.post_likes WHERE user_id=%s AND post_id=%s", (user_id, post_id))
            if cur.fetchone():
                cur.execute(f"UPDATE {SCHEMA}.post_likes SET user_id=%s WHERE user_id=%s AND post_id=%s", (user_id, user_id, post_id))
                cur.execute(f"DELETE FROM {SCHEMA}.post_likes WHERE user_id=%s AND post_id=%s", (user_id, post_id))
                cur.execute(f"UPDATE {SCHEMA}.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id=%s RETURNING likes_count", (post_id,))
                liked = False
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.post_likes (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
                cur.execute(f"UPDATE {SCHEMA}.posts SET likes_count = likes_count + 1 WHERE id=%s RETURNING likes_count", (post_id,))
                liked = True
                # Notify post author
                cur.execute(f"SELECT user_id FROM {SCHEMA}.posts WHERE id=%s", (post_id,))
                author = cur.fetchone()
                if author and author[0] != user_id:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.notifications (user_id, from_user_id, type, post_id, message)
                        VALUES (%s, %s, 'like', %s, 'лайкнул ваш пост')
                    """, (author[0], user_id, post_id))
            likes = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"liked": liked, "likes": likes})}

        elif action == "comment":
            user_id = body["user_id"]
            post_id = body["post_id"]
            text = body["text"].strip()
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пустой комментарий"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.comments (post_id, user_id, text) VALUES (%s, %s, %s) RETURNING id",
                (post_id, user_id, text)
            )
            comment_id = cur.fetchone()[0]
            cur.execute(f"SELECT u.name, u.handle, u.avatar FROM {SCHEMA}.users u WHERE u.id=%s", (user_id,))
            u = cur.fetchone()
            # Notify post author
            cur.execute(f"SELECT user_id FROM {SCHEMA}.posts WHERE id=%s", (post_id,))
            author = cur.fetchone()
            if author and author[0] != user_id:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.notifications (user_id, from_user_id, type, post_id, message)
                    VALUES (%s, %s, 'comment', %s, %s)
                """, (author[0], user_id, post_id, text[:100]))
            conn.commit()
            comment = {
                "id": comment_id, "text": text, "likes": 0, "liked": False,
                "author": u[0], "handle": f"@{u[1]}", "avatar": u[2] or "",
                "user_id": user_id,
            }
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"comment": comment})}

        elif action == "like_comment":
            user_id = body["user_id"]
            comment_id = body["comment_id"]
            cur.execute(f"SELECT 1 FROM {SCHEMA}.comment_likes WHERE user_id=%s AND comment_id=%s", (user_id, comment_id))
            if cur.fetchone():
                cur.execute(f"UPDATE {SCHEMA}.comment_likes SET user_id=%s WHERE user_id=%s AND comment_id=%s", (user_id, user_id, comment_id))
                cur.execute(f"DELETE FROM {SCHEMA}.comment_likes WHERE user_id=%s AND comment_id=%s", (user_id, comment_id))
                cur.execute(f"UPDATE {SCHEMA}.comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id=%s RETURNING likes_count", (comment_id,))
                liked = False
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.comment_likes (user_id, comment_id) VALUES (%s, %s)", (user_id, comment_id))
                cur.execute(f"UPDATE {SCHEMA}.comments SET likes_count = likes_count + 1 WHERE id=%s RETURNING likes_count", (comment_id,))
                liked = True
            likes = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"liked": liked, "likes": likes})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
