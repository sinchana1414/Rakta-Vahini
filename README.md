# Rakta-Vahini (रक्त-वाहिनी)

Privacy-focused emergency blood donor network for rural India, built with Kotlin, MVVM, Firebase, Hilt, Material 3, Navigation, Coil, Coroutines/Flow, FCM, and Google Play Services location.

## Project setup

1. Open this folder in Android Studio Hedgehog or newer.
2. Install Android SDK 34 and JDK 17.
3. Create a Firebase project and add an Android app with package name `com.raktavahini`.
4. Download the real `google-services.json` from Firebase and replace `app/google-services.json`.
5. In Firebase Authentication, enable Email/Password and Google Sign-In.
6. For Google Sign-In, copy the Web client ID into `app/src/main/res/values/strings.xml` as `firebase_web_client_id`.
7. Enable Firestore, Firebase Storage, and Firebase Cloud Messaging.
8. Publish `firestore.rules` from this repository in Firebase Console → Firestore Database → Rules.
9. Add Storage rules that allow users to upload only their own profile photo path, for example `profile_photos/{uid}.jpg` when `request.auth.uid == uid`.
10. Build with `./gradlew :app:assembleDebug` after Android Studio creates or syncs the Gradle wrapper.

## Firestore collections

- `users/{uid}` stores donor profile, location, eligibility, ready toggle, FCM token, and donation stats.
- `donations/{donationId}` stores donation logs and updates `users/{uid}.lastDonationDate`, `totalDonations`, and `isEligible`.
- `blood_requests/{requestId}` stores emergency requests.
- `notification_queue/{requestId}` is written by the Android client after a request is posted. Use a Firebase Cloud Function to read this queue and send FCM to the included token list. Server credentials must never be embedded in the APK.

## Firebase Cloud Function sketch

Create a Firestore trigger on `notification_queue/{requestId}`. Read `tokens`, `bloodGroup`, `hospitalName`, and `location`; call Firebase Admin SDK `sendEachForMulticast`; then delete or mark the queue document processed.

## Privacy choices implemented

- Search queries only include eligible and ready donors: `bloodGroup == selected`, `isEligible == true`, `isReadyToDonate == true`.
- Results show partial names only, for example `Anita S.`.
- Phone numbers are not rendered in app UI; tapping Call opens `Intent.ACTION_DIAL` so the user confirms the call in the system dialer.
- Client-side Haversine filtering limits results by 10/20/50 km.
- Users can update their own ready toggle in real time and delete their Firebase account/profile.

## Notes

- The placeholder Firebase JSON lets the project structure sync, but a real Firebase config is required for auth, Firestore, Storage, Messaging, and Google Sign-In to run.
- Firestore composite indexes may be prompted by the console for donation history and open request ordering; create them from the links Firebase logs provide.
