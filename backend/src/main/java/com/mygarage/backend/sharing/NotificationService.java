package com.mygarage.backend.sharing;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import jakarta.servlet.http.HttpSessionIdListener;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class NotificationService {
    public record Change(Set<String> recipients, String action, Long rentalId) {}
    public record InventoryChange() {}
    public record VehicleChange(String email) {}
    private record Subscription(String email, String sessionId, SseEmitter emitter) {}
    private final Set<Subscription> subscriptions=ConcurrentHashMap.newKeySet();

    SseEmitter newEmitter() { return new SseEmitter(55_000L); }
    private void completeSafely(SseEmitter emitter) {
        try { emitter.complete(); }
        catch (IllegalStateException ignored) { /* Disconnected servlet contexts are already closed. */ }
    }

    public SseEmitter subscribe(String email, HttpSession session) {
        var emitter=newEmitter();
        var subscription=new Subscription(email, session.getId(), emitter);
        subscriptions.add(subscription);
        Runnable remove=() -> subscriptions.remove(subscription);
        emitter.onCompletion(remove);
        emitter.onTimeout(() -> { remove.run(); completeSafely(emitter); });
        emitter.onError(error -> remove.run());
        try { emitter.send(SseEmitter.event().name("ready").data("connected")); }
        catch (IOException | IllegalStateException error) { remove.run(); completeSafely(emitter); }
        return emitter;
    }

    // Events are hints, emitted only after the DB transaction commits. REST is authoritative.
    @TransactionalEventListener
    public void publish(Change event) {
        send("change", new Payload(event.action(), event.rentalId()), event.recipients());
    }
    @TransactionalEventListener
    public void publishInventory(InventoryChange event) {
        // Public inventory invalidation only: never include a rental, owner or plate.
        send("inventory", java.util.Map.of("action", "AVAILABLE_VEHICLES_CHANGED"), null);
    }
    @TransactionalEventListener
    public void publishVehicle(VehicleChange event) {
        send("vehicles", java.util.Map.of("action", "VEHICLES_CHANGED"), Set.of(event.email()));
    }
    private void send(String name, Object payload, Set<String> recipients) {
        String eventId=UUID.randomUUID().toString();
        for (var subscription : subscriptions) {
            if (recipients != null && !recipients.contains(subscription.email())) continue;
            try { subscription.emitter().send(SseEmitter.event().id(eventId).name(name).data(payload)); }
            catch (IOException | IllegalStateException error) {
                subscriptions.remove(subscription); completeSafely(subscription.emitter());
            }
        }
    }
    public record Payload(String action, Long rentalId) {}
    public void closeSession(String sessionId) {
        for (var subscription : subscriptions) if (subscription.sessionId().equals(sessionId)) {
            subscriptions.remove(subscription); completeSafely(subscription.emitter());
        }
    }
    @Configuration
    static class SessionCleanup {
        @Bean ServletListenerRegistrationBean<SessionListener> sharingSessionListener(NotificationService service) {
            return new ServletListenerRegistrationBean<>(new SessionListener(service));
        }
    }
    static class SessionListener implements HttpSessionListener, HttpSessionIdListener {
        private final NotificationService service;
        SessionListener(NotificationService service) { this.service=service; }
        @Override public void sessionDestroyed(HttpSessionEvent event) { service.closeSession(event.getSession().getId()); }
        @Override public void sessionIdChanged(HttpSessionEvent event, String oldSessionId) { service.closeSession(oldSessionId); }
    }
}
