# SOS Broadcast to Nearby Users

When a user triggers SOS, every other user **within 500 m** gets an instant push
notification — even if their app is closed. Tapping it opens a detail page with the
victim's name, live distance, a **Call** button, and **Directions** (Google Maps).

Android only for now (iOS push needs a paid Apple Developer account).

---

## 1. High-level flow

```
VICTIM device                 BACKEND (Render + MongoDB)             NEARBY user device(s)
─────────────                 ──────────────────────────             ─────────────────────
SOS fires (voice codeword                                            
 or button)                                                          
  │                                                                  
  │  POST /api/sos/broadcast                                         
  │  { latitude, longitude, triggerType } ──►  find users ≤500 m     
  │                                            (Haversine on latest  
  │                                             stored locations)    
  │                                            → collect their push  
  │                                              tokens (all devices)
  │                                            → save SosBroadcast   
  │                                              doc (who was sent)  
  │                                            → Expo Push API ──────►  🔔 "Someone needs
  │                                                                       help — 320 m away"
  │                                                                       (shown by the OS,
  │                                                                        app can be closed)
  │                                                                  
  │                                                                  user taps notification
  │                                                                       │
  │                                            GET /api/sos/:id  ◄────────┤ app opens
  │                                            (victim name, phone,       │ /sos-alert/[id]
  │                                             coords, time)  ───────────► name • distance •
  │                                                                         Call • Directions
```

**Why it works when the app is closed:** the push is received by **Google Play
Services** (an always-running OS component), *not* by our app. Play Services draws
the notification from the system tray with zero of our code running. Our app only
runs when the user *taps* the notification.

---

## 2. Multi-device behavior (important)

**Each device stores its own push token; a user keeps a *list* of tokens.**

- On login, every device calls `POST /api/push/token`. The backend does
  `$addToSet` into `User.expoPushTokens` (an array), so:
  - Same user on **phone A + phone B** → **both tokens stored** → **both phones ring**
    on a nearby SOS.
  - A device re-registering the same token → **no duplicate** (set semantics).
- On **logout**, the device calls `POST /api/push/token/remove` (`$pull`), so a
  logged-out device stops receiving that user's alerts. (Useful on shared phones.)
- **Dead tokens self-heal:** if Expo reports `DeviceNotRegistered` for a token
  (app uninstalled / token rotated), the backend `$pull`s it automatically on the
  next broadcast.
- The victim never notifies **themselves** — the nearby query excludes the caller,
  so the victim's own other devices don't ring.

**Recipient tracking:** every broadcast writes a `SosBroadcast` document holding one
`recipients[]` entry **per device notified** (userId, name, mobile, distance, the
token, delivery `status`, Expo `ticketId`, and `sentAt`). So you have a full audit
of *who* (and which device) was alerted for each SOS.

---

## 3. Data model (MongoDB)

**`User`** — added field:
```ts
expoPushTokens: string[]   // one Expo push token per logged-in device, deduped
```

**`SosBroadcast`** (new collection):
```ts
{
  victimUserId: ObjectId(ref User),
  victimName:   string,
  victimMobile: string,
  triggerType:  "VOICE" | "BUTTON",
  location:     { latitude: number, longitude: number },
  radius:       number,            // 500 (meters)
  recipients: [{
    userId:   ObjectId(ref User),
    name:     string,
    mobile:   string,
    distance: number,              // meters from victim
    expoPushToken: string,         // the specific device notified
    status:   "SENT" | "FAILED",
    ticketId: string,              // Expo push ticket id
    error:    string,              // set when FAILED
    sentAt:   Date,
  }],
  notifiedCount: number,           // count of SENT
  createdAt, updatedAt,
}
```

---

## 4. API endpoints (all require `Authorization: Bearer <token>`)

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/push/token` | `{ expoPushToken }` | Register this device's token (add-to-set) |
| POST | `/api/push/token/remove` | `{ expoPushToken }` | Deregister on logout |
| POST | `/api/sos/broadcast` | `{ latitude, longitude, triggerType }` | Notify everyone ≤500 m; returns `{ broadcastId, notifiedCount, totalNearby }` |
| GET | `/api/sos/:id` | — | Victim detail for the alert page |

Radius is fixed at **500 m** server-side. Nearby users are found by reusing the
existing `LocationService.getNearbyUsers()` (Haversine over each user's latest stored
location — no geospatial index needed).

---

## 5. Client pieces

| File | Role |
|---|---|
| `services/pushNotificationService.ts` | Request permission, create the `sos-alerts` Android channel, fetch the Expo token, POST it to the backend. Fully error-guarded (safe if FCM not yet configured). |
| `api/sosApi.ts` | `registerPushToken`, `broadcastSos`, `getSosBroadcast`. |
| `app/_layout.tsx` | Registers the token once after login; routes `sos_alert` notification taps (warm **and** cold-start) to `/sos-alert/[id]`. |
| `app/sos-alert/[id].tsx` | The alert detail page (name, distance, Call, Directions). |
| `services/sosOrchestrator.ts` | `triggerGlobalSos()` fires `broadcastSos()` alongside the existing SMS + audio recording. |

---

## 6. What YOU must set up

### A. Firebase Cloud Messaging (required — free, ~5 min)
Android push is impossible without this. **Spark (free) plan, no billing.**
1. https://console.firebase.google.com → **Add project** (name it Raksha).
2. Add an **Android app** with package **`com.raksha.app`**.
3. Download **`google-services.json`**.
4. Give it to me (or drop it in `client/`) — I wire it into `app.json`
   (`android.googleServicesFile`) and the native build, then rebuild the APK.
   - Until this is done, `getExpoPushTokenAsync()` returns null → no tokens stored
     → broadcasts reach 0 people. The app still runs fine otherwise.

### B. Backend redeploy (Render)
The new routes + `expo-server-sdk` must ship:
1. Commit + push `Server/` changes.
2. Render will `npm install` (picks up `expo-server-sdk`) and restart.
3. No new env vars needed. Expo Push is keyless from the server side (it just POSTs
   to `exp.host`). FCM credentials live on the Expo side via the app's
   `google-services.json`, not the server.

### C. Nothing else
No Firestore, no paid services, no Google Cloud billing. Google Maps key (already
wired) is unrelated to push.

---

## 7. Testing (2 real Android phones)
1. Both: install the FCM-enabled APK, log in as **different** users, grant notification
   permission, allow location, keep them **within 500 m** (or spoof close coords).
2. Let both send a location update (open the app once so the backend has their coords).
3. On phone A, trigger SOS (button or codeword).
4. Phone B should get a notification within seconds — even with its app swiped away.
   Tap → alert page with A's name, distance, Call, Directions.
5. Verify in MongoDB: a new `sosbroadcasts` doc with B in `recipients` and
   `status: "SENT"`.

**Multi-device check:** log the same user into a 2nd phone, trigger a nearby SOS →
both of that user's phones should ring.

---

## 8. Limitations / notes
- **OEM battery killers** (Xiaomi/Oppo/Vivo) can delay/drop FCM if the app is
  force-stopped or battery-restricted — same issue the app's battery-optimization
  prompt already addresses. High-priority pushes usually still land.
- Needs **Google Play Services** + network on the device (absent on some China ROMs).
- **Privacy:** this broadcasts a user's name, phone, and location to *any* nearby
  user (per your spec: "everyone nearby"). Consider restricting to verified/trusted
  users later if abuse is a concern.
- iOS: not supported yet (needs Apple Developer account + APNs).
