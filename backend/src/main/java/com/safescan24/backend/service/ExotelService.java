package com.safescan24.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

@Service
@Slf4j
public class ExotelService {

    @Value("${app.exotel-sid}")
    private String sid;

    @Value("${app.exotel-api-key}")
    private String apiKey;

    @Value("${app.exotel-api-token}")
    private String apiToken;

    @Value("${app.exotel-phone}")
    private String exoPhone;

    /**
     * Initiates a call: Exotel calls scannerPhone first,
     * then bridges to contactPhone. Neither party sees the other's number.
     */
    public boolean initiateCall(String scannerPhone, String contactPhone) {
        try {
            // Exotel Connect API — calls From first, then bridges to To
            String url = "https://api.exotel.com/v1/Accounts/" + sid + "/Calls/connect.json";

            String formData = "From=" + encode(scannerPhone)
                    + "&To=" + encode(contactPhone)
                    + "&CallerId=" + encode(exoPhone)
                    + "&TimeLimit=600"       // 10 min max
                    + "&TimeOut=30";         // 30s ring timeout

            String credentials = Base64.getEncoder()
                    .encodeToString((apiKey + ":" + apiToken).getBytes());

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formData))
                    .build();

            HttpResponse<String> response = client.send(
                    request, HttpResponse.BodyHandlers.ofString());

            log.info("Exotel call {} → {} status: {} body: {}",
                    scannerPhone, contactPhone, response.statusCode(), response.body());

            return response.statusCode() == 200 || response.statusCode() == 201;

        } catch (Exception e) {
            log.error("Exotel call failed: {}", e.getMessage());
            return false;
        }
    }

    private String encode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }
}