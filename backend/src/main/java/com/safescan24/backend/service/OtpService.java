package com.safescan24.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
//import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class OtpService {

    @Value("${app.exotel-account-sid}")
    private String accountSid;

    @Value("${app.exotel-api-key}")
    private String apiKey;

    @Value("${app.exotel-api-token}")
    private String apiToken;

    @Value("${app.exotel-phone}")
    private String fromPhone;

    // phone → OtpEntry (in-memory, resets on restart — fine for MVP)
    private final ConcurrentHashMap<String, OtpEntry> store = new ConcurrentHashMap<>();

    private static final long OTP_EXPIRY_MS = 10 * 60 * 1000L; // 10 minutes
    private static final int MAX_ATTEMPTS = 3;

    // ── Generate and send OTP ─────────────────────────────────────────────
    public boolean sendOtp(String phone, String type) {
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        store.put(phone, new OtpEntry(code, type, System.currentTimeMillis()));

        String message = switch (type) {
            case "REGISTRATION" -> "Your SafeScan24 verification code: " + code + ". Valid for 10 minutes.";
            case "CONTACT_VERIFY" -> "SafeScan24: Share this code with the item owner to be added as their emergency contact: " + code;
            default -> "Your SafeScan24 code: " + code;
        };

        return sendSms(phone, message);
    }

    // ── Verify OTP ────────────────────────────────────────────────────────
    public boolean verifyOtp(String phone, String code, String type) {
        OtpEntry entry = store.get(phone);
        if (entry == null) return false;
        if (!entry.type.equals(type)) return false;
        if (System.currentTimeMillis() - entry.createdAt > OTP_EXPIRY_MS) {
            store.remove(phone);
            return false;
        }
        entry.attempts++;
        if (entry.attempts > MAX_ATTEMPTS) {
            store.remove(phone);
            return false;
        }
        if (entry.code.equals(code)) {
            store.remove(phone);
            return true;
        }
        return false;
    }

    // ── Exotel SMS ────────────────────────────────────────────────────────
    private boolean sendSms(String to, String message) {
        try {
            String url = "https://api.exotel.com/v1/Accounts/" + accountSid + "/Sms/send";
            String body = "From=" + fromPhone
                    + "&To=" + to
                    + "&Body=" + java.net.URLEncoder.encode(message, "UTF-8");

            String auth = Base64.getEncoder().encodeToString(
                    (apiKey + ":" + apiToken).getBytes());

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());

            log.info("Exotel SMS to {} status: {}", to, response.statusCode());
            return response.statusCode() == 200 || response.statusCode() == 201;

        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", to, e.getMessage());
            // In dev: log OTP so you can test without real SMS
            log.warn("DEV FALLBACK — OTP for {}: {}", to, store.getOrDefault(to,
                    new OtpEntry("N/A", "N/A", 0)).code);
            return false;
        }
    }

    private static class OtpEntry {
        String code;
        String type;
        long createdAt;
        int attempts = 0;

        OtpEntry(String code, String type, long createdAt) {
            this.code = code;
            this.type = type;
            this.createdAt = createdAt;
        }
    }
}