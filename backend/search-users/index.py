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
    """Поиск пользователей по имени или никнейму"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    q = (params.get("q") or "").strip().lower().lstrip("@")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if q:
            cur.execute(
                f"""SELECT id, name, handle, avatar, bio FROM {SCHEMA}.users
                    WHERE LOWER(name) LIKE %s OR LOWER(handle) LIKE %s
                    LIMIT 20""",
                (f"%{q}%", f"%{q}%")
            )
        else:
            cur.execute(
                f"SELECT id, name, handle, avatar, bio FROM {SCHEMA}.users LIMIT 20"
            )

        rows = cur.fetchall()
        users = [
            {"id": r[0], "name": r[1], "handle": f"@{r[2]}", "avatar": r[3] or "", "bio": r[4] or ""}
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users})}

    finally:
        cur.close()
        conn.close()
