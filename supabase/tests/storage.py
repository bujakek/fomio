"""Storage and host-ownership regression test for the linked Supabase project.

    python3 supabase/tests/storage.py

Runs against whatever .env.local points at, and MUTATES that database: it
creates two throwaway users, an event for each, uploads objects, and removes
all of it in a finally block.

Two things here are easy to get wrong and worth keeping covered:

  * The bucket is public, so downloads bypass RLS. A select policy on
    storage.objects would therefore add nothing for viewing while enabling
    LIST, which walks every event id and photo id in the project.
  * Host checks must use a real signed-in JWT. service_role bypasses RLS, so
    a "host can do X" assertion made with the service key proves nothing.
"""

import base64, json, urllib.request, urllib.error, uuid, sys, datetime

env = {}
for line in open('/Users/laszlob/projects/fomio/.env.local'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"')

URL, ANON, SVC = (env['NEXT_PUBLIC_SUPABASE_URL'],
                  env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
                  env['SUPABASE_SERVICE_ROLE_KEY'])

# 1x1 JPEG
PIXEL = base64.b64decode(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof'
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB'
    'AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==')


def call(method, path, key, body=None, headers=None, raw_body=None, bearer=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header('apikey', key)
    req.add_header('Authorization', 'Bearer ' + (bearer or key))
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if raw_body is None and body is not None:
        req.add_header('Content-Type', 'application/json')
    data = raw_body if raw_body is not None else (
        json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, data, timeout=30) as r:
            payload = r.read()
            try: return r.status, json.loads(payload.decode())
            except Exception: return r.status, payload
    except urllib.error.HTTPError as e:
        payload = e.read().decode()
        try: return e.code, json.loads(payload)
        except Exception: return e.code, payload


results = []
def check(name, ok, detail=''):
    results.append(ok)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ''))


