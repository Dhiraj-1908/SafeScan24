package com.safescan24.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class OtpService {

    @Value("${app.fast2sms-api-key}")
    private String apiKey;

    private final ConcurrentHashMap<String, OtpEntry> store = new ConcurrentHashMap<>();

    private static final long OTP_EXPIRY_MS  = 10 * 60 * 1000L;
    private static final int  MAX_ATTEMPTS   = 3;

    // ── Send OTP ──────────────────────────────────────────────────────────
    public boolean sendOtp(String phone, String type) {
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        store.put(phone, new OtpEntry(code, type, System.currentTimeMillis()));

        String message = switch (type) {
            case "REGISTRATION"   -> "Your SafeScan verification code: " + code + ". Valid 10 mins.";
            case "CONTACT_VERIFY" -> "SafeScan: Share this code with the item owner to be added as emergency contact: " + code;
            default               -> "Your SafeScan code: " + code;
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

    // ── Fast2SMS ──────────────────────────────────────────────────────────
    private boolean sendSms(String phone, String message) {
        try {
            // Strip country code if present — Fast2SMS needs 10-digit Indian numbers
            String number = phone.replaceAll("\\+91", "").replaceAll("[^0-9]", "");

            String url = "https://www.fast2sms.com/dev/bulkV2"
                + "?authorization=" + apiKey
                + "&message=" + java.net.URLEncoder.encode(message, "UTF-8")
                + "&language=english"
                + "&route=q"
                + "&numbers=" + number;

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

            HttpResponse<String> response = client.send(
                request, HttpResponse.BodyHandlers.ofString());

            log.info("Fast2SMS to {} status: {} body: {}",
                number, response.statusCode(), response.body());

            return response.statusCode() == 200;

        } catch (Exception e) {
            log.error("Fast2SMS failed for {}: {}", phone, e.getMessage());
            // DEV fallback — log OTP so you can test without real SMS
            OtpEntry entry = store.get(phone);
            if (entry != null) log.warn("DEV OTP for {}: {}", phone, entry.code);
            return false;
        }
    }

    static class OtpEntry {
        String code;
        String type;
        long   createdAt;
        int    attempts = 0;

        OtpEntry(String code, String type, long createdAt) {
            this.code      = code;
            this.type      = type;
            this.createdAt = createdAt;
        }
    }
}