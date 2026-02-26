package com.safescan24.backend.controller;

import com.safescan24.backend.service.OtpService;
import com.safescan24.backend.service.OtpService.SendResult;
import com.safescan24.backend.service.OtpService.VerifyResult;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PhoneOtpController {

    private final OtpService otpService;

    /** POST /api/auth/otp/send  { phone: "+91XXXXXXXXXX" } */
    @PostMapping("/otp/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body,
                                     HttpServletRequest request) {
        String phone = body.get("phone");
        if (phone == null || phone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Phone is required"));

        String ip = getClientIp(request);

        SendResult result = otpService.sendOtp(phone, "REGISTRATION", ip);

        return switch (result) {
            case SUCCESS            -> ResponseEntity.ok(Map.of("sent", true));
            case PHONE_RATE_LIMITED -> ResponseEntity.status(429)
                .body(Map.of("error", "Too many OTP requests. Try again in an hour."));
            case IP_BLOCKED         -> ResponseEntity.status(429)
                .body(Map.of("error", "Too many requests from your network. Try again later."));
            case PROVIDER_ERROR     -> ResponseEntity.status(503)
                .body(Map.of("error", "Failed to send OTP. Please try again."));
        };
    }

    /** POST /api/auth/otp/verify  { phone, otp } — only used internally now */
    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp   = body.get("otp");

        if (phone == null || otp == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and OTP required"));

        VerifyResult result = otpService.verifyOtp(phone, otp, "REGISTRATION");

        return switch (result) {
            case SUCCESS      -> ResponseEntity.ok(Map.of("verified", true, "phone", phone));
            case WRONG_CODE   -> ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP."));
            case EXPIRED      -> ResponseEntity.badRequest().body(Map.of("error", "OTP expired. Please request a new one."));
            case MAX_ATTEMPTS -> ResponseEntity.status(429).body(Map.of("error", "Too many wrong attempts. Request a new OTP."));
            case NOT_FOUND    -> ResponseEntity.badRequest().body(Map.of("error", "No OTP found. Please request a new one."));
        };
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}