users, events = [], []
try:
    for n in range(2):
        pw = uuid.uuid4().hex
        st, u = call('POST', '/auth/v1/admin/users', SVC,
                     {'email': f'st-{uuid.uuid4().hex[:8]}@example.invalid',
                      'password': pw, 'email_confirm': True})
        assert st in (200, 201), (st, u)
        st, tok = call('POST', '/auth/v1/token?grant_type=password', ANON,
                       {'email': u['email'], 'password': pw})
        assert st == 200 and tok.get('access_token'), (st, tok)
        users.append({'id': u['id'], 'jwt': tok['access_token']})

        st, ev = call('POST', '/rest/v1/events', SVC,
                      {'slug': f'st-{uuid.uuid4().hex[:8]}', 'event_name': f'Storage {n}',
                       'owner_id': u['id']}, {'Prefer': 'return=representation'})
        assert st in (200, 201), (st, ev)
        events.append(ev[0]['id'])

    a, b = events
    host_a, host_b = users[0]['jwt'], users[1]['jwt']
    pid = str(uuid.uuid4())
    obj = f'{a}/{pid}.jpg'
    print(f"fixtures: 2 users, 2 events\n")

    print("guest upload:")
    st, r = call('POST', f'/storage/v1/object/event-photos/{obj}', ANON,
                 raw_body=PIXEL, headers={'Content-Type': 'image/jpeg'})
    check('anon uploads into an open event folder', st in (200, 201), f'{st} {str(r)[:70]}')

    st, r = call('POST', f'/storage/v1/object/event-photos/{a}/{pid}_thumb.jpg', ANON,
                 raw_body=PIXEL, headers={'Content-Type': 'image/jpeg'})
    check('thumb uploads alongside it', st in (200, 201), str(st))

    ghost = str(uuid.uuid4())
    st, r = call('POST', f'/storage/v1/object/event-photos/{ghost}/x.jpg', ANON,
                 raw_body=PIXEL, headers={'Content-Type': 'image/jpeg'})
    check('anon cannot invent an event folder', st >= 400, f'{st}')

    st, r = call('POST', f'/storage/v1/object/event-photos/notauuid/x.jpg', ANON,
                 raw_body=PIXEL, headers={'Content-Type': 'image/jpeg'})
    check('malformed folder is refused, not an error', st >= 400 and st < 500, f'{st}')

    st, r = call('POST', f'/storage/v1/object/event-photos/{a}/bad.txt', ANON,
                 raw_body=b'hello', headers={'Content-Type': 'text/plain'})
    check('bucket rejects non-jpeg', st >= 400, f'{st}')

    print("\npublic download vs listing:")
    st, r = call('GET', f'/storage/v1/object/public/event-photos/{obj}', ANON)
    check('public URL serves the file with no select policy', st == 200 and len(r) == len(PIXEL),
          f'{st} {len(r) if isinstance(r, bytes) else r}')

    st, r = call('POST', '/storage/v1/object/list/event-photos', ANON,
                 {'prefix': '', 'limit': 100})
    check('anon cannot list the bucket', r == [], f'{st} {str(r)[:70]}')
    st, r = call('POST', '/storage/v1/object/list/event-photos', ANON,
                 {'prefix': f'{a}/', 'limit': 100})
    check('anon cannot list a known event folder', r == [], f'{st} {str(r)[:70]}')

    print("\nguest cannot tamper:")
    st, r = call('DELETE', f'/storage/v1/object/event-photos/{obj}', ANON)
    st2, after = call('GET', f'/storage/v1/object/public/event-photos/{obj}', ANON)
    check('anon cannot delete an object', st2 == 200, f'delete={st}')

    st, r = call('PUT', f'/storage/v1/object/event-photos/{obj}', ANON,
                 raw_body=b'overwritten', headers={'Content-Type': 'image/jpeg'})
    st2, after = call('GET', f'/storage/v1/object/public/event-photos/{obj}', ANON)
    check('anon cannot overwrite an object', after == PIXEL, f'put={st}')

    print("\nhost ownership (real signed-in JWT, not service_role):")
    st, r = call('POST', '/storage/v1/object/list/event-photos', ANON,
                 {'prefix': f'{a}/', 'limit': 100}, bearer=host_a)
    check('host lists objects in their own event', isinstance(r, list) and len(r) == 2,
          f'{st} {len(r) if isinstance(r, list) else r}')

    st, r = call('POST', '/storage/v1/object/list/event-photos', ANON,
                 {'prefix': f'{a}/', 'limit': 100}, bearer=host_b)
    check('other host cannot list that folder', r == [], f'{st} {str(r)[:70]}')

    st, r = call('GET', f'/rest/v1/events?select=id&id=eq.{a}', ANON, bearer=host_a)
    check('host reads their own event row', isinstance(r, list) and len(r) == 1, str(r)[:60])
    st, r = call('GET', f'/rest/v1/events?select=id&id=eq.{a}', ANON, bearer=host_b)
    check('other host cannot read that event row', r == [], str(r)[:60])

    st, r = call('DELETE', f'/storage/v1/object/event-photos/{obj}', ANON, bearer=host_b)
    st2, after = call('GET', f'/storage/v1/object/public/event-photos/{obj}', ANON)
    check('other host cannot delete the object', st2 == 200, f'delete={st}')

    st, r = call('DELETE', f'/storage/v1/object/event-photos/{obj}', ANON, bearer=host_a)
    # Verified by listing, not by re-fetching the public URL: public objects are
    # served through a CDN, so a deleted file keeps answering 200 from cache for
    # a while. See the note in fomio-supabase about moderation and deletion.
    st2, listing = call('POST', '/storage/v1/object/list/event-photos', ANON,
                        {'prefix': f'{a}/', 'limit': 100}, bearer=host_a)
    check('owning host can delete the object',
          st in (200, 204) and isinstance(listing, list) and len(listing) == 1,
          f'delete={st} remaining={len(listing) if isinstance(listing, list) else listing}')

finally:
    print("\ncleanup:")
    for ev in events:
        # Removal is DELETE /object/{bucket} with a prefixes body. The
        # /object/remove/{bucket} form returns 400 and leaves every object
        # behind — which it silently did for several runs, quietly filling a
        # 1GB free tier with test fixtures.
        listed = call('POST', '/storage/v1/object/list/event-photos', SVC,
                      {'prefix': f'{ev}/', 'limit': 200})[1] or []
        paths = [f"{ev}/{o['name']}" for o in listed if isinstance(o, dict)]
        if paths:
            st, _ = call('DELETE', '/storage/v1/object/event-photos', SVC,
                         {'prefixes': paths})
            assert st == 200, f'storage cleanup failed: {st}'
        call('DELETE', f'/rest/v1/events?id=eq.{ev}', SVC)
    for u in users:
        call('DELETE', f"/auth/v1/admin/users/{u['id']}", SVC)
    print(f"  removed {len(events)} events, {len(users)} users")

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
