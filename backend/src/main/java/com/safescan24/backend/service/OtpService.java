package com.safescan24.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OtpService — powered by Fast2SMS OTP route
 *
 * API: POST https://www.fast2sms.com/dev/bulkV2
 * Headers: authorization: <api_key>
 * Body (form): route=otp&variables_values=<6digit>&numbers=<10digit>
 *
 * No DLT registration needed.
 * Message delivered as: "Your OTP: 123456"
 * Cost: ~₹0.35/SMS from wallet balance.
 *
 * We generate OTP ourselves (SecureRandom) → send via Fast2SMS → verify locally.
 */
@Service
@Slf4j
public class OtpService {

    @Value("${app.fast2sms-api-key}")
    private String apiKey;

    // ── Stores ────────────────────────────────────────────────────────────
    private final ConcurrentHashMap<String, SessionEntry> sessionStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, RateEntry>    phoneRate    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, RateEntry>    ipRate       = new ConcurrentHashMap<>();

    // ── Constants ─────────────────────────────────────────────────────────
    private static final long SESSION_EXPIRY_MS = 5  * 60 * 1000L; // 5 min
    private static final long RATE_WINDOW_MS    = 60 * 60 * 1000L; // 1 hour
    private static final int  MAX_OTP_REQUESTS  = 15;
    private static final int  MAX_ATTEMPTS      = 12;
    private static final int  MAX_IP_REQUESTS   = 15;

    private final SecureRandom random = new SecureRandom();
    private final HttpClient   http   = HttpClient.newHttpClient();

    // ── Send OTP ─────────────────────────────────────────────────────────
    public SendResult sendOtp(String phone, String type, String ip) {

        // 1. IP rate check (skip for internal/owner actions)
        if (!"internal".equals(ip) && !checkRate(ipRate, ip, MAX_IP_REQUESTS)) {
            log.warn("IP {} rate limited", ip);
            return SendResult.IP_BLOCKED;
        }

        // 2. Phone rate check
        if (!checkRate(phoneRate, phone, MAX_OTP_REQUESTS)) {
            log.warn("Phone {} rate limited", phone);
            return SendResult.PHONE_RATE_LIMITED;
        }

        // 3. Generate 6-digit OTP
        String otp = String.format("%06d", random.nextInt(1_000_000));

        // 4. Send via Fast2SMS
        boolean sent = sendViaFast2Sms(phone, otp);
        if (!sent) {
            log.error("Fast2SMS failed to send OTP to {}", phone);
            return SendResult.PROVIDER_ERROR;
        }

        // 5. Store OTP locally for verification
        sessionStore.put(phone, new SessionEntry(otp, type, System.currentTimeMillis()));
        log.info("OTP sent to {} via Fast2SMS", phone);
        return SendResult.SUCCESS;
    }

    // ── Verify OTP ────────────────────────────────────────────────────────
    public VerifyResult verifyOtp(String phone, String otp, String type) {
        SessionEntry entry = sessionStore.get(phone);

        if (entry == null)
            return VerifyResult.NOT_FOUND;

        if (!entry.type.equals(type))
            return VerifyResult.NOT_FOUND;

        if (System.currentTimeMillis() - entry.createdAt > SESSION_EXPIRY_MS) {
            sessionStore.remove(phone);
            return VerifyResult.EXPIRED;
        }

        entry.attempts++;
        if (entry.attempts > MAX_ATTEMPTS) {
            sessionStore.remove(phone);
            return VerifyResult.MAX_ATTEMPTS;
        }

        // Local verification — no extra API call needed
        if (entry.otp.equals(otp.trim())) {
            sessionStore.remove(phone);
            return VerifyResult.SUCCESS;
        }

        return VerifyResult.WRONG_CODE;
    }

    // ── Fast2SMS Send ─────────────────────────────────────────────────────
    // POST https://www.fast2sms.com/dev/bulkV2
    // Content-Type: application/x-www-form-urlencoded
    // Header: authorization: <apiKey>
    // Body: route=otp&variables_values=<otp>&numbers=<10digit>
    private boolean sendViaFast2Sms(String phone, String otp) {
        try {
            String mobile = normalizeToTenDigit(phone);

            String formBody = "route=q"
        + "&message=Your+SafeScan24+OTP+is+" + otp + ".+Valid+for+5+minutes."
        + "&language=english"
        + "&flash=0"
        + "&numbers=" + mobile;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.fast2sms.com/dev/bulkV2"))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .header("authorization", apiKey)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("Cache-Control", "no-cache")
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Fast2SMS response for {}: status={} body={}",
                     mobile, response.statusCode(), response.body());

            // Success: {"return":true,"request_id":"...","message":["Message sent successfully"]}
            return response.statusCode() == 200
                && response.body().contains("\"return\":true");

        } catch (Exception e) {
            log.error("Fast2SMS exception: {}", e.getMessage());
            return false;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    /** Fast2SMS needs 10-digit number without country code */
    private String normalizeToTenDigit(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("91") && digits.length() == 12) return digits.substring(2);
        if (digits.length() == 10) return digits;
        throw new IllegalArgumentException("Invalid phone number: " + phone);
    }

    private boolean checkRate(ConcurrentHashMap<String, RateEntry> map,
                              String key, int maxRequests) {
        long now = System.currentTimeMillis();
        RateEntry entry = map.compute(key, (k, v) -> {
            if (v == null || now - v.windowStart > RATE_WINDOW_MS)
                return new RateEntry(now, 1);
            v.count++;
            return v;
        });
        return entry.count <= maxRequests;
    }

    // ── Inner classes ─────────────────────────────────────────────────────
    static class SessionEntry {
        String otp;
        String type;
        long   createdAt;
        int    attempts = 0;

        SessionEntry(String otp, String type, long createdAt) {
            this.otp       = otp;
            this.type      = type;
            this.createdAt = createdAt;
        }
    }

    static class RateEntry {
        long windowStart;
        int  count;

        RateEntry(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count       = count;
        }
    }

    public enum SendResult {
        SUCCESS, IP_BLOCKED, PHONE_RATE_LIMITED, PROVIDER_ERROR
    }

    public enum VerifyResult {
        SUCCESS, NOT_FOUND, EXPIRED, WRONG_CODE, MAX_ATTEMPTS
    }
}