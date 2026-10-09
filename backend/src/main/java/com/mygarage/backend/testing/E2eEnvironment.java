package com.mygarage.backend.testing;

import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.InitializingBean;

/** Actual PostgreSQL identity, not a configured URL or a client-provided flag. */
@Component
@Profile("e2e")
public class E2eEnvironment implements InitializingBean {
    private final JdbcTemplate jdbc;
    public E2eEnvironment(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public Map<String,Object> identity() {
        return jdbc.queryForMap("select current_database() as database, current_user as username, (select rolsuper from pg_roles where rolname=current_user) as superuser");
    }
    public void assertIsolated() {
        var identity=identity();
        if (!"mygarage_e2e".equals(identity.get("database")) || !"mygarage_e2e".equals(identity.get("username")) || !Boolean.FALSE.equals(identity.get("superuser")))
            throw new IllegalStateException("E2E must use mygarage_e2e database and its non-superuser role. Development DB is forbidden.");
    }
    @Override public void afterPropertiesSet() { assertIsolated(); }
}
