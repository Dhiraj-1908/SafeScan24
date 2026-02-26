package com.safescan24.backend.controller;

import com.safescan24.backend.entity.User;
import com.safescan24.backend.repository.QrSlugRepository;
import com.safescan24.backend.repository.UserRepository;
import com.safescan24.backend.service.JwtService;
import com.safescan24.backend.service.OtpService;
import com.safescan24.backend.service.OtpService.VerifyResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class FirebaseAuthController {

    private final UserRepository   userRepo;
    private final QrSlugRepository slugRepo;
    private final JwtService       jwtService;
    private final OtpService       otpService;

    /**
     * POST /api/auth/firebase-verify
     * Body: { phone, otp, name?, slug? }
     *
     * Kept same endpoint name so frontend api.ts doesn't need to change.
     * Verifies OTP instead of Firebase token — everything else stays same.
     */
    @PostMapping("/firebase-verify")
    public ResponseEntity<?> firebaseVerify(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp   = body.get("otp");
        String name  = body.get("name");
        String slug  = body.get("slug");

        if (phone == null || phone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "phone required"));
        if (otp == null || otp.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "otp required"));

        // 1. Verify OTP
        VerifyResult otpResult = otpService.verifyOtp(phone, otp, "REGISTRATION");
        return switch (otpResult) {
            case WRONG_CODE   -> ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP."));
            case EXPIRED      -> ResponseEntity.badRequest().body(Map.of("error", "OTP expired. Please request a new one."));
            case MAX_ATTEMPTS -> ResponseEntity.status(429).body(Map.of("error", "Too many wrong attempts. Request a new OTP."));
            case NOT_FOUND    -> ResponseEntity.badRequest().body(Map.of("error", "No OTP found. Please request a new one."));
            case SUCCESS      -> handleVerifiedPhone(phone, name, slug);
        };
    }

    private ResponseEntity<?> handleVerifiedPhone(String phone, String name, String slug) {
        Optional<User> existing = userRepo.findByPhone(phone);
        boolean isNewUser = existing.isEmpty();
        User user;

        if (isNewUser) {
            if (name == null || name.isBlank()) {
                return ResponseEntity.status(409).body(Map.of(
                    "error",   "NAME_REQUIRED",
                    "message", "Please enter your name to continue."
                ));
            }
            User u = new User();
            u.setPhone(phone);
            u.setName(name.trim());
            user = userRepo.save(u);
            log.info("Created new user {} for phone {}", user.getId(), phone);
        } else {
            user = existing.get();
            if (name != null && !name.isBlank() &&
                (user.getName() == null || user.getName().isBlank())) {
                user.setName(name.trim());
                userRepo.save(user);
            }
            log.info("Found existing user {} for phone {}", user.getId(), phone);
        }

        // Claim slug if provided
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