import json
import os
import hashlib
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    """Обновление профиля пользователя Eclipse"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    user_id = body.get("user_id")
    action = body.get("action")

    if not user_id:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет user_id"})}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == "get":
            cur.execute(
                f"SELECT id, name, handle, email, avatar, bio, banner FROM {SCHEMA}.users WHERE id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Пользователь не найден"})}
            user = {"id": row[0], "name": row[1], "handle": row[2], "email": row[3],
                    "avatar": row[4] or "", "bio": row[5] or "", "banner": row[6] or ""}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        elif action == "update":
            fields = []
            values = []

            if "name" in body:
                fields.append("name = %s")
                values.append(body["name"].strip())
            if "handle" in body:
                handle = body["handle"].strip().lstrip("@")
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE handle = %s AND id != %s", (handle, user_id))
                if cur.fetchone():
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Никнейм уже занят"})}
                fields.append("handle = %s")
                values.append(handle)
            if "email" in body:
                email = body["email"].strip().lower()
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s AND id != %s", (email, user_id))
                if cur.fetchone():
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Email уже занят"})}
                fields.append("email = %s")
                values.append(email)
            if "bio" in body:
                fields.append("bio = %s")
                values.append(body["bio"])
            if "avatar" in body:
                fields.append("avatar = %s")
                values.append(body["avatar"])
            if "banner" in body:
                fields.append("banner = %s")
                values.append(body["banner"])

            if not fields:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нечего обновлять"})}

            values.append(user_id)
            cur.execute(
                f"UPDATE {SCHEMA}.users SET {', '.join(fields)} WHERE id = %s RETURNING id, name, handle, email, avatar, bio, banner",
                values
            )
            row = cur.fetchone()
            conn.commit()
            user = {"id": row[0], "name": row[1], "handle": f"@{row[2]}", "email": row[3],
                    "avatar": row[4] or "", "bio": row[5] or "", "banner": row[6] or ""}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        elif action == "change_password":
            old_pw = hash_password(body.get("old_password", ""))
            new_pw = hash_password(body.get("new_password", ""))
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s AND password_hash = %s", (user_id, old_pw))
            if not cur.fetchone():
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный текущий пароль"})}
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_pw, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        else:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
