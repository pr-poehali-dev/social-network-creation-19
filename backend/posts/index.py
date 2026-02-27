import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Лента постов Eclipse: получение, создание, лайки, комментарии"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            user_id = int(params.get("user_id", 0))

            cur.execute(f"""
                SELECT p.id, p.text, p.likes_count, p.created_at,
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
                placeholders = ",".join(["%s"] * len(post_ids))
                cur.execute(f"""
                    SELECT c.id, c.post_id, c.text, c.likes_count, c.created_at,
                           u.id, u.name, u.handle, u.avatar,
                           CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as liked
                    FROM {SCHEMA}.comments c
                    JOIN {SCHEMA}.users u ON u.id = c.user_id
                    LEFT JOIN {SCHEMA}.comment_likes cl ON cl.comment_id = c.id AND cl.user_id = %s
                    WHERE c.post_id IN ({placeholders})
                    ORDER BY c.created_at ASC
                """, [user_id] + post_ids)
                for row in cur.fetchall():
                    pid = row[1]
                    if pid not in comments_map:
                        comments_map[pid] = []
                    comments_map[pid].append({
                        "id": row[0], "text": row[2], "likes": row[3],
                        "author": row[6], "handle": f"@{row[7]}", "avatar": row[8] or "",
                        "user_id": row[5], "liked": row[9],
                    })

            def time_ago(dt):
                import datetime
                now = datetime.datetime.now(datetime.timezone.utc)
                diff = now - dt
                s = int(diff.total_seconds())
                if s < 60: return "только что"
                if s < 3600: return f"{s // 60} мин назад"
                if s < 86400: return f"{s // 3600} ч назад"
                return f"{s // 86400} дн назад"

            posts = []
            for r in posts_rows:
                initials = "".join(w[0] for w in r[5].split())[:2].upper()
                posts.append({
                    "id": r[0], "text": r[1], "likes": r[2],
                    "time": time_ago(r[3]),
                    "user_id": r[4], "author": r[5], "handle": f"@{r[6]}",
                    "avatar": r[7] or "", "initials": initials,
                    "liked": r[8],
                    "comments": comments_map.get(r[0], []),
                })

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"posts": posts})}

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "create":
            user_id = body["user_id"]
            text = body["text"].strip()
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пустой пост"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.posts (user_id, text) VALUES (%s, %s) RETURNING id, created_at",
                (user_id, text)
            )
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0]})}

        elif action == "like":
            user_id = body["user_id"]
            post_id = body["post_id"]
            cur.execute(f"SELECT 1 FROM {SCHEMA}.post_likes WHERE user_id=%s AND post_id=%s", (user_id, post_id))
            if cur.fetchone():
                cur.execute(f"DELETE FROM {SCHEMA}.post_likes WHERE user_id=%s AND post_id=%s", (user_id, post_id))
                cur.execute(f"UPDATE {SCHEMA}.posts SET likes_count = likes_count - 1 WHERE id=%s RETURNING likes_count", (post_id,))
                liked = False
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.post_likes (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
                cur.execute(f"UPDATE {SCHEMA}.posts SET likes_count = likes_count + 1 WHERE id=%s RETURNING likes_count", (post_id,))
                liked = True
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
            cur.execute(
                f"SELECT u.name, u.handle, u.avatar FROM {SCHEMA}.users u WHERE u.id=%s",
                (user_id,)
            )
            u = cur.fetchone()
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
                cur.execute(f"DELETE FROM {SCHEMA}.comment_likes WHERE user_id=%s AND comment_id=%s", (user_id, comment_id))
                cur.execute(f"UPDATE {SCHEMA}.comments SET likes_count = likes_count - 1 WHERE id=%s RETURNING likes_count", (comment_id,))
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
