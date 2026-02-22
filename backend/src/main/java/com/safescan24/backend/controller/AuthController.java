package com.safescan24.backend.controller;

//import com.safescan24.backend.entity.QrSlug;
import com.safescan24.backend.entity.User;
import com.safescan24.backend.repository.QrSlugRepository;
import com.safescan24.backend.repository.UserRepository;
import com.safescan24.backend.service.JwtService;
import com.safescan24.backend.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepo;
    private final QrSlugRepository slugRepo;
    private final JwtService jwtService;
    private final OtpService otpService;

    // STEP 1: Send OTP
    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Phone required"));
        otpService.sendOtp(phone, "REGISTRATION");
        return ResponseEntity.ok(Map.of("sent", true));
    }

    // STEP 2: Verify OTP + register new user
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String name  = body.get("name");
        String otp   = body.get("otp");

        if (!otpService.verifyOtp(phone, otp, "REGISTRATION"))
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired OTP"));

        if (userRepo.findByPhone(phone).isPresent())
            return ResponseEntity.badRequest().body(Map.of("error", "Phone already registered"));

        User user = new User();
        user.setPhone(phone);
        user.setName(name != null ? name : "");
        user = userRepo.save(user);

        String token = jwtService.generateToken(user.getId().toString());
        return ResponseEntity.ok(Map.of("token", token, "userId", user.getId()));
    }

    // Login STEP 1: Send OTP
    @PostMapping("/login/otp")
    public ResponseEntity<?> loginOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (userRepo.findByPhone(phone).isEmpty())
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        otpService.sendOtp(phone, "REGISTRATION");
        return ResponseEntity.ok(Map.of("sent", true));
    }

    // Login STEP 2: Verify OTP
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp   = body.get("otp");

        if (!otpService.verifyOtp(phone, otp, "REGISTRATION"))
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired OTP"));

        return userRepo.findByPhone(phone)
                .map(user -> {
                    String token = jwtService.generateToken(user.getId().toString());
                    return ResponseEntity.ok(Map.of("token", token, "userId", user.getId()));
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    // Claim a slug (requires JWT)
    @PostMapping("/claim")
    public ResponseEntity<?> claim(@RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String userId = (String) auth.getPrincipal();
        String slug   = body.get("slug");

        return slugRepo.findBySlug(slug)
                .map(qr -> {
                    if (qr.isClaimed())
                        return ResponseEntity.badRequest().body(Map.of("error", "Already claimed"));
                    qr.setClaimed(true);
                    qr.setClaimedBy(UUID.fromString(userId));
                    qr.setClaimedAt(LocalDateTime.now());
                    slugRepo.save(qr);
                    return ResponseEntity.ok(Map.of("claimed", true, "slug", slug));
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("error", "Invalid slug")));
    }
}