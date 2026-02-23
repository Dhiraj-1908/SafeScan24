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
//import java.util.UUID;

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
     * 1. Verifies the Firebase ID token
     * 2. Extracts phone number
     * 3. Creates user if new, finds if existing
     * 4. Claims QR slug if provided
     * 5. Returns our JWT
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

// 3. Find or create user
User user = userRepo.findByPhone(phone).orElseGet(() -> {
    User u = new User();
    u.setPhone(phone);
    u.setName(name != null && !name.isBlank() ? name : "");
    return userRepo.save(u);
});

        // Update name if provided and currently blank
        if (name != null && !name.isBlank() && (user.getName() == null || user.getName().isBlank())) {
            user.setName(name);
            userRepo.save(user);
        }

        // 4. Claim slug if provided
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
            "token", token,
            "user", Map.of(
                "id",    user.getId().toString(),
                "name",  user.getName() != null ? user.getName() : "",
                "phone", user.getPhone()
            )
        ));
    }
}