"""Access-model regression test for the linked Supabase project.

    python3 supabase/tests/rls.py

Runs against whatever .env.local points at, and MUTATES that database: it
creates a throwaway auth user and event, exercises the policies against them,
and deletes both in a finally block.

Guests have no gate, so these policies are the only thing protecting an album.
Re-run this after touching any migration under supabase/migrations/.

Note the update/delete assertions check the row's state afterwards rather than
the HTTP status. RLS makes an unauthorised UPDATE or DELETE match zero rows and
return 204 — a status-only assertion would report a wide-open table as secure.
"""

import json, urllib.request, urllib.error, uuid, sys, datetime

env = {}
for line in open('/Users/laszlob/projects/fomio/.env.local'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"')

URL  = env['NEXT_PUBLIC_SUPABASE_URL']
ANON = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
SVC  = env['SUPABASE_SERVICE_ROLE_KEY']

def call(method, path, key, body=None, headers=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header('apikey', key)
    req.add_header('Authorization', 'Bearer ' + key)
    req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, raw

results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ''))

user_id = event_id = None
slug = 'rls-test-' + uuid.uuid4().hex[:8]
email = f'rls-test-{uuid.uuid4().hex[:8]}@example.invalid'

try:
    # --- fixtures via service_role -----------------------------------------
    st, u = call('POST', '/auth/v1/admin/users', SVC,
                 {'email': email, 'password': uuid.uuid4().hex, 'email_confirm': True})
    assert st in (200, 201), (st, u)
    user_id = u['id']

    st, ev = call('POST', '/rest/v1/events', SVC,
                  {'slug': slug, 'event_name': 'RLS Test', 'owner_id': user_id},
                  {'Prefer': 'return=representation'})
    assert st in (200, 201), (st, ev)
    event_id = ev[0]['id']
    print(f"fixtures: user + event {slug}\n")

    # --- the leak we are preventing ----------------------------------------
    print("enumeration:")
    st, r = call('GET', '/rest/v1/events?select=slug', ANON)
    check('anon cannot list events', r == [], f'{st} {str(r)[:60]}')
    st, r = call('GET', '/rest/v1/photos?select=id', ANON)
    check('anon cannot list photos', r == [], f'{st} {str(r)[:60]}')

    # --- reads that should work, given the slug ----------------------------
    print("\nguest reads via RPC:")
    st, r = call('POST', '/rest/v1/rpc/event_by_slug', ANON, {'p_slug': slug})
    check('event_by_slug returns the event', st == 200 and len(r) == 1 and r[0]['slug'] == slug, str(st))
    check('event_by_slug hides owner_id', bool(r) and 'owner_id' not in r[0],
          ','.join(r[0].keys()) if r else '')
    st, r = call('POST', '/rest/v1/rpc/event_by_slug', ANON, {'p_slug': 'no-such-event-xyz'})
    check('unknown slug returns nothing', r == [], str(r)[:40])

    # --- guest upload -------------------------------------------------------
    print("\nguest writes:")
    pid = str(uuid.uuid4())
    st, r = call('POST', '/rest/v1/photos', ANON,
                 {'id': pid, 'event_id': event_id,
                  'storage_path': f'{event_id}/{pid}.jpg',
                  'thumb_path': f'{event_id}/{pid}_thumb.jpg',
                  'width': 4096, 'height': 3072, 'byte_size': 1800000,
                  'mime_type': 'image/jpeg'})
    check('anon can insert a photo into an open event', st in (200, 201), f'{st} {str(r)[:80]}')

    st, r = call('POST', '/rest/v1/events', ANON,
                 {'slug': 'pwn', 'event_name': 'pwn', 'owner_id': user_id})
    check('anon cannot create an event', st >= 400 and r.get('code') == '42501', str(r)[:60])

    st, r = call('PATCH', f'/rest/v1/photos?id=eq.{pid}', ANON, {'uploader_name': 'hacked'})
    st2, after = call('GET', f'/rest/v1/photos?id=eq.{pid}&select=uploader_name', SVC)
    check('anon cannot update a photo', after and after[0]['uploader_name'] is None, f'patch={st}')

    st, r = call('DELETE', f'/rest/v1/photos?id=eq.{pid}', ANON)
    st2, after = call('GET', f'/rest/v1/photos?id=eq.{pid}&select=id', SVC)
    check('anon cannot delete a photo', len(after) == 1, f'delete={st}')

    # --- hidden photos are invisible ---------------------------------------
    print("\nmoderation:")
    call('PATCH', f'/rest/v1/photos?id=eq.{pid}', SVC,
         {'hidden_at': datetime.datetime.now(datetime.timezone.utc).isoformat()})
    st, r = call('POST', '/rest/v1/rpc/event_photos', ANON, {'p_event_id': event_id})
    check('hidden photo is excluded from event_photos', r == [], str(r)[:60])
    call('PATCH', f'/rest/v1/photos?id=eq.{pid}', SVC, {'hidden_at': None})
    st, r = call('POST', '/rest/v1/rpc/event_photos', ANON, {'p_event_id': event_id})
    check('unhidden photo reappears', len(r) == 1, str(len(r)))

    # --- the upload window is a database rule, not a UI suggestion ----------
    print("\nupload window:")
    past = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat()
    call('PATCH', f'/rest/v1/events?id=eq.{event_id}', SVC, {'uploads_close_at': past})
    pid2 = str(uuid.uuid4())
    st, r = call('POST', '/rest/v1/photos', ANON,
                 {'id': pid2, 'event_id': event_id,
                  'storage_path': f'{event_id}/{pid2}.jpg',
                  'thumb_path': f'{event_id}/{pid2}_thumb.jpg'})
    check('anon insert refused once uploads closed', st >= 400 and r.get('code') == '42501', f'{st}')
    st, r = call('POST', '/rest/v1/rpc/event_photos', ANON, {'p_event_id': event_id})
    check('gallery still readable after close', len(r) == 1, str(len(r)))

    # --- private gallery: upload yes, view no -------------------------------
    print("\nprivate gallery:")
    call('PATCH', f'/rest/v1/events?id=eq.{event_id}', SVC, {'uploads_close_at': None})
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    call('PATCH', f'/rest/v1/events?id=eq.{event_id}', SVC, {'gallery_hidden_at': now})

    st, r = call('POST', '/rest/v1/rpc/event_by_slug', ANON, {'p_slug': slug})
    check('event_by_slug reports gallery_private', bool(r) and r[0]['gallery_private'] is True, str(r)[:60])
    st, r = call('POST', '/rest/v1/rpc/event_photos', ANON, {'p_event_id': event_id})
    check('guests cannot view photos while private', r == [], str(r)[:60])

    pid3 = str(uuid.uuid4())
    st, r = call('POST', '/rest/v1/photos', ANON,
                 {'id': pid3, 'event_id': event_id,
                  'storage_path': f'{event_id}/{pid3}.jpg',
                  'thumb_path': f'{event_id}/{pid3}_thumb.jpg'})
    check('guests can still upload while private', st in (200, 201), f'{st} {str(r)[:60]}')

    st, r = call('GET', f'/rest/v1/photos?event_id=eq.{event_id}&select=id', SVC)
    check('host still sees photos while private', len(r) == 2, f'{len(r)} rows')

    call('PATCH', f'/rest/v1/events?id=eq.{event_id}', SVC, {'gallery_hidden_at': None})
    st, r = call('POST', '/rest/v1/rpc/event_photos', ANON, {'p_event_id': event_id})
    check('undo restores the gallery', len(r) == 2, f'{len(r)} rows')
    st, r = call('POST', '/rest/v1/rpc/event_by_slug', ANON, {'p_slug': slug})
    check('gallery_private back to false', bool(r) and r[0]['gallery_private'] is False, str(r)[:60])

finally:
    print("\ncleanup:")
    if event_id:
        st, _ = call('DELETE', f'/rest/v1/events?id=eq.{event_id}', SVC)
        print(f"  event deleted ({st})")
    if user_id:
        st, _ = call('DELETE', f'/auth/v1/admin/users/{user_id}', SVC)
        print(f"  user deleted ({st})")

failed = [r for r in results if not r[0]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
