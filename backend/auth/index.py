import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def generate_handle(name: str) -> str:
    base = name.lower().replace(" ", "").replace("-", "")[:12]
    suffix = secrets.token_hex(3)
    return f"{base}{suffix}"


def handler(event: dict, context) -> dict:
    """Регистрация и вход пользователей Eclipse"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == "register":
            name = body["name"].strip()
            email = body["email"].strip().lower()
            password = body["password"]

            cur.execute(
                f"SELECT id FROM {SCHEMA}.users WHERE email = %s",
                (email,)
            )
            if cur.fetchone():
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Email уже занят"})}

            handle = generate_handle(name)
            pw_hash = hash_password(password)
            token = secrets.token_hex(32)

            cur.execute(
                f"INSERT INTO {SCHEMA}.users (name, handle, email, password_hash) VALUES (%s, %s, %s, %s) RETURNING id, name, handle, avatar",
                (name, handle, email, pw_hash)
            )
            row = cur.fetchone()
            conn.commit()

            user = {"id": row[0], "name": row[1], "handle": f"@{row[2]}", "avatar": row[3] or "", "token": token}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        elif action == "login":
            email = body["email"].strip().lower()
            password = body["password"]
            pw_hash = hash_password(password)

            cur.execute(
                f"SELECT id, name, handle, avatar FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s",
                (email, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}

            token = secrets.token_hex(32)
            user = {"id": row[0], "name": row[1], "handle": f"@{row[2]}", "avatar": row[3] or "", "token": token}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        else:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    finally:
        cur.close()
        conn.close()
