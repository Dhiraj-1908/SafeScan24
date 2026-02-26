package com.safescan24.backend.controller;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.safescan24.backend.entity.User;
import com.safescan24.backend.repository.QrSlugRepository;
import com.safescan24.backend.repository.UserRepository;
import com.safescan24.backend.service.JwtService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class FirebaseAuthController {

    private final UserRepository userRepo;
    private final QrSlugRepository slugRepo;
    private final JwtService jwtService;

    @PostConstruct
    public void initFirebase() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount =
                    getClass().getResourceAsStream("/firebase-service-account.json");
                FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
                FirebaseApp.initializeApp(options);
                log.info("Firebase Admin SDK initialized");
            }
        } catch (Exception e) {
            log.error("Failed to initialize Firebase Admin SDK: {}", e.getMessage());
        }
    }

    /**
     * POST /api/auth/firebase-verify
     * Body: { firebase_token, name?, slug? }
     *
     * Smart new/existing user detection — the tab the user picked doesn't matter.
     * Source of truth is always the DB (phone number).
     *
     * Cases:
     *   - Phone NOT in DB + name provided  → create new user, claim slug, return JWT
     *   - Phone NOT in DB + no name        → 409 NAME_REQUIRED (frontend switches to "New user" tab)
     *   - Phone IN DB                      → find existing user, claim slug, return JWT
     *                                         (name param ignored if user already has one)
     */
    @PostMapping("/firebase-verify")
    public ResponseEntity<?> firebaseVerify(@RequestBody Map<String, String> body) {
        String firebaseToken = body.get("firebase_token");
        String name          = body.get("name");
        String slug          = body.get("slug");

        if (firebaseToken == null || firebaseToken.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "firebase_token required"));

        // 1. Verify Firebase token
        FirebaseToken decoded;
        try {
            decoded = FirebaseAuth.getInstance().verifyIdToken(firebaseToken);
        } catch (Exception e) {
            log.warn("Firebase token verification failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid Firebase token"));
        }

        // 2. Extract phone
        Object phoneClaim = decoded.getClaims().get("phone_number");
        if (phoneClaim == null)
            return ResponseEntity.badRequest().body(Map.of("error", "No phone number in token"));

        final String phone = phoneClaim.toString();
        if (phone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "No phone number in token"));

        // 3. Smart find-or-create
        //    We check existence first so we can respond differently for new vs existing.
        Optional<User> existing = userRepo.findByPhone(phone);
        boolean isNewUser = existing.isEmpty();

        User user;

        if (isNewUser) {
            // New phone — name is required to register
            if (name == null || name.isBlank()) {
                log.info("New phone {} tried to claim without a name", phone);
                return ResponseEntity.status(409).body(Map.of(
                    "error",     "NAME_REQUIRED",
                    "message",   "Looks like you're new here — please enter your name to continue."
                ));
            }
            User u = new User();
            u.setPhone(phone);
            u.setName(name.trim());
            user = userRepo.save(u);
            log.info("Created new user {} for phone {}", user.getId(), phone);
        } else {
            user = existing.get();
            // If existing user has no name yet (edge case) and name was provided, update it
            if (name != null && !name.isBlank() && (user.getName() == null || user.getName().isBlank())) {
                user.setName(name.trim());
                userRepo.save(user);
            }
            log.info("Found existing user {} for phone {}", user.getId(), phone);
        }

        // 4. Claim slug if provided (safe — skips if already claimed)
        if (slug != null && !slug.isBlank()) {
            final User finalUser = user;
            slugRepo.findBySlug(slug).ifPresent(qr -> {
                if (!qr.isClaimed()) {
                    qr.setClaimed(true);
                    qr.setClaimedBy(finalUser.getId());
                    qr.setClaimedAt(LocalDateTime.now());
                    slugRepo.save(qr);
                    log.info("Slug {} claimed by user {}", slug, finalUser.getId());
                }
            });
        }

        // 5. Issue JWT
        String token = jwtService.generateToken(user.getId().toString());

        return ResponseEntity.ok(Map.of(
            "token",     token,
            "isNewUser", isNewUser,
            "user", Map.of(
                "id",    user.getId().toString(),
                "name",  user.getName() != null ? user.getName() : "",
                "phone", user.getPhone()
            )
        ));
    }
}