import json
import os
import base64
import boto3
import psycopg2
import datetime

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


def handler(event: dict, context) -> dict:
    """Личные сообщения Eclipse: чаты, сообщения, голосовые, группы"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            user_id = int(params.get("user_id", 0))
            action = params.get("action", "list")

            if action == "list":
                # Get all direct chats for user
                cur.execute(f"""
                    SELECT c.id,
                           CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END as partner_id,
                           u.name, u.handle, u.avatar,
                           cm.text, cm.msg_type, cm.created_at, cm.sender_id,
                           (SELECT COUNT(*) FROM {SCHEMA}.chat_messages WHERE chat_id=c.id AND is_read=FALSE AND sender_id != %s) as unread
                    FROM {SCHEMA}.chats c
                    JOIN {SCHEMA}.users u ON u.id = CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END
                    LEFT JOIN {SCHEMA}.chat_messages cm ON cm.id = (
                        SELECT id FROM {SCHEMA}.chat_messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1
                    )
                    WHERE c.user1_id = %s OR c.user2_id = %s
                    ORDER BY COALESCE(cm.created_at, c.created_at) DESC
                """, (user_id, user_id, user_id, user_id, user_id))

                chats = []
                for row in cur.fetchall():
                    last_text = ""
                    if row[5] is not None:
                        if row[6] == "voice":
                            last_text = "🎤 Голосовое"
                        elif row[6] == "image":
                            last_text = "🖼 Фото"
                        elif row[6] == "file":
                            last_text = "📎 Файл"
                        else:
                            last_text = row[5][:60]
                    chats.append({
                        "chat_id": row[0],
                        "partner_id": row[1],
                        "partner_name": row[2],
                        "partner_handle": f"@{row[3]}",
                        "partner_avatar": row[4] or "",
                        "last_msg": last_text,
                        "last_time": time_ago(row[7]) if row[7] else "",
                        "unread": int(row[9]),
                        "is_mine": row[8] == user_id if row[8] else False,
                    })

                # Get group chats
                cur.execute(f"""
                    SELECT gc.id, gc.name, gc.avatar,
                           gm.text, gm.msg_type, gm.created_at, gm.sender_id,
                           (SELECT COUNT(*) FROM {SCHEMA}.group_chat_members WHERE group_id=gc.id) as member_count
                    FROM {SCHEMA}.group_chats gc
                    JOIN {SCHEMA}.group_chat_members gcm ON gcm.group_id=gc.id AND gcm.user_id=%s
                    LEFT JOIN {SCHEMA}.group_messages gm ON gm.id = (
                        SELECT id FROM {SCHEMA}.group_messages WHERE group_id=gc.id ORDER BY created_at DESC LIMIT 1
                    )
                    ORDER BY COALESCE(gm.created_at, gc.created_at) DESC
                """, (user_id,))

                groups = []
                for row in cur.fetchall():
                    last_text = ""
                    if row[3] is not None:
                        if row[4] == "voice":
                            last_text = "🎤 Голосовое"
                        elif row[4] == "image":
                            last_text = "🖼 Фото"
                        else:
                            last_text = row[3][:60]
                    groups.append({
                        "group_id": row[0],
                        "name": row[1],
                        "avatar": row[2] or "",
                        "last_msg": last_text,
                        "last_time": time_ago(row[5]) if row[5] else "",
                        "member_count": int(row[7]),
                        "is_group": True,
                    })

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chats": chats, "groups": groups})}

            elif action == "history":
                chat_id = int(params.get("chat_id", 0))
                user_id_val = user_id
                cur.execute(f"""
                    SELECT id, sender_id, text, msg_type, file_url, file_name, duration, created_at, is_read
                    FROM {SCHEMA}.chat_messages
                    WHERE chat_id=%s
                    ORDER BY created_at ASC
                    LIMIT 100
                """, (chat_id,))
                msgs = []
                for row in cur.fetchall():
                    msgs.append({
                        "id": row[0],
                        "from_me": row[1] == user_id_val,
                        "sender_id": row[1],
                        "text": row[2],
                        "type": row[3],
                        "file_url": row[4],
                        "file_name": row[5],
                        "duration": row[6],
                        "time": row[7].strftime("%H:%M"),
                        "is_read": row[8],
                    })
                # Mark messages as read
                cur.execute(f"""
                    UPDATE {SCHEMA}.chat_messages SET is_read=TRUE
                    WHERE chat_id=%s AND sender_id != %s AND is_read=FALSE
                """, (chat_id, user_id_val))
                conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": msgs})}

            elif action == "group_history":
                group_id = int(params.get("group_id", 0))
                cur.execute(f"""
                    SELECT gm.id, gm.sender_id, u.name, u.avatar, gm.text, gm.msg_type, gm.file_url, gm.file_name, gm.duration, gm.created_at
                    FROM {SCHEMA}.group_messages gm
                    JOIN {SCHEMA}.users u ON u.id=gm.sender_id
                    WHERE gm.group_id=%s
                    ORDER BY gm.created_at ASC
                    LIMIT 100
                """, (group_id,))
                msgs = []
                for row in cur.fetchall():
                    msgs.append({
                        "id": row[0], "from_me": row[1] == user_id,
                        "sender_id": row[1], "sender_name": row[2],
                        "sender_avatar": row[3] or "", "text": row[4],
                        "type": row[5], "file_url": row[6], "file_name": row[7],
                        "duration": row[8], "time": row[9].strftime("%H:%M"),
                    })
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": msgs})}

            # ── Social GET actions ─────────────────────────────────────────────
            elif action == "notifications":
                cur.execute(f"""
                    SELECT n.id, n.type, n.message, n.is_read, n.created_at,
                           u.id, u.name, u.handle, u.avatar, n.post_id
                    FROM {SCHEMA}.notifications n
                    LEFT JOIN {SCHEMA}.users u ON u.id = n.from_user_id
                    WHERE n.user_id = %s ORDER BY n.created_at DESC LIMIT 50
                """, (user_id,))
                notifs = [{"id": r[0], "type": r[1], "message": r[2], "is_read": r[3],
                           "time": time_ago(r[4]), "from_id": r[5], "from_name": r[6],
                           "from_handle": f"@{r[7]}" if r[7] else "",
                           "from_avatar": r[8] or "", "post_id": r[9]}
                          for r in cur.fetchall()]
                unread_count = sum(1 for n in notifs if not n["is_read"])
                cur.execute(f"""
                    SELECT COUNT(*) FROM {SCHEMA}.chat_messages cm
                    JOIN {SCHEMA}.chats c ON c.id = cm.chat_id
                    WHERE (c.user1_id=%s OR c.user2_id=%s) AND cm.sender_id != %s AND cm.is_read=FALSE
                """, (user_id, user_id, user_id))
                unread_msg_count = int(cur.fetchone()[0])
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "notifications": notifs, "unread_count": unread_count,
                    "unread_msg_count": unread_msg_count,
                })}

            elif action == "following":
                cur.execute(f"""
                    SELECT u.id, u.name, u.handle, u.avatar, u.bio
                    FROM {SCHEMA}.follows f JOIN {SCHEMA}.users u ON u.id = f.following_id
                    WHERE f.follower_id = %s ORDER BY f.created_at DESC
                """, (user_id,))
                users = [{"id": r[0], "name": r[1], "handle": f"@{r[2]}", "avatar": r[3] or "", "bio": r[4] or ""} for r in cur.fetchall()]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users})}

            elif action == "followers":
                cur.execute(f"""
                    SELECT u.id, u.name, u.handle, u.avatar, u.bio
                    FROM {SCHEMA}.follows f JOIN {SCHEMA}.users u ON u.id = f.follower_id
                    WHERE f.following_id = %s ORDER BY f.created_at DESC
                """, (user_id,))
                users = [{"id": r[0], "name": r[1], "handle": f"@{r[2]}", "avatar": r[3] or "", "bio": r[4] or ""} for r in cur.fetchall()]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users})}

            elif action == "counts":
                target_id = int(params.get("target_id", user_id))
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.follows WHERE follower_id=%s", (target_id,))
                following_count = int(cur.fetchone()[0])
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.follows WHERE following_id=%s", (target_id,))
                followers_count = int(cur.fetchone()[0])
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.posts WHERE user_id=%s", (target_id,))
                posts_count = int(cur.fetchone()[0])
                is_following = False
                if user_id and user_id != target_id:
                    cur.execute(f"SELECT 1 FROM {SCHEMA}.follows WHERE follower_id=%s AND following_id=%s", (user_id, target_id))
                    is_following = cur.fetchone() is not None
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "following_count": following_count, "followers_count": followers_count,
                    "posts_count": posts_count, "is_following": is_following,
                })}

            elif action == "liked_posts":
                cur.execute(f"""
                    SELECT p.id, p.text, p.likes_count, p.created_at, p.media_url, p.media_type,
                           u.id, u.name, u.handle, u.avatar
                    FROM {SCHEMA}.post_likes pl
                    JOIN {SCHEMA}.posts p ON p.id = pl.post_id
                    JOIN {SCHEMA}.users u ON u.id = p.user_id
                    WHERE pl.user_id = %s ORDER BY pl.post_id DESC LIMIT 50
                """, (user_id,))
                posts = [{"id": r[0], "text": r[1], "likes": r[2],
                          "media_url": r[4], "media_type": r[5],
                          "user_id": r[6], "author": r[7], "handle": f"@{r[8]}", "avatar": r[9] or ""}
                         for r in cur.fetchall()]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"posts": posts})}

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "get_or_create_chat":
            user1 = int(body["user_id"])
            user2 = int(body["partner_id"])
            lo, hi = min(user1, user2), max(user1, user2)
            cur.execute(f"SELECT id FROM {SCHEMA}.chats WHERE user1_id=%s AND user2_id=%s", (lo, hi))
            row = cur.fetchone()
            if row:
                chat_id = row[0]
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.chats (user1_id, user2_id) VALUES (%s, %s) RETURNING id", (lo, hi))
                chat_id = cur.fetchone()[0]
                conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"chat_id": chat_id})}

        elif action == "send":
            chat_id = int(body["chat_id"])
            sender_id = int(body["sender_id"])
            text = body.get("text", "")
            msg_type = body.get("type", "text")
            file_name = body.get("file_name")
            duration = body.get("duration")
            file_url = None

            if msg_type in ("image", "file", "voice") and body.get("file_data"):
                s3 = get_s3()
                raw = base64.b64decode(body["file_data"])
                key = f"chat/{chat_id}/{sender_id}_{datetime.datetime.now().timestamp()}"
                if file_name:
                    key += f"_{file_name}"
                content_type = body.get("content_type", "application/octet-stream")
                s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
                ak = os.environ["AWS_ACCESS_KEY_ID"]
                file_url = f"https://cdn.poehali.dev/projects/{ak}/bucket/{key}"

            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (chat_id, sender_id, text, msg_type, file_url, file_name, duration)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at
            """, (chat_id, sender_id, text, msg_type, file_url, file_name, duration))
            row = cur.fetchone()
            conn.commit()

            # Create notification for recipient
            cur2 = conn.cursor()
            cur2.execute(f"SELECT user1_id, user2_id FROM {SCHEMA}.chats WHERE id=%s", (chat_id,))
            chat = cur2.fetchone()
            if chat:
                recipient = chat[1] if chat[0] == sender_id else chat[0]
                cur2.execute(f"""
                    INSERT INTO {SCHEMA}.notifications (user_id, from_user_id, type, message)
                    VALUES (%s, %s, 'message', %s)
                """, (recipient, sender_id, text[:100] if text else "Медиа сообщение"))
                conn.commit()
            cur2.close()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": row[0],
                "time": row[1].strftime("%H:%M"),
                "file_url": file_url,
            })}

        elif action == "send_group":
            group_id = int(body["group_id"])
            sender_id = int(body["sender_id"])
            text = body.get("text", "")
            msg_type = body.get("type", "text")
            file_name = body.get("file_name")
            duration = body.get("duration")
            file_url = None

            if msg_type in ("image", "file", "voice") and body.get("file_data"):
                s3 = get_s3()
                raw = base64.b64decode(body["file_data"])
                key = f"group/{group_id}/{sender_id}_{datetime.datetime.now().timestamp()}"
                content_type = body.get("content_type", "application/octet-stream")
                s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
                ak = os.environ["AWS_ACCESS_KEY_ID"]
                file_url = f"https://cdn.poehali.dev/projects/{ak}/bucket/{key}"

            cur.execute(f"""
                INSERT INTO {SCHEMA}.group_messages (group_id, sender_id, text, msg_type, file_url, file_name, duration)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at
            """, (group_id, sender_id, text, msg_type, file_url, file_name, duration))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": row[0],
                "time": row[1].strftime("%H:%M"),
                "file_url": file_url,
            })}

        elif action == "mark_read":
            chat_id = int(body["chat_id"])
            user_id = int(body["user_id"])
            cur.execute(f"""
                UPDATE {SCHEMA}.chat_messages SET is_read=TRUE
                WHERE chat_id=%s AND sender_id != %s AND is_read=FALSE
            """, (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        elif action == "delete_chat":
            chat_id = int(body["chat_id"])
            user_id = int(body["user_id"])
            cur.execute(f"SELECT user1_id, user2_id FROM {SCHEMA}.chats WHERE id=%s", (chat_id,))
            row = cur.fetchone()
            if not row or user_id not in (row[0], row[1]):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
            cur.execute(f"UPDATE {SCHEMA}.chat_messages SET text='' WHERE chat_id=%s AND sender_id=%s", (chat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        elif action == "create_group":
            creator_id = int(body["creator_id"])
            name = body["name"].strip()
            member_ids = body.get("member_ids", [])
            cur.execute(f"INSERT INTO {SCHEMA}.group_chats (name, creator_id) VALUES (%s, %s) RETURNING id", (name, creator_id))
            group_id = cur.fetchone()[0]
            all_members = list(set([creator_id] + [int(m) for m in member_ids]))
            for mid in all_members:
                cur.execute(f"INSERT INTO {SCHEMA}.group_chat_members (group_id, user_id) VALUES (%s, %s)", (group_id, mid))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"group_id": group_id})}

        elif action == "save_wallpaper":
            user_id = int(body["user_id"])
            chat_key = body["chat_key"]
            wallpaper = body["wallpaper"]
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_wallpapers (user_id, chat_key, wallpaper)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, chat_key) DO UPDATE SET wallpaper=EXCLUDED.wallpaper
            """, (user_id, chat_key, wallpaper))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        elif action == "get_wallpaper":
            user_id = int(body["user_id"])
            chat_key = body["chat_key"]
            cur.execute(f"SELECT wallpaper FROM {SCHEMA}.chat_wallpapers WHERE user_id=%s AND chat_key=%s", (user_id, chat_key))
            row = cur.fetchone()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"wallpaper": row[0] if row else "none"})}

        # ── Social actions (follows + notifications) ──────────────────────────
        elif action == "toggle_follow":
            follower_id = int(body["follower_id"])
            following_id = int(body["following_id"])
            cur.execute(f"SELECT 1 FROM {SCHEMA}.follows WHERE follower_id=%s AND following_id=%s", (follower_id, following_id))
            if cur.fetchone():
                cur.execute(f"DELETE FROM {SCHEMA}.follows WHERE follower_id=%s AND following_id=%s", (follower_id, following_id))
                followed = False
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.follows (follower_id, following_id) VALUES (%s, %s)", (follower_id, following_id))
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.notifications (user_id, from_user_id, type, message)
                    VALUES (%s, %s, 'follow', 'подписался на вас')
                """, (following_id, follower_id))
                followed = True
            conn.commit()
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.follows WHERE following_id=%s", (following_id,))
            followers_count = int(cur.fetchone()[0])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"followed": followed, "followers_count": followers_count})}

        elif action == "mark_notifications_read":
            user_id = int(body["user_id"])
            notif_id = body.get("notif_id")
            if notif_id:
                cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE id=%s AND user_id=%s", (notif_id, user_id))
            else:
                cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read=TRUE WHERE user_id=%s", (user_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()