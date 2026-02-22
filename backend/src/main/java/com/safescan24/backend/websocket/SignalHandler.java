package com.safescan24.backend.websocket;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class SignalHandler extends TextWebSocketHandler {

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isOnline(String userId) {
        WebSocketSession s = sessions.get(userId);
        return s != null && s.isOpen();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String token = getToken(session);
        if (token != null && !token.equals("guest")) {
            sessions.put(token, session);
            session.getAttributes().put("userId", token);
            log.info("Owner connected: {}", token);
        } else {
            session.getAttributes().put("userId", "guest:" + session.getId());
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> msg = mapper.readValue(
                message.getPayload(),
                new TypeReference<Map<String, Object>>() {});
        String to = (String) msg.get("to");
        if (to == null) return;

        WebSocketSession target = sessions.get(to);
        if (target != null && target.isOpen()) {
            String from = (String) session.getAttributes().get("userId");
            msg.put("from", from);
            target.sendMessage(new TextMessage(mapper.writeValueAsString(msg)));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null && !userId.startsWith("guest:")) {
            sessions.remove(userId);
            log.info("Disconnected: {}", userId);
        }
    }

    private String getToken(WebSocketSession session) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("token=")) return param.substring(6);
        }
        return null;
    }
